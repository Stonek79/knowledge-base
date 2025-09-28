import { NextRequest, NextResponse } from 'next/server';

import { MIME } from '@/constants/mime';
import { getCurrentUser } from '@/lib/actions/users';
import { prisma } from '@/lib/prisma';
import { getFileStorageService } from '@/lib/services/FileStorageService';

export const runtime = 'nodejs';

function safeFileName(name: string): string {
    // минимальная экранизация для заголовка
    return name
        .replace(/[^\u0000-\u007F]/g, '') // Убираем спецсимволы, оставляем ASCII
        .replace(/\s+/g, ' ') // Нормализуем пробелы
        .trim();
}

/**
 * Разрешает файл для скачивания на основе типа и доступности
 * @param request - HTTP запрос
 * @param documentId - ID документа
 * @returns Информация о файле или ошибка
 *
 * @description
 * Определяет путь к файлу (оригинал или PDF), проверяет существование
 * в MinIO или локальной файловой системе, возвращает метаданные.
 */
async function resolveFile(request: NextRequest, documentId: string) {
    const allowedTypes = ['original', 'pdf', 'converted'];
    const { searchParams } = new URL(request.url);

    const fileType = (searchParams.get('type') || 'original').toLowerCase();
    const disposition = searchParams.get('disposition') === 'inline' ? 'inline' : 'attachment';

    if (!allowedTypes.includes(fileType)) {
        return { status: 400 as const, error: 'Invalid file type' };
    }

    const doc = await prisma.document.findUnique({
        where: { id: documentId },
        select: {
            id: true,
            fileName: true,
            mimeType: true,
            filePath: true,
            mainPdf: { select: { filePath: true } },
        },
    });

    if (!doc) {
        return { status: 404 as const, error: 'Document not found' };
    }

    let filePath = doc.filePath;
    let fileName = doc.fileName;
    let contentType = doc.mimeType;

    if (fileType === 'pdf') {
        const mainPdfKeyOrPath = doc.mainPdf?.filePath;

        if (mainPdfKeyOrPath) {
            filePath = mainPdfKeyOrPath;
            fileName = doc.fileName.replace(/\.[^.]+$/, '.pdf');
            contentType = 'application/pdf';
        } else if (doc.mimeType === 'application/pdf') {
            filePath = doc.filePath;
            fileName = doc.fileName;
            contentType = 'application/pdf';
        } else {
            return { status: 404 as const, error: 'PDF version not available' };
        }
    }

    if (fileType === 'converted') {
        const { searchParams } = new URL(request.url);
        const conv = (searchParams.get('conversion') || 'pdf').toLowerCase();
        // маппинг query → Prisma enum, при необходимости расширить
        const typeMap: Record<string, 'PDF' | 'DOCX'> = {
            pdf: 'PDF',
            docx: 'DOCX',
        };

        const convType = typeMap[conv] ?? 'PDF';

        const converted = await prisma.convertedDocument.findFirst({
            where: { documentId, conversionType: convType },
            select: { filePath: true },
            orderBy: { convertedAt: 'desc' },
        });

        if (!converted) {
            return {
                status: 404 as const,
                error: 'Converted version not available',
            };
        }

        filePath = converted.filePath;
        fileName = doc.fileName.replace(
            /\.[^.]+$/,
            `.${convType.toLowerCase()}`
        );
        contentType = convType === 'PDF' ? MIME.PDF : MIME.DOCX;
    }

    try {
        await getFileStorageService().getFileInfo(filePath);
    } catch {
        return { status: 404 as const, error: 'File not found' };
    }

    return {
        status: 200 as const,
        filePath,
        fileName,
        contentType,
        disposition,
    };
}

