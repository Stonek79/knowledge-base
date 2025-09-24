import { NextRequest, NextResponse } from 'next/server';

import { GOTENBERG_URL } from '@/constants/app';
import { SearchEngine } from '@/constants/document';
import { USER_ROLES } from '@/constants/user';
import { DocumentProcessor } from '@/core/documents/DocumentProcessor';
import { GotenbergAdapter } from '@/core/documents/GotenbergAdapter';
import { getCurrentUser } from '@/lib/actions/users';
import { handleApiError } from '@/lib/api/apiError';
import { prisma } from '@/lib/prisma';
import { indexingQueue } from '@/lib/queues/indexing';
import { documentListSchema } from '@/lib/schemas/document';
import { SearchFactory } from '@/lib/search/factory';
import { fileStorageService } from '@/lib/services/FileStorageService';
import { settingsService } from '@/lib/services/SettingsService';
import type { WhereDocumentInput } from '@/lib/types/document';
import type { SupportedMime } from '@/lib/types/mime';
import { FileUtils } from '@/utils/files';
import { isSupportedMime, mimeMapper } from '@/utils/mime';

/**
 * Получает список документов с пагинацией, фильтрацией и поиском
 * @param request - Next.js request объект
 * @returns Список документов с метаданными пагинации
 *
 * Поддерживаемые query параметры:
 * - page: номер страницы (по умолчанию 1)
 * - limit: количество документов на странице (по умолчанию 10)
 * - categoryIds: ID категорий через запятую
 * - sortBy: поле для сортировки (по умолчанию createdAt)
 * - sortOrder: порядок сортировки asc/desc (по умолчанию desc)
 * - q: поисковый запрос по title и content
 * - authorId: ID автора документа
 *
 * Авторизация: требуется аутентификация
 * Гости видят только опубликованные документы
 */
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser(request);

        if (!user) {
            return NextResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);

        const validation = documentListSchema.safeParse({
            page: parseInt(searchParams.get('page') || '1'),
            limit: parseInt(searchParams.get('limit') || '10'),
            categoryIds: searchParams.get('categoryIds')?.split(','),
            sortBy: searchParams.get('sortBy') || 'createdAt',
            sortOrder: searchParams.get('sortOrder') || 'desc',
            authorId: searchParams.get('authorId') || '',
            q: searchParams.get('q') || '',
            dateFrom: searchParams.get('dateFrom') || '',
            dateTo: searchParams.get('dateTo') || '',
        });

        if (!validation.success) {
            return handleApiError(validation.error);
        }

        const {
            page,
            limit,
            categoryIds,
            sortBy,
            sortOrder,
            q,
            authorId,
            dateFrom,
            dateTo,
        } = validation.data;

        // Базовые условия фильтрации
        const baseWhere: WhereDocumentInput = {};

        if (user.role === USER_ROLES.GUEST) {
            baseWhere.isPublished = true;
        }

        if (authorId) {
            baseWhere.authorId = authorId;
        }

        if (categoryIds) {
            baseWhere.categories = {
                some: {
                    categoryId: { in: categoryIds },
                },
            };
        }

        // НОВАЯ ЛОГИКА: Гибридный поиск
        if (q && q.trim()) {
            // Поиск через FlexSearch + пагинация в БД
            const searchEngine =
                (process.env
                    .SEARCH_ENGINE as (typeof SearchEngine)[keyof typeof SearchEngine]) ||
                SearchEngine.FLEXSEARCH;
            const indexer = SearchFactory.createIndexer(searchEngine);

            // Проверяем и переиндексируем если нужно
            if (indexer.isEmpty()) {
                const allDocuments = await prisma.document.findMany({
                    include: {
                        author: {
                            select: { id: true, username: true, role: true },
                        },
                        categories: { include: { category: true } },
                    },
                });
                await indexer.reindexAll(allDocuments);
            }

            // ✅ Передаем все доступные фильтры из запроса
            const searchFilters = {
                ...(categoryIds && { categoryIds }),
                ...(validation.data.authorId && {
                    authorId: validation.data.authorId,
                }),
                ...(validation.data.dateFrom && {
                    dateFrom: new Date(validation.data.dateFrom),
                }),
                ...(validation.data.dateTo && {
                    dateTo: new Date(validation.data.dateTo),
                }),
            };

            // Получаем все релевантные документы из FlexSearch
            const searchResults = await indexer.search(q, searchFilters);

            if (searchResults.length === 0) {
                return NextResponse.json({
                    documents: [],
                    pagination: {
                        page,
                        limit,
                        total: 0,
                        totalPages: 0,
                        hasNextPage: false,
                        hasPrevPage: false,
                    },
                });
            }

            // Получаем ID документов в порядке релевантности
            const documentIds = searchResults.map(result => result.id);

            // Пагинируем найденные документы в БД
            const documents = await prisma.document.findMany({
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

            return NextResponse.json({
                documents: paginatedResults,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1,
                },
            });
        } else {
            // Обычная фильтрация без поиска (текущая логика)
            const where = { ...baseWhere };

            const [documents, total] = await Promise.all([
                prisma.document.findMany({
                    where,
                    include: {
                        author: {
                            select: { id: true, username: true, role: true },
                        },
                        categories: {
                            include: {
                                category: {
                                    select: {
                                        id: true,
                                        name: true,
                                        color: true,
                                    },
                                },
                            },
                        },
                    },
                    orderBy: { [sortBy]: sortOrder },
                    take: limit,
                    skip: (page - 1) * limit,
                }),
                prisma.document.count({ where }),
            ]);

            const totalPages = Math.ceil(total / limit);

            return NextResponse.json({
                documents,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1,
                },
            });
        }
    } catch (error) {
        return handleApiError(error);
    }
}

