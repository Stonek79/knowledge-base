import { Attachment } from '@prisma/client';

import { NextRequest, NextResponse } from 'next/server';

import { ATTACHMENT_TYPE, DOCUMENT_FORMAT } from '@/constants/document';
import { USER_ROLES } from '@/constants/user';
import { getCurrentUser } from '@/lib/actions/users';
import { prisma } from '@/lib/prisma';
import { attachmentMetadataSchema } from '@/lib/schemas/attachment';
import { attachmentService } from '@/lib/services/AttachmentService';
import { fileStorageService } from '@/lib/services/FileStorageService';
import { pdfCombiner } from '@/lib/services/PDFCombiner';
import { settingsService } from '@/lib/services/SettingsService';
import type { SupportedMime } from '@/lib/types/mime';
import { isSupportedMime } from '@/utils/mime';

/**
 * POST /api/documents/[documentId]/attachments
 * Добавляет приложение к документу
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ documentId: string }> }
) {
    try {
        const user = await getCurrentUser(request);
        const { documentId } = await params;

        if (!user) {
            return NextResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Проверяем права на документ
        const document = await prisma.document.findUnique({
            where: { id: documentId },
            select: { authorId: true, isPublished: true },
        });

        if (!document) {
            return NextResponse.json(
                { message: 'Document not found' },
                { status: 404 }
            );
        }

        if (document.authorId !== user.id && user.role !== USER_ROLES.ADMIN) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const metadata = formData.get('metadata') as string;

        const [maxFileSize, allowedMimeTypes] = await Promise.all([
            settingsService.getMaxFileSize(),
            settingsService.getAllowedMimeTypes(),
        ]);

        if (
            !allowedMimeTypes.includes(file.type) ||
            !isSupportedMime(file.type)
        ) {
            return NextResponse.json(
                { message: 'Unsupported file type' },
                { status: 415 }
            );
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        if (buffer.byteLength > maxFileSize) {
            return NextResponse.json(
                { message: 'File too large' },
                { status: 413 }
            );
        }

        if (!file || !metadata) {
            return NextResponse.json(
                { message: 'Missing file or metadata' },
                { status: 400 }
            );
        }

        const parsedMetadata = attachmentMetadataSchema.parse(
            JSON.parse(metadata)
        );

        const result = await attachmentService.uploadAttachment(buffer, {
            ...parsedMetadata,
            size: buffer.byteLength,
            mimeType: file.type,
        });

        const { _max } = await prisma.attachment.aggregate({
            where: { documentId },
            _max: { order: true },
        });
        const nextOrder = (_max.order ?? -1) + 1;

        // Создаём запись в БД
        let createdAttachmentId: string | null = null;

        let attachment: Attachment | null = null;
        try {
            await prisma.$transaction(async tx => {
                const created = await tx.attachment.create({
                    data: {
                        documentId,
                        fileName: parsedMetadata.originalName,
                        fileSize: result.size,
                        mimeType: result.mimeType,
                        filePath: result.key,
                        attachmentType:
                            parsedMetadata.attachmentType ||
                            ATTACHMENT_TYPE.ATTACHMENT,
                        order: nextOrder,
                    },
                });
                createdAttachmentId = created.id;
                attachment = created;
            });
        } catch (err) {
            // транзакция по БД упала — чистим загруженный файл
            await fileStorageService.deleteDocument(result.key);
            throw err;
        }

        try {
            const doc = await prisma.document.findUnique({
                where: { id: documentId },
                select: {
                    id: true,
                    filePath: true,
                    mimeType: true,
                    fileName: true,
                    mainPdf: { select: { id: true, filePath: true } },
                },
            });

            if (!doc || !isSupportedMime(doc.mimeType)) {
                return NextResponse.json(attachment);
            }

            const list = await prisma.attachment.findMany({
                where: { documentId },
                orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
                select: {
                    id: true,
                    filePath: true,
                    fileName: true,
                    mimeType: true,
                },
            });

            const valid = list.filter(a => isSupportedMime(a.mimeType));
            const pdfResult = await pdfCombiner.combineWithAttachments(
                {
                    mainDocumentPath: doc.filePath,
                    mainDocumentMimeType: doc.mimeType,
                    attachments: valid.map((a, idx) => ({
                        id: a.id,
                        filePath: a.filePath,
                        fileName: a.fileName,
                        mimeType: a.mimeType as SupportedMime,
                        order: idx,
                    })),
                },
                doc.fileName
            );

            if (!pdfResult.success) {
                // компенсация: откатить добавленное приложение и удалить файл
                if (createdAttachmentId) {
                    await prisma.attachment.delete({
                        where: { id: createdAttachmentId },
                    });
                }
                await fileStorageService.deleteDocument(result.key);

                if (doc.mainPdf?.filePath) {
                    void fileStorageService.deleteDocument(
                        doc.mainPdf.filePath
                    );
                }
                if (doc.mainPdf?.id) {
                    await prisma.convertedDocument.delete({
                        where: { id: doc.mainPdf.id },
                    });
                }
                await prisma.document.update({
                    where: { id: doc.id },
                    data: { mainPdfId: null },
                });

                return NextResponse.json(
                    { message: 'Failed to rebuild PDF' },
                    { status: 500 }
                );
            }

            if (pdfResult.success && pdfResult.combinedPdfKey) {
                // удалить старый объединенный, если был
                if (doc.mainPdf?.filePath) {
                    void fileStorageService.deleteDocument(
                        doc.mainPdf.filePath
                    );
                }
                const conv = await prisma.convertedDocument.create({
                    data: {
                        documentId: doc.id,
                        conversionType: DOCUMENT_FORMAT.PDF,
                        filePath: pdfResult.combinedPdfKey,
                        fileSize: pdfResult.fileSize ?? 0,
                        originalFile: doc.filePath,
                    },
                });
                await prisma.document.update({
                    where: { id: doc.id },
                    data: { mainPdfId: conv.id },
                });

                if (doc.mainPdf?.id) {
                    // удаляем СТАРУЮ запись о конвертации
                    await prisma.convertedDocument.delete({
                        where: { id: doc.mainPdf.id },
                    });
                }
            }
        } catch (e) {
            console.warn('Rebuild combined PDF failed:', e);
        }

        return NextResponse.json(attachment);
    } catch (error) {
        console.error('Error adding attachment:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/documents/[documentId]/attachments
 * Получает список приложений документа
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ documentId: string }> }
) {
    try {
        const user = await getCurrentUser(request);
        if (!user) {
            return NextResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { documentId } = await params;

        const attachments = await prisma.attachment.findMany({
            where: { documentId },
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
            include: {
                document: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });

        return NextResponse.json(attachments);
    } catch (error) {
        console.error('Error getting attachments:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}
