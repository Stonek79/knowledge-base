import { unlink } from 'fs/promises';
import { isAbsolute } from 'path';

import { NextRequest, NextResponse } from 'next/server';

import { SearchEngine } from '@/constants/document';
import { USER_ROLES } from '@/constants/user';
import { getCurrentUser } from '@/lib/actions/users';
import { handleApiError } from '@/lib/api/apiError';
import { prisma } from '@/lib/prisma';
import { updateDocumentSchema } from '@/lib/schemas/document';
import { SearchFactory } from '@/lib/search/factory';
import { fileStorageService } from '@/lib/services/FileStorageService';

/**
 * @api {GET} /api/documents/:documentId Получение документа
 * @apiName GetDocument
 * @apiGroup Documents
 * @apiVersion 1.0.0
 *
 * @apiParam {string} documentId Уникальный идентификатор документа
 *
 * @apiSuccess {Object} document Документ с метаданными
 * @apiSuccess {string} document.id ID документа
 * @apiSuccess {string} document.title Заголовок документа
 * @apiSuccess {string} document.description Описание документа
 * @apiSuccess {string} document.fileName Имя файла
 * @apiSuccess {string} document.mimeType MIME тип файла
 * @apiSuccess {number} document.fileSize Размер файла в байтах
 * @apiSuccess {string} document.author.username Имя автора
 * @apiSuccess {Object[]} document.categories Категории документа
 * @apiSuccess {number} document.viewCount Количество просмотров
 * @apiSuccess {Date} document.createdAt Дата создания
 *
 * @apiError {Object} 401 Unauthorized - Пользователь не авторизован
 * @apiError {Object} 403 Forbidden - Доступ запрещен (GUEST к неопубликованному)
 * @apiError {Object} 404 Not Found - Документ не найден
 *
 * @apiDescription
 * Получает документ по ID с увеличением счетчика просмотров.
 * GUEST пользователи могут видеть только опубликованные документы.
 *
 * @apiExample {curl} Получение документа:
 *     curl -H "Authorization: Bearer {token}" \
 *          "http://localhost:3000/api/documents/{documentId}"
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { documentId: string } }
) {
    const { documentId } = await params;

    try {
        const user = await getCurrentUser(request);
        if (!user) {
            return NextResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const document = await prisma.document.findUnique({
            where: { id: documentId },
            include: {
                author: { select: { id: true, username: true, role: true } },
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
                mainPdf: { select: { id: true, filePath: true } },
            },
        });

        if (!document) {
            return NextResponse.json(
                { message: 'Документ не найден' },
                { status: 404 }
            );
        }

        if (user.role === USER_ROLES.GUEST && !document.isPublished) {
            return NextResponse.json(
                { message: 'Доступ запрещен' },
                { status: 403 }
            );
        }

        // Увеличение счетчика просмотров
        await prisma.document.update({
            where: { id: documentId },
            data: { viewCount: { increment: 1 } },
        });

        return NextResponse.json({ document });
    } catch (error) {
        return handleApiError(error);
    }
}

/**
 * @api {PUT} /api/documents/:documentId Обновление документа
 * @apiName UpdateDocument
 * @apiGroup Documents
 * @apiVersion 1.0.0
 *
 * @apiParam {string} documentId Уникальный идентификатор документа
 * @apiBody {Object} body Данные для обновления
 * @apiBody {string} [body.title] Новый заголовок документа
 * @apiBody {string} [body.description] Новое описание документа
 * @apiBody {string} [body.keywords] Ключевые слова (через запятую)
 * @apiBody {string[]} [body.categoryIds] ID категорий документа
 *
 * @apiSuccess {Object} document Обновленный документ
 * @apiSuccess {string} message Сообщение об успешном обновлении
 *
 * @apiError {Object} 400 Bad Request - Неверные данные валидации
 * @apiError {Object} 401 Unauthorized - Пользователь не авторизован
 * @apiError {Object} 403 Forbidden - Нет прав на редактирование
 * @apiError {Object} 404 Not Found - Документ не найден
 *
 * @apiDescription
 * Обновляет метаданные документа. USER может редактировать только свои документы.
 * ADMIN может редактировать любые документы. После обновления документ переиндексируется.
 *
 * @apiExample {curl} Обновление документа:
 *     curl -X PUT -H "Authorization: Bearer {token}" \
 *          -H "Content-Type: application/json" \
 *          -d '{"title":"Новый заголовок","keywords":"новое, ключевое, слово"}' \
 *          "http://localhost:3000/api/documents/{documentId}"
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: { documentId: string } }
) {
    const { documentId } = await params;

    try {
        const user = await getCurrentUser(request);
        if (!user || user.role === USER_ROLES.GUEST) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const validation = updateDocumentSchema.safeParse(body);
        if (!validation.success) {
            return handleApiError(validation.error);
        }

        const document = await prisma.document.findUnique({
            where: { id: documentId },
            include: { author: true },
        });

        if (!document) {
            return NextResponse.json(
                { message: 'Документ не найден' },
                { status: 404 }
            );
        }

        if (user.role === USER_ROLES.USER && document.authorId !== user.id) {
            return NextResponse.json(
                { message: 'Можно редактировать только свои документы' },
                { status: 403 }
            );
        }

        const updatedDocument = await prisma.document.update({
            where: { id: documentId },
            data: {
                title: validation.data.title,
                description: validation.data.description,
                keywords: validation.data.keywords
                    ? validation.data.keywords
                          .split(',')
                          .map(s => s.trim())
                          .filter(Boolean)
                    : undefined,
                categories: validation.data.categoryIds
                    ? {
                          deleteMany: {},
                          create: validation.data.categoryIds.map(
                              categoryId => ({ categoryId })
                          ),
                      }
                    : undefined,
            },
            include: {
                author: { select: { id: true, username: true, role: true } },
                categories: { include: { category: true } },
            },
        });

        const engine =
            (process.env
                .SEARCH_ENGINE as (typeof SearchEngine)[keyof typeof SearchEngine]) ||
            SearchEngine.FLEXSEARCH;
        const indexer = SearchFactory.createIndexer(engine);
        await indexer.indexDocument(updatedDocument);

        return NextResponse.json({
            message: 'Документ успешно обновлен',
            document: updatedDocument,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

/**
 * @api {DELETE} /api/documents/:documentId Удаление документа
 * @apiName DeleteDocument
 * @apiGroup Documents
 * @apiVersion 1.0.0
 *
 * @apiParam {string} documentId Уникальный идентификатор документа
 *
 * @apiSuccess {Object} message Сообщение об успешном удалении
 *
 * @apiError {Object} 401 Unauthorized - Пользователь не авторизован
 * @apiError {Object} 403 Forbidden - Только ADMIN может удалять документы
 * @apiError {Object} 404 Not Found - Документ не найден
 *
 * @apiDescription
 * Полностью удаляет документ и все связанные файлы. Процесс выполняется в транзакции:
 * 1) Собираются ключи всех файлов (оригинал + конвертированные версии)
 * 2) Атомарно удаляются записи из БД
 * 3) Удаляются файлы из MinIO/локального хранилища
 * 4) Удаляется из поискового индекса
 *
 * @apiExample {curl} Удаление документа:
 *     curl -X DELETE -H "Authorization: Bearer {token}" \
 *          "http://localhost:3000/api/documents/{documentId}"
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: { documentId: string } }
) {
    const { documentId } = await params;

    try {
        const user = await getCurrentUser(request);
        if (!user || user.role !== USER_ROLES.ADMIN) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const exists = await prisma.document.findUnique({
            where: { id: documentId },
            select: { id: true },
        });
        if (!exists) {
            return NextResponse.json(
                { message: 'Документ не найден' },
                { status: 404 }
            );
        }

        // 1) Транзакция: собираем ключи файлов и удаляем записи
        const fileKeys: string[] = [];
        await prisma.$transaction(async tx => {
            const doc = await tx.document.findUnique({
                where: { id: documentId },
                select: { filePath: true },
            });
            if (doc?.filePath) fileKeys.push(doc.filePath);

            const converted = await tx.convertedDocument.findMany({
                where: { documentId },
                select: { filePath: true },
            });
            for (const it of converted) fileKeys.push(it.filePath);

            const snapshot = await tx.document.findUnique({
                where: { id: documentId },
                select: {
                    filePath: true, // оригинал документа
                    mainPdf: { select: { filePath: true } }, // текущий объединённый PDF
                    attachments: { select: { filePath: true } }, // все приложения
                    convertedVersions: { select: { filePath: true } }, // все конвертированные версии
                },
            });

            if (snapshot?.filePath) fileKeys.push(snapshot.filePath);
            if (snapshot?.mainPdf?.filePath)
                fileKeys.push(snapshot.mainPdf.filePath);
            for (const a of snapshot?.attachments ?? [])
                fileKeys.push(a.filePath);
            for (const c of snapshot?.convertedVersions ?? [])
                fileKeys.push(c.filePath);

            await tx.convertedDocument.deleteMany({ where: { documentId } });
            await tx.documentCategory.deleteMany({ where: { documentId } });
            await tx.attachment.deleteMany({ where: { documentId } });
            await tx.document.delete({ where: { id: documentId } });
        });

        // 2) Best-effort удаление файлов из MinIO/ФС (после коммита)
        for (const key of fileKeys) {
            try {
                if (isAbsolute(key)) {
                    await unlink(key);
                } else {
                    await fileStorageService.deleteDocument(key);
                }
            } catch (e) {
                console.log(`Failed to delete file ${key}`, e);
            }
        }

        // 3) Удаление из поискового индекса
        const engine =
            (process.env
                .SEARCH_ENGINE as (typeof SearchEngine)[keyof typeof SearchEngine]) ||
            SearchEngine.FLEXSEARCH;
        const indexer = SearchFactory.createIndexer(engine);
        await indexer.removeFromIndex(documentId);

        return NextResponse.json({ message: 'Документ успешно удален' });
    } catch (error) {
        return handleApiError(error);
    }
}
