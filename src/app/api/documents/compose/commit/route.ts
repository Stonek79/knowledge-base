import { NextRequest, NextResponse } from 'next/server';

import { STORAGE_BASE_PATHS } from '@/constants/app';
import { getCurrentUser } from '@/lib/actions/users';
import { handleApiError } from '@/lib/api/apiError';
import { prisma } from '@/lib/prisma';
import { indexingQueue } from '@/lib/queues/indexing';
import { composeChangeSetSchema } from '@/lib/schemas/compose';
import { fileStorageService } from '@/lib/services/FileStorageService';
import { pdfCombiner } from '@/lib/services/PDFCombiner';
import type { SupportedMime } from '@/lib/types/mime';
import { hashPassword } from '@/utils/auth';
import { isSupportedMime } from '@/utils/mime';

/**
 * @summary Атомарно создает новый документ со всеми приложениями.
 */
export async function POST(request: NextRequest) {
    // подготовка списков для компенсаций/очистки
    const promoted: string[] = []; // новые ключи, созданные в процессе (удаляем при rollback)
    const tempKeys: string[] = []; // временные ключи (чистятся promote'ом; на всякий случай чистим после)

    try {
        const user = await getCurrentUser(request);
        if (!user)
            return NextResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            );

        const body = await request.json();
        const parsed = composeChangeSetSchema.parse(body);

        if (!parsed.replaceMain) {
            throw new Error('Main document file is required for creation.');
        }

        if (!isSupportedMime(parsed?.replaceMain?.mimeType)) {
            return NextResponse.json(
                { message: 'Unsupported main file type' },
                { status: 415 }
            );
        }

        const mainMime: SupportedMime = parsed.replaceMain.mimeType;

        const result = await prisma.$transaction(
            async tx => {
                // 1) продвинуть основной
                if (!parsed.replaceMain)
                    throw new Error('replaceMain is required for creation');

                tempKeys.push(parsed.replaceMain.tempKey);

                const main = await fileStorageService.promoteFromTemp(
                    parsed.replaceMain.tempKey,
                    STORAGE_BASE_PATHS.ORIGINAL
                );

                promoted.push(main.key);

                // 2) создать документ
                const doc = await tx.document.create({
                    data: {
                        title:
                            parsed.metadata?.title ??
                            parsed.replaceMain.originalName,
                        description: parsed.metadata?.description ?? null,
                        content: '', // будет заполнено воркером
                        filePath: main.key,
                        fileName: parsed.replaceMain.originalName,
                        fileSize: main.size,
                        mimeType: mainMime,
                        hash: (await import('crypto'))
                            .createHash('sha256')
                            .update(main.key)
                            .digest('hex'),
                        isPublished: true,
                        authorId: user.id,
                        isConfidential:
                            parsed.metadata?.isConfidential ?? false,
                        isSecret: parsed.metadata?.isSecret ?? false,
                        accessCodeHash: parsed.metadata?.accessCode
                            ? await hashPassword(parsed.metadata.accessCode)
                            : null,
                        keywords: parsed.metadata?.keywords
                            ? parsed.metadata.keywords
                                  .split(',')
                                  .map(s => s.trim())
                                  .filter(Boolean)
                            : [],
                        categories: parsed.metadata?.categoryIds
                            ? {
                                  create: parsed.metadata.categoryIds.map(
                                      id => ({
                                          categoryId: id,
                                      })
                                  ),
                              }
                            : undefined,
                    },
                    include: {
                        author: true,
                        categories: { include: { category: true } },
                    },
                });

                // Создаем записи в списке доступа, если документ конфиденциальный
                if (
                    doc.isConfidential &&
                    parsed.metadata?.confidentialAccessUserIds?.length
                ) {
                    await tx.confidentialDocumentAccess.createMany({
                        data: parsed.metadata.confidentialAccessUserIds.map(
                            userId => ({
                                documentId: doc.id,
                                userId: userId,
                            })
                        ),
                    });
                }

                const clientIdToAttachmentId: Record<string, string> = {};

                // 3) приложения
                if (parsed.addAttachments?.length) {
                    for (const att of parsed.addAttachments) {
                        if (!isSupportedMime(att.mimeType)) {
                            return NextResponse.json(
                                {
                                    message: `Unsupported attachment type: ${att.originalName}`,
                                },
                                { status: 415 }
                            );
                        }

                        const attMime: SupportedMime = att.mimeType;

                        tempKeys.push(att.tempKey);

                        const promotedAtt =
                            await fileStorageService.promoteFromTemp(
                                att.tempKey,
                                STORAGE_BASE_PATHS.ATTACHMENTS
                            );

                        promoted.push(promotedAtt.key);

                        const newAttachment = await tx.attachment.create({
                            data: {
                                documentId: doc.id,
                                fileName: att.originalName,
                                fileSize: promotedAtt.size,
                                mimeType: attMime,
                                filePath: promotedAtt.key,
                                order: -1,
                            },
                        });

                        clientIdToAttachmentId[att.clientId] = newAttachment.id;
                    }
                }

                // Применяем порядок для ВСЕХ приложений
                if (parsed.reorder?.length) {
                    for (const {
                        attachmentId,
                        clientId,
                        order,
                    } of parsed.reorder) {
                        const finalId =
                            attachmentId ?? clientIdToAttachmentId[clientId];

                        if (finalId) {
                            await tx.attachment.update({
                                where: { id: finalId },
                                data: { order },
                            });
                        } else {
                            // Эта ситуация не должна возникать при корректном запросе с клиента
                            throw new Error(
                                `[compose/commit] Reorder failed: could not find attachmentId for clientId ${clientId}`
                            );
                        }
                    }
                }

                // 4) сборка PDF
                const attachments = await tx.attachment.findMany({
                    where: { documentId: doc.id },
                    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
                });

                const valid = attachments
                    .filter(a => isSupportedMime(a.mimeType))
                    .map((a, idx) => ({
                        id: a.id,
                        filePath: a.filePath,
                        fileName: a.fileName,
                        mimeType: a.mimeType as SupportedMime,
                        order: idx,
                    }));

                const pdf = await pdfCombiner.combineWithAttachments(
                    {
                        mainDocumentPath: doc.filePath,
                        mainDocumentMimeType: mainMime,
                        attachments: valid,
                    },
                    doc.fileName
                );

                if (!pdf.success || !pdf.combinedPdfKey) {
                    throw new Error(
                        pdf.error || 'Failed to build combined PDF'
                    );
                }

                // запись основной PDF
                const conv = await tx.convertedDocument.create({
                    data: {
                        documentId: doc.id,
                        conversionType: 'PDF',
                        filePath: pdf.combinedPdfKey,
                        fileSize: pdf.fileSize ?? 0,
                        originalFile: doc.filePath,
                    },
                });

                await tx.document.update({
                    where: { id: doc.id },
                    data: { mainPdfId: conv.id },
                });

                // 5) ИНДЕКСАЦИЯ (в фоне)
                // Ставим задачу на полную пересборку контента и последующую индексацию
                if (doc.id) {
                    console.log(`[API] Enqueuing job: 'update-content-and-reindex' for documentId: ${doc.id}`);
                    await indexingQueue.add('update-content-and-reindex', {
                        documentId: doc.id,
                    });
                }

                return { docId: doc.id };
            },
            {
                timeout: 60000,
                maxWait: 30000,
            }
        );

        // финализация (после коммита): удалить старые файлы и любые temp
        for (const t of tempKeys) {
            await fileStorageService.safeDelete(t);
        }

        return NextResponse.json({ status: 'ok', ...result });
    } catch (error) {
        for (const key of promoted) {
            await fileStorageService.safeDelete(key);
        }

        return handleApiError(error);
    }
}
