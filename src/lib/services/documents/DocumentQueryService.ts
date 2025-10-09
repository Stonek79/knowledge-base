import { z } from 'zod';

import { SearchEngine } from '@/constants/document';
import { USER_ROLES } from '@/constants/user';
import { ApiError } from '@/lib/api';
import { DocumentRepository } from '@/lib/repositories/documentRepository';
import { documentListSchema } from '@/lib/schemas/document';
import { SearchFactory } from '@/lib/search/factory';
import {
    DocumentFilters,
    DocumentWithAuthor,
    WhereDocumentInput,
} from '@/lib/types/document';
import { UserResponse } from '@/lib/types/user';

/**
 * DocumentQueryService инкапсулирует логику для чтения и поиска документов.
 */
export class DocumentQueryService {
    /**
     * Получает один документ по ID, проверяя права доступа.
     * Увеличивает счетчик просмотров.
     * @param id - ID документа.
     * @param user - Текущий пользователь.
     * @returns - Найденный документ или null.
     */
    public static async getDocumentById(id: string, user: UserResponse) {
        const document = await DocumentRepository.findUnique({
            where: { id },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        role: true,
                        enabled: true,
                    },
                },
                categories: {
                    include: {
                        category: {
                            select: { id: true, name: true, color: true },
                        },
                    },
                },
                attachments: {
                    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
                    select: {
                        id: true,
                        fileName: true,
                        fileSize: true,
                        mimeType: true,
                        filePath: true,
                        order: true,
                        createdAt: true,
                    },
                },
                confidentialAccessUsers: true,
                mainPdf: { select: { id: true, filePath: true } },
            },
        });

        if (!document) {
            throw new ApiError('Документ не найден', 404);
        }

        // Проверка доступа
        if (document.isConfidential) {
            const isAuthor = user.id === document.authorId;
            const isAdmin = user.role === USER_ROLES.ADMIN;
            const hasAccess = await DocumentRepository.hasConfidentialAccess(
                user.id,
                document.id
            );

            if (!isAuthor && !isAdmin && !hasAccess) {
                throw new ApiError(
                    'Доступ к конфиденциальному документу запрещен',
                    403
                );
            }
        }

        if (user.role === USER_ROLES.GUEST && !document.isPublished) {
            throw new ApiError('Доступ запрещен', 403);
        }

        // Увеличение счетчика просмотров (кроме админов)
        if (user.role !== USER_ROLES.ADMIN) {
            await DocumentRepository.update({
                where: { id },
                data: { viewCount: { increment: 1 } },
            });
        }

        return document;
    }

    /**
     * Выполняет гибридный поиск или фильтрацию документов.
     * @param params - Параметры фильтрации, пагинации и поисковый запрос.
     * @param user - Текущий аутентифицированный пользователь.
     * @returns - Список найденных документов и метаданные пагинации.
     */
    public static async searchDocuments(
        params: DocumentFilters,
        user: UserResponse
    ) {
        const {
            q,
            page,
            limit,
            categoryIds,
            authorId,
            dateFrom,
            dateTo,
            status,
        } = await params;

        // 1. Условия доступа и базовые фильтры
        const whereConditions = this.buildAccessConditions(user);
        if (authorId) {
            whereConditions.push({ authorId });
        }
        if (categoryIds) {
            whereConditions.push({
                categories: { some: { categoryId: { in: categoryIds } } },
            });
        }

        const baseWhere: WhereDocumentInput = { AND: whereConditions };

        // 2. Полнотекстовый поиск
        if (q && q.trim()) {
            // Поиск через FlexSearch + пагинация в БД
            const searchEngine =
                (process.env
                    .SEARCH_ENGINE as (typeof SearchEngine)[keyof typeof SearchEngine]) ||
                SearchEngine.FLEXSEARCH;
            const indexer = SearchFactory.createIndexer(searchEngine);

            // Проверяем и переиндексируем если нужно
            if (indexer.isEmpty()) {
                const allDocuments = (await DocumentRepository.findMany({
                    include: {
                        author: {
                            select: {
                                id: true,
                                username: true,
                                role: true,
                                confidentialAccess: true,
                            },
                        },
                        categories: { include: { category: true } },
                        confidentialAccessUsers: true,
                    },
                })) as DocumentWithAuthor[];
                await indexer.reindexAll(allDocuments);
            }

            // ✅ Передаем все доступные фильтры из запроса
            const searchFilters = {
                ...(categoryIds && { categoryIds }),
                ...(authorId && {
                    authorId: authorId,
                }),
                ...(dateFrom && {
                    dateFrom: new Date(dateFrom),
                }),
                ...(dateTo && {
                    dateTo: new Date(dateTo),
                }),
                ...(status && { status }),
            };

            // Получаем все релевантные документы из FlexSearch
            const searchResults = await indexer.search(q, searchFilters);

            if (searchResults.length === 0) {
                return {
                    documents: [],
                    pagination: {
                        page,
                        limit,
                        total: 0,
                        totalPages: 0,
                        hasNextPage: false,
                        hasPrevPage: false,
                    },
                };
            }

            // Получаем ID документов в порядке релевантности
            const documentIds = searchResults.map(result => result.id);

            // Пагинируем найденные документы в БД
            const documents = await DocumentRepository.findMany({
                where: {
                    ...baseWhere,
                    id: { in: documentIds },
                },
                include: {
                    author: {
                        select: { id: true, username: true, role: true },
                    },
                    categories: {
                        include: {
                            category: {
                                select: { id: true, name: true, color: true },
                            },
                        },
                    },
                },
            });

            // 3. Сливаем: { ...searchResult, ...document }
            const mergedDocuments = searchResults
                .map(searchResult => {
                    const fullDoc = documents.find(
                        d => d.id === searchResult.id
                    );
                    if (!fullDoc) return null;

                    return {
                        ...fullDoc, // Полные данные документа
                        relevance: searchResult.relevance, // Релевантность из поиска
                        highlights: searchResult.highlights, // Подсветки из поиска
                        isSearchResult: true, // Флаг что это поиск
                    };
                })
                .filter(Boolean);

            // 4. Сохраняем порядок релевантности + применяем пагинацию
            const paginatedResults = mergedDocuments.slice(
                (page - 1) * limit,
                page * limit
            );

            const total = mergedDocuments?.length;
            const totalPages = Math.ceil(total / limit);

            return {
                documents: paginatedResults,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1,
                },
            };
        } else {
            const result = this.getDocuments(params, user);
            return result;
        }
    }

    /**
     * Получает отфильтрованный и пагинированный список документов.
     * @param params - Параметры фильтрации и пагинации.
     * @param user - Текущий аутентифицированный пользователь.
     * @returns - Список документов и метаданные пагинации.
     */
    public static async getDocuments(
        params: DocumentFilters,
        user: UserResponse
    ) {
        const data = await params;
        const validation = documentListSchema.safeParse(data);
        if (!validation.success) {
            throw new ApiError(
                'Invalid parameters',
                400,
                z.flattenError(validation.error).fieldErrors
            );
        }

        const {
            page,
            limit,
            categoryIds,
            sortBy,
            sortOrder,
            authorId,
            dateFrom,
            dateTo,
            status,
        } = validation.data;

        console.log('[data]', validation.data);

        // 1. Формирование условий доступа
        const whereConditions: WhereDocumentInput[] =
            this.buildAccessConditions(user);

        // 2. Добавление фильтров из запроса
        if (authorId) {
            whereConditions.push({ authorId: authorId });
        }
        if (categoryIds) {
            whereConditions.push({
                categories: {
                    some: {
                        categoryId: { in: categoryIds },
                    },
                },
            });
        }

        if (status && status === 'deleted' && user.role === USER_ROLES.ADMIN) {
            whereConditions.push({ deletedAt: { not: null } });
        } else if (
            status &&
            status === 'active' &&
            user.role === USER_ROLES.ADMIN
        ) {
            whereConditions.push({ deletedAt: null });
        }

        const where: WhereDocumentInput = { AND: whereConditions };

        // 3. Получение данных из репозитория
        const [documents, total] = await Promise.all([
            DocumentRepository.findMany({
                where,
                include: {
                    author: {
                        select: { id: true, username: true, role: true },
                    },
                    categories: {
                        include: {
                            category: {
                                select: { id: true, name: true, color: true },
                            },
                        },
                    },
                },
                orderBy: { [sortBy]: sortOrder },
                take: limit,
                skip: (page - 1) * limit,
            }),
            DocumentRepository.count({ where }),
        ]);

        // 4. Формирование ответа
        const totalPages = Math.ceil(total / limit);
        return {
            documents,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        };
    }

    /**
     * Вспомогательный метод для построения условий доступа к документам.
     * @param user - Текущий пользователь.
     * @returns - Массив условий для Prisma.
     */
    private static buildAccessConditions(
        user: UserResponse
    ): WhereDocumentInput[] {
        const conditions: WhereDocumentInput[] = [{ isSecret: false }];

        if (user.role === USER_ROLES.GUEST) {
            conditions.push({ isPublished: true });
        }

        if (user.role !== USER_ROLES.ADMIN) {
            conditions.push({
                OR: [
                    { isConfidential: false },
                    { authorId: user.id },
                    { confidentialAccessUsers: { some: { userId: user.id } } },
                ],
            });
        }

        return conditions;
    }
}
