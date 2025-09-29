import { STORAGE_BASE_PATHS } from '@/constants/app';
import { USER_ROLES } from '@/constants/user';
import { ApiError } from '@/lib/api/apiError';
import { indexingQueue } from '@/lib/queues/indexing';
import { DocumentRepository } from '@/lib/repositories/documentRepository';
import { composeChangeSetSchema } from '@/lib/schemas/compose';
import { SupportedMime } from '@/lib/types/mime';
import { UserResponse } from '@/lib/types/user';
import { hashPassword } from '@/utils/auth';
import { isSupportedMime } from '@/utils/mime';

import { getFileStorageService } from '../FileStorageService';
import { pdfCombiner } from '../PDFCombiner';

/**
 * DocumentComposeService будет инкапсулировать сложную логику
 * по "сборке" или композиции документов из разных частей.
 */
export class DocumentComposeService {
    /**
     * Создает документ.
     * @param data - Данные для создания.
     * @param user - Пользователь.
     * @returns Результат создания.
     */
    public static async composeCreateDocument(
        data: unknown,
        user: UserResponse
    ) {
        // подготовка списков для компенсаций/очистки
        const promoted: string[] = []; // новые ключи, созданные в процессе (удаляем при rollback)
        const tempKeys: string[] = []; // временные ключи (чистятся promote'ом; на всякий случай чистим после)

        try {
            const parsed = composeChangeSetSchema.parse(data);

            if (!parsed.replaceMain) {
                throw new ApiError(
                    'Main document file is required for creation.',
                    400
                );
            }

            if (!isSupportedMime(parsed?.replaceMain?.mimeType)) {
                throw new ApiError('Unsupported main file type', 400);
            }

            const mainMime: SupportedMime = parsed.replaceMain.mimeType;

            const result = await DocumentRepository.interactiveTransaction(
                async tx => {
                    // 1) продвинуть основной
                    if (!parsed.replaceMain)
                        throw new ApiError(
                            'replaceMain is required for creation',
                            400
                        );

                    tempKeys.push(parsed.replaceMain.tempKey);

                    const main = await getFileStorageService().promoteFromTemp(
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
                                throw new ApiError(
                                    'Unsupported attachment type',
                                    400
                                );
                            }

                            const attMime: SupportedMime = att.mimeType;

                            tempKeys.push(att.tempKey);

                            const promotedAtt =
                                await getFileStorageService().promoteFromTemp(
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

                            clientIdToAttachmentId[att.clientId] =
                                newAttachment.id;
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
                                attachmentId ??
                                clientIdToAttachmentId[clientId];

                            if (finalId) {
                                await tx.attachment.update({
                                    where: { id: finalId },
                                    data: { order },
                                });
                            } else {
                                // Эта ситуация не должна возникать при корректном запросе с клиента
                                throw new ApiError(
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
                        throw new ApiError(
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
                        console.log(
                            `[API] Enqueuing job: 'update-content-and-reindex' for documentId: ${doc.id}`
                        );
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
                await getFileStorageService().safeDelete(t);
            }

            return { status: 'ok', ...result };
        } catch (error) {
            for (const key of promoted) {
                await getFileStorageService().safeDelete(key);
            }

            if (error instanceof ApiError) {
                throw error;
            }
            throw new ApiError(
                error instanceof Error
                    ? error.message
                    : 'Unknown compose error',
                500
            );
        }
    }

    /**
     * Обновляет документ.
     * @param documentId - ID документа.
     * @param data - Данные для обновления.
     * @param user - Пользователь.
     * @returns Результат обновления.
     */
    public static async composeUpdateDocument(
        documentId: string,
        data: unknown,
        user: UserResponse
    ) {
        // подготовка списков для компенсаций/очистки
        const promoted: string[] = []; // новые ключи, созданные в процессе (удаляем при rollback)
        const tempKeys: string[] = []; // временные ключи (чистятся promote'ом; на всякий случай чистим после)
        const cleanupOnSuccess: string[] = []; // старые ключи, которые надо удалить после успешного коммита

        try {
            const parsed = composeChangeSetSchema.parse(data);

            const result = DocumentRepository.interactiveTransaction(
                async tx => {
                    // 0) загрузить документ и проверить права
                    const existing = await tx.document.findUnique({
                        where: { id: documentId },
                        select: {
                            id: true,
                            authorId: true,
                            filePath: true,
                            fileName: true,
                            mimeType: true,
                            mainPdf: {
                                select: { id: true, filePath: true },
                            },
                        },
                    });
                    if (!existing) {
                        throw new ApiError('Document not found', 404);
                    }
                    // USER может менять только свои документы
                    if (
                        user.role !== USER_ROLES.ADMIN &&
                        existing.authorId !== user.id
                    ) {
                        throw new ApiError('Forbidden', 403);
                    }

                    // 1) metadata
                    if (parsed.metadata) {
                        const keywords =
                            parsed.metadata.keywords
                                ?.split(',')
                                .map(s => s.trim())
                                .filter(Boolean) ?? undefined;

                        await tx.document.update({
                            where: { id: documentId },
                            data: {
                                title: parsed.metadata.title,
                                description: parsed.metadata.description,
                                keywords,
                                isConfidential: parsed.metadata.isConfidential,
                                isSecret: parsed.metadata.isSecret,
                                accessCodeHash: parsed.metadata.accessCode
                                    ? await hashPassword(
                                          parsed.metadata.accessCode
                                      )
                                    : undefined,
                                categories: parsed.metadata.categoryIds
                                    ? {
                                          deleteMany: {},
                                          create: parsed.metadata.categoryIds.map(
                                              id => ({ categoryId: id })
                                          ),
                                      }
                                    : undefined,
                            },
                        });

                        // Синхронизируем список доступа для конфиденциальных документов
                        if (
                            parsed.metadata.isConfidential &&
                            parsed.metadata.confidentialAccessUserIds
                        ) {
                            await tx.confidentialDocumentAccess.deleteMany({
                                where: { documentId: documentId },
                            });
                            await tx.confidentialDocumentAccess.createMany({
                                data: parsed.metadata.confidentialAccessUserIds.map(
                                    userId => ({
                                        documentId: documentId,
                                        userId: userId,
                                    })
                                ),
                            });
                        } else if (parsed.metadata.isConfidential === false) {
                            // Если документ перестал быть конфиденциальным, чистим список доступа
                            await tx.confidentialDocumentAccess.deleteMany({
                                where: { documentId: documentId },
                            });
                        }
                    }

                    // 2) replaceMain (опционально)
                    if (parsed.replaceMain) {
                        if (!isSupportedMime(parsed.replaceMain.mimeType)) {
                            throw new ApiError(
                                'Unsupported main file type',
                                400
                            );
                        }
                        const mainMime: SupportedMime =
                            parsed.replaceMain.mimeType;
                        tempKeys.push(parsed.replaceMain.tempKey);

                        const promotedMain =
                            await getFileStorageService().promoteFromTemp(
                                parsed.replaceMain.tempKey,
                                STORAGE_BASE_PATHS.ORIGINAL
                            );
                        promoted.push(promotedMain.key);

                        // пометим старый mainPdf на удаление после успеха
                        if (existing.mainPdf?.filePath) {
                            cleanupOnSuccess.push(existing.mainPdf.filePath);
                        }

                        // обновить поля документа (оригинал)
                        await tx.document.update({
                            where: { id: documentId },
                            data: {
                                filePath: promotedMain.key,
                                fileName: parsed.replaceMain.originalName,
                                fileSize: promotedMain.size,
                                mimeType: mainMime,
                            },
                        });
                    }

                    const clientIdToAttachmentId: Record<string, string> = {};

                    // 3) addAttachments (опционально)
                    if (parsed.addAttachments?.length) {
                        for (const att of parsed.addAttachments) {
                            if (!isSupportedMime(att.mimeType)) {
                                throw new ApiError(
                                    'Unsupported attachment type',
                                    400
                                );
                            }
                            const attMime: SupportedMime = att.mimeType;
                            tempKeys.push(att.tempKey);

                            const promotedAtt =
                                await getFileStorageService().promoteFromTemp(
                                    att.tempKey,
                                    STORAGE_BASE_PATHS.ATTACHMENTS
                                );
                            promoted.push(promotedAtt.key);

                            const newAttachment = await tx.attachment.create({
                                data: {
                                    documentId,
                                    fileName: att.originalName,
                                    fileSize: promotedAtt.size,
                                    mimeType: attMime,
                                    filePath: promotedAtt.key,
                                    order: -1,
                                },
                            });

                            clientIdToAttachmentId[att.clientId] =
                                newAttachment.id;
                        }
                    }

                    // 4) deleteAttachmentIds (опционально)
                    if (parsed.deleteAttachmentIds?.length) {
                        const toDelete = await tx.attachment.findMany({
                            where: {
                                id: { in: parsed.deleteAttachmentIds },
                                documentId,
                            },
                            select: { id: true, filePath: true },
                        });
                        for (const a of toDelete) {
                            if (a.filePath) cleanupOnSuccess.push(a.filePath);
                        }
                        await tx.attachment.deleteMany({
                            where: {
                                id: { in: parsed.deleteAttachmentIds },
                                documentId,
                            },
                        });
                    }

                    // 5) reorder (опционально)
                    if (parsed.reorder?.length) {
                        const existingIdsFromClient = parsed.reorder
                            .map(item => item.attachmentId)
                            .filter((id): id is string => !!id);

                        if (existingIdsFromClient.length > 0) {
                            const foundAttachments =
                                await tx.attachment.findMany({
                                    where: {
                                        id: { in: existingIdsFromClient },
                                        documentId: documentId,
                                    },
                                    select: { id: true },
                                });

                            if (
                                foundAttachments.length !==
                                existingIdsFromClient.length
                            ) {
                                throw new ApiError(
                                    'Stale data: One or more attachments to reorder do not exist.'
                                );
                            }
                        }

                        for (const {
                            attachmentId,
                            clientId,
                            order,
                        } of parsed.reorder) {
                            const finalId =
                                attachmentId ??
                                clientIdToAttachmentId[clientId];

                            if (finalId) {
                                await tx.attachment.update({
                                    where: { id: finalId },
                                    data: { order },
                                });
                            } else {
                                // Эта ситуация не должна возникать при корректном запросе с клиента
                                throw new ApiError(
                                    `[compose/commit] Reorder failed: could not find attachmentId for clientId ${clientId}`
                                );
                            }
                        }
                    }

                    // 6) собрать список приложений и пересобрать PDF
                    const doc = await tx.document.findUnique({
                        where: { id: documentId },
                        select: {
                            id: true,
                            filePath: true,
                            fileName: true,
                            mimeType: true,
                            mainPdf: {
                                select: { id: true, filePath: true },
                            },
                        },
                    });
                    if (!doc) {
                        throw new ApiError(
                            'Document disappeared during transaction'
                        );
                    }

                    const attachments = await tx.attachment.findMany({
                        where: { documentId },
                        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
                    });

                    // только валидные MIME берём в сборку
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
                            mainDocumentMimeType: doc.mimeType as SupportedMime,
                            attachments: valid,
                        },
                        doc.fileName
                    );

                    if (!pdf.success || !pdf.combinedPdfKey) {
                        throw new ApiError(
                            pdf.error || 'Failed to build combined PDF'
                        );
                    }

                    // записать новый mainPdf и снять старый
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
                    if (doc.mainPdf?.id) {
                        await tx.convertedDocument.delete({
                            where: { id: doc.mainPdf.id },
                        });
                    }
                    if (doc.mainPdf?.filePath) {
                        cleanupOnSuccess.push(doc.mainPdf.filePath);
                    }

                    // ===== ИНДЕКСАЦИЯ (в фоне) =====
                    const hasFileChanges =
                        !!parsed.replaceMain ||
                        !!parsed.addAttachments?.length ||
                        !!parsed.deleteAttachmentIds?.length;

                    // Ставим задачу в очередь для фоновой переиндексации
                    if (doc.id) {
                        if (hasFileChanges) {
                            // Если менялся состав файлов, запускаем полную пересборку контента
                            console.log(
                                `[API] Enqueuing job: 'update-content-and-reindex' for documentId: ${doc.id}`
                            );
                            await indexingQueue.add(
                                'update-content-and-reindex',
                                {
                                    documentId: doc.id,
                                }
                            );
                        } else {
                            // Если менялись только метаданные, достаточно простой переиндексации
                            console.log(
                                `[API] Enqueuing job: 'index-document' for documentId: ${doc.id}`
                            );
                            await indexingQueue.add('index-document', {
                                documentId: doc.id,
                            });
                        }
                    }
                    return { docId: doc.id };
                },
                {
                    timeout: 60000,
                    maxWait: 30000,
                }
            );

            // финализация (после коммита): удалить старые файлы и любые temp
            for (const key of cleanupOnSuccess) {
                await getFileStorageService().safeDelete(key);
            }
            for (const t of tempKeys) {
                await getFileStorageService().safeDelete(t);
            }

            return { status: 'ok', ...result };
        } catch (error) {
            // компенсации: удалить все продвинутые ключи

            console.warn(
                '[compose/update] rolling back promoted files due to error'
            );

            for (const key of promoted) {
                await getFileStorageService().safeDelete(key);
            }

            if (error instanceof ApiError) {
                throw error;
            }
            throw new ApiError(
                error instanceof Error
                    ? error.message
                    : 'Unknown compose error',
                500
            );
        }
    }
}