/**
 * @api {GET} /api/documents/:documentId/download Скачивание документа
 * @apiName DownloadDocument
 * @apiGroup Documents
 * @apiVersion 1.0.0
 *
 * @apiParam {string} documentId Уникальный идентификатор документа
 * @apiQuery {string} [type=original] Тип файла для скачивания (original|pdf)
 * @apiQuery {string} [disposition=attachment] Способ отображения (attachment|inline)
 *
 * @apiSuccess {Blob} file Файл для скачивания
 * @apiHeader {string} Content-Type MIME тип файла
 * @apiHeader {string} Content-Length Размер файла в байтах
 * @apiHeader {string} Content-Disposition Заголовок для скачивания
 * @apiHeader {string} Cache-Control Кэширование (private, no-cache)
 * @apiHeader {string} Accept-Ranges Поддержка частичных запросов
 *
 * @apiError {Object} 400 Bad Request - Неверный тип файла
 * @apiError {Object} 401 Unauthorized - Пользователь не авторизован
 * @apiError {Object} 404 Not Found - Документ или файл не найден
 * @apiError {Object} 500 Internal Server Error - Внутренняя ошибка сервера
 *
 * @apiDescription
 * Скачивает оригинальный файл или конвертированную PDF версию документа.
 * Поддерживает как локальные файлы, так и файлы из MinIO хранилища.
 *
 * @apiExample {curl} Скачивание оригинала:
 *     curl -H "Authorization: Bearer {token}" \
 *          "http://localhost:3000/api/documents/{documentId}/download?type=original"
 *
 * @apiExample {curl} Скачивание PDF:
 *     curl -H "Authorization: Bearer {token}" \
 *          "http://localhost:3000/api/documents/{documentId}/download?type=pdf"
 *
 * @apiExample {curl} Встроенное отображение:
 *     curl -H "Authorization: Bearer {token}" \
 *          "http://localhost:3000/api/documents/{documentId}/download?type=pdf&disposition=inline"
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ documentId: string }> }
) {
    const { documentId } = await params;

    try {
        const user = await getCurrentUser(request);

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const resolved = await resolveFile(request, documentId);
        if (resolved.status !== 200) {
            return NextResponse.json(
                { error: resolved.error },
                { status: resolved.status }
            );
        }

        const fileBuffer = await getFileStorageService().downloadDocument(
            resolved.filePath
        );

        const body = new Uint8Array(fileBuffer);

        const contentDispositionFilename = `filename*=UTF-8''${encodeURIComponent(resolved.fileName)}; filename="${safeFileName(resolved.fileName)}"`;
        return new NextResponse(body, {
            headers: {
                'Content-Type': resolved.contentType,
                'Content-Length': String(body.byteLength),
                // 'Content-Disposition': `${resolved.disposition}; ${contentDispositionFilename}`, // Если не будет работать, то пофиксить для других браузеров
                'Content-Disposition': 'inline',
                'Cache-Control': 'private, max-age=0, must-revalidate',
                'Accept-Ranges': 'bytes',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, HEAD',
                'Access-Control-Allow-Headers': 'Range, Content-Range',
                'X-Content-Type-Options': 'nosniff',
                // 'X-Download-Options': 'noopen', // Защита от автоматического открытия
                'Content-Security-Policy': "default-src 'none'", // Ограничение CSP для файлов
                'X-XSS-Protection': '1; mode=block', // Защита от XSS
                // 'Referrer-Policy': 'no-referrer', // Защита от отслеживания
                // 'X-Permitted-Cross-Domain-Policies': 'none', // Защита от атак через iframe
                // 'X-Robots-Tag': 'noindex, nofollow', // Защита от индексации
            },
        });
    } catch (error) {
        console.error('Error downloading file:', error);

        if (error instanceof Error) {
            if (error.message.includes('ENOENT')) {
                return NextResponse.json(
                    { error: 'File not found on server' },
                    { status: 404 }
                );
            }
            if (error.message.includes('EACCES')) {
                return NextResponse.json(
                    { error: 'Access denied to file' },
                    { status: 403 }
                );
            }
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * @api {HEAD} /api/documents/:documentId/download Получение информации о файле
 * @apiName GetDocumentInfo
 * @apiGroup Documents
 * @apiVersion 1.0.0
 *
 * @apiParam {string} documentId Уникальный идентификатор документа
 * @apiQuery {string} [type=original] Тип файла (original|pdf)
 *
 * @apiSuccess {string} Content-Type MIME тип файла
 *
 * @apiDescription
 * Возвращает метаданные файла без скачивания содержимого.
 * Полезно для проверки существования и получения типа файла.
 *
 * @apiExample {curl} Проверка информации:
 *     curl -I -H "Authorization: Bearer {token}" \
 *          "http://localhost:3000/api/documents/{documentId}/download?type=pdf"
 */
export async function HEAD(
    request: NextRequest,
    { params }: { params: Promise<{ documentId: string }> }
) {
    try {
        const { documentId } = await params;
        const resolved = await resolveFile(request, documentId);
        if (resolved.status !== 200) {
            return new NextResponse(null, { status: resolved.status });
        }
        return new NextResponse(null, {
            status: 200,
            headers: {
                'Content-Type': resolved.contentType,
            },
        });
    } catch {
        return new NextResponse(null, { status: 500 });
    }
}