/**
 * Загружает и обрабатывает новый документ
 * @param request - Next.js request объект с FormData
 * @returns Созданный документ с метаданными
 *
 * FormData поля:
 * - file: файл документа (DOCX, DOC, PDF)
 * - authorId: ID автора документа
 * - title: название документа
 * - description: описание документа
 * - categoryIds: JSON массив ID категорий
 * - keywords: ключевые слова через запятую
 *
 * Авторизация: требуется роль выше GUEST
 * Валидация: размер файла, MIME тип, дубликаты
 * Обработка: конвертация в PDF, извлечение текста, индексация
 */
export async function POST(request: NextRequest) {
    let createdFileKey: string | null = null;
    let createdPdfKey: string | null = null;

    try {
        const user = await getCurrentUser(request);
        if (!user || user.role === USER_ROLES.GUEST) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const authorId = formData.get('authorId') as string;
        const title = formData.get('title') as string;
        const description = formData.get('description') as string;
        const categoryIds = JSON.parse(formData.get('categoryIds') as string);
        const keywords = formData.get('keywords') as string;

        // ===== ВАЛИДАЦИЯ И НАСТРОЙКИ =====
        // Получаем системные лимиты и допустимые MIME типы
        const [maxFileSize, allowedMimeTypes, isOcrEnabled] = await Promise.all(
            [
                settingsService.getMaxFileSize(),
                settingsService.getAllowedMimeTypes(),
                settingsService.isOcrEnabled(),
            ]
        );

        // MIME по настройкам
        if (!allowedMimeTypes.includes(file.type)) {
            return NextResponse.json(
                { message: 'Unsupported file type' },
                { status: 415 }
            );
        }

        // Строгое сужение до SupportedMime
        if (!isSupportedMime(file.type)) {
            return NextResponse.json(
                { message: 'Unsupported file type' },
                { status: 415 }
            );
        }
        const mime: SupportedMime = file.type;

        // ===== ПРОВЕРКА ФАЙЛА =====
        // Валидируем размер, содержимое и формат
        const buffer = Buffer.from(await file.arrayBuffer());

        // Размер по настройкам
        if (buffer.byteLength > maxFileSize) {
            return NextResponse.json(
                {
                    message: ` too large. Max ${Math.round(maxFileSize / (1024 * 1024))}MB`,
                },
                { status: 413 }
            );
        }

        const fileValidation = await FileUtils.validateFile(buffer, mime);
        if (!fileValidation.valid) {
            return NextResponse.json(
                { message: fileValidation.error },
                { status: 400 }
            );
        }

        // ===== ПРОВЕРКА ДУБЛИКАТОВ =====
        // Ищем документы с таким же хешем содержимого
        const hash = await FileUtils.generateFileHash(buffer);

        const existingDocument = await prisma.document.findUnique({
            where: { hash },
        });

        if (existingDocument) {
            return NextResponse.json(
                { message: 'Документ с таким содержимым уже существует' },
                { status: 409 }
            );
        }

        // ===== ОБРАБОТКА ДОКУМЕНТА =====
        // Конвертируем в PDF, извлекаем текст, сохраняем в MinIO
        const gotenbergUrl = process.env.GOTENBERG_URL || GOTENBERG_URL;
        const adapter = new GotenbergAdapter(gotenbergUrl);
        const processor = new DocumentProcessor(adapter, fileStorageService);

        const processed = await processor.processUpload(
            buffer,
            mime,
            file.name,
            { enableOcr: true }
        );

        const filePath =
            processed.storage?.originalKey ?? processed.original.path;
        createdFileKey = processed.storage?.originalKey ?? null;
        createdPdfKey = processed.storage?.pdfKey ?? null;

        // ===== СОХРАНЕНИЕ В БД =====
        // Создаем запись документа с категориями
        const { document } = await prisma.$transaction(
            async tx => {
                const doc = await tx.document.create({
                    data: {
                        title,
                        description,
                        content: processed.extractedText || '',
                        filePath,
                        fileName: file.name,
                        fileSize: file.size,
                        hash,
                        mimeType: mime,
                        format: mimeMapper(mime),
                        keywords: keywords?.split(',') || [],
                        isPublished: true,
                        authorId: authorId,
                        categories: {
                            create: categoryIds.map((categoryId: string) => ({
                                categoryId,
                            })),
                        },
                    },
                    include: {
                        author: {
                            select: { id: true, username: true, role: true },
                        },
                        categories: { include: { category: true } },
                    },
                });

                // ===== ОБРАБОТКА PDF ВЕРСИИ =====
                // Если получили конвертированный PDF, фиксируем его как основной

                if (processed.storage?.pdfKey) {
                    const conv = await tx.convertedDocument.create({
                        data: {
                            documentId: doc.id,
                            conversionType: 'PDF',
                            filePath: processed.storage.pdfKey,
                            fileSize: (
                                await fileStorageService.getFileInfo(
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

                return { document: doc };
            },
            {
                timeout: 60000,
                maxWait: 30000,
            }
        );

        if (processed.storage?.pdfKey) {
            const conv = await prisma.convertedDocument.create({
                data: {
                    documentId: document.id,
                    conversionType: 'PDF',
                    filePath: processed.storage.pdfKey,
                    fileSize: (
                        await fileStorageService.getFileInfo(
                            processed.storage.pdfKey
                        )
                    ).size,
                    originalFile: filePath,
                },
            });

            await prisma.document.update({
                where: { id: document.id },
                data: { mainPdfId: conv.id },
            });
        }

        // ===== ИНДЕКСАЦИЯ (в фоне) =====
        // Ставим задачу в очередь для фоновой индексации
        console.log(
            `[API] Enqueuing job: 'index-document' for documentId: ${document.id}`
        );
        await indexingQueue.add('index-document', { documentId: document.id });

        return NextResponse.json({
            message: 'Документ успешно создан',
            document,
        });
    } catch (error) {
        if (createdPdfKey) {
            void fileStorageService.deleteDocument(createdPdfKey);
        }
        if (createdFileKey) {
            void fileStorageService.deleteDocument(createdFileKey);
        }
        return handleApiError(error);
    }
}

/**
 * @fileoverview API роут для работы с документами
 *
 * Основные операции:
 * - GET: получение списка документов с фильтрацией
 * - POST: загрузка и обработка новых документов
 *
 * Интеграции:
 * - FileStorageService: сохранение файлов в MinIO
 * - DocumentProcessor: конвертация и извлечение текста
 * - SearchFactory: индексация для поиска
 * - SettingsService: системные настройки и лимиты
 */
