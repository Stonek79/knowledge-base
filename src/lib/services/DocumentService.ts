import { z } from 'zod';

import { GOTENBERG_URL } from '@/constants/app';
import { SearchEngine } from '@/constants/document';
import { USER_ROLES } from '@/constants/user';
import { DocumentProcessor } from '@/core/documents/DocumentProcessor';
import { GotenbergAdapter } from '@/core/documents/GotenbergAdapter';
import { ApiError } from '@/lib/api';
import { indexingQueue } from '@/lib/queues/indexing';
import { DocumentRepository } from '@/lib/repositories/documentRepository';
import { documentListSchema } from '@/lib/schemas/document';
import { uploadFormSchema } from '@/lib/schemas/document';
import { SearchFactory } from '@/lib/search/factory';
import { getFileStorageService } from '@/lib/services/FileStorageService';
import { settingsService } from '@/lib/services/SettingsService';
import {
    DocumentFilters,
    DocumentWithAuthor,
    UploadFormData,
    WhereDocumentInput,
} from '@/lib/types/document';
import { SupportedMime } from '@/lib/types/mime';
import { UserResponse } from '@/lib/types/user';
import { FileUtils } from '@/utils/files';
import { isSupportedMime, mimeMapper } from '@/utils/mime';

/**
 * DocumentService инкапсулирует бизнес-логику для работы с документами.
 */
export class DocumentService {
    /**
     * Создает новый документ на основе загруженных данных.
     * @param formData - Данные формы, содержащие файл и метаданные.
     * @param user - Пользователь, выполняющий действие.
     * @returns - Созданный объект документа.
     */
    public static async createDocument(formData: FormData, user: UserResponse) {
        let createdFileKey: string | null = null;
        let createdPdfKey: string | null = null;

        try {
            if (user.role === USER_ROLES.GUEST) {
                throw new ApiError('Forbidden', 403);
            }

            // Валидация и преобразование FormData в типизированный объект
            const rawData = Object.fromEntries(formData.entries());
            const validation = uploadFormSchema.safeParse(rawData);
            if (!validation.success) {
                throw new ApiError(
                    'Ошибка валидации данных',
                    400,
                    z.flattenError(validation.error).fieldErrors
                );
            }
            const data: UploadFormData = {
                ...validation.data,
                file: formData.get('file') as File, // Zod не может обработать File, добавляем вручную
            };

            const {
                file,
                authorId,
                title,
                description,
                categoryIds,
                keywords,
            } = data;

            if (
                !authorId ||
                (user.id !== authorId && user.role !== USER_ROLES.ADMIN)
            ) {
                throw new ApiError(
                    'Вы можете загружать документы только для себя',
                    403
                );
            }

            const [maxFileSize, allowedMimeTypes] = await Promise.all([
                settingsService.getMaxFileSize(),
                settingsService.getAllowedMimeTypes(),
            ]);

            if (!file || !(file instanceof File)) {
                throw new ApiError('Файл не найден', 400);
            }

            if (
                !allowedMimeTypes.includes(file.type) ||
                !isSupportedMime(file.type)
            ) {
                throw new ApiError('Unsupported file type', 415);
            }
            const mime: SupportedMime = file.type;

            const buffer = Buffer.from(await file.arrayBuffer());
            if (buffer.byteLength > maxFileSize) {
                throw new ApiError(
                    `Файл слишком большой. Макс. ${Math.round(
                        maxFileSize / (1024 * 1024)
                    )}MB`,
                    413
                );
            }

            const fileValidation = await FileUtils.validateFile(buffer, mime);
            if (!fileValidation.valid) {
                throw new ApiError(
                    fileValidation.error || 'Ошибка валидации данных',
                    400
                );
            }

            const hash = await FileUtils.generateFileHash(buffer);
            const existingDocument = await DocumentRepository.findUnique({
                where: { hash },
            });
            if (existingDocument) {
                throw new ApiError(
                    'Документ с таким содержимым уже существует',
                    409
                );
            }

            const gotenbergUrl = process.env.GOTENBERG_URL || GOTENBERG_URL;
            const adapter = new GotenbergAdapter(gotenbergUrl);
            const processor = new DocumentProcessor(adapter);
            const processed = await processor.processUpload(
                buffer,
                mime,
                file.name,
                {
                    enableOcr: true,
                }
            );

            const filePath =
                processed.storage?.originalKey ?? processed.original.path;
            createdFileKey = processed.storage?.originalKey ?? null;
            createdPdfKey = processed.storage?.pdfKey ?? null;

            const newDocument = await DocumentRepository.interactiveTransaction(
                async tx => {
                    const doc = await tx.document.create({
                        data: {
                            title,
                            description: description || '',
                            content: processed.extractedText || '',
                            filePath,
                            fileName: file.name,
                            fileSize: file.size,
                            hash,
                            mimeType: mime,
                            format: mimeMapper(mime),
                            keywords:
                                keywords?.split(',').filter(Boolean) || [],
                            isPublished: true,
                            authorId: authorId,
                            categories: {
                                create: categoryIds.map(
                                    (categoryId: string) => ({ categoryId })
                                ),
                            },
                        },
                        include: {
                            author: {
                                select: {
                                    id: true,
                                    username: true,
                                    role: true,
                                },
                            },
                            categories: { include: { category: true } },
                        },
                    });

                    if (processed.storage?.pdfKey) {
                        const conv = await tx.convertedDocument.create({
                            data: {
                                documentId: doc.id,
                                conversionType: 'PDF',
                                filePath: processed.storage.pdfKey,
                                fileSize: (
                                    await getFileStorageService().getFileInfo(
                                        processed.storage.pdfKey
                                    )
                                ).size,
                                originalFile: filePath,
                            },
                        });
                        await tx.document.update({
                            where: { id: doc.id },
                            data: { mainPdfId: conv.id },
                        });
                    }

                    return doc;
                }
            );

            await indexingQueue.add('index-document', {
                documentId: newDocument.id,
            });

            return newDocument;
        } catch (error) {
            // Rollback: удаляем загруженные файлы в случае ошибки
            if (createdPdfKey) {
                void getFileStorageService().deleteDocument(createdPdfKey);
            }
            if (createdFileKey) {
                void getFileStorageService().deleteDocument(createdFileKey);
            }
            throw error; // Пробрасываем ошибку дальше для обработки в API роуте
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
        const validation = documentListSchema.safeParse(params);
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
        } = validation.data;

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

    /**
     * Выполняет гибридный поиск документов (полнотекстовый + фильтрация в БД).
     * @param params - Параметры фильтрации, пагинации и поисковый запрос.
     * @param user - Текущий аутентифицированный пользователь.
     * @returns - Список найденных документов и метаданные пагинации.
     */
    public static async searchDocuments(
        params: DocumentFilters,
        user: UserResponse
    ) {
        const { q, page, limit, categoryIds, authorId, dateFrom, dateTo } =
            await params;

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
                const allDocuments = await DocumentRepository.findMany({
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
                }) as DocumentWithAuthor[];
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
}
