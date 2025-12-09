import { STORAGE_BASE_PATHS } from '@/constants/app'
import { ACTION_TYPE, TARGET_TYPE } from '@/constants/audit-log'
import { USER_ROLES } from '@/constants/user'
import { ApiError } from '@/lib/api/errors'
import { auditLogService, documentRepository } from '@/lib/container'
import { indexingQueue } from '@/lib/queues/indexing'
import type { UpdatedDetails } from '@/lib/types/audit-log'
import type { ComposeChangeSet } from '@/lib/types/compose'
import type { SupportedMime } from '@/lib/types/mime'
import type { UserResponse } from '@/lib/types/user'
import { hashPassword } from '@/utils/auth'
import { isSupportedMime } from '@/utils/mime'
import { getFileStorageService } from '../FileStorageService'
import { pdfCombiner } from '../PDFCombiner'

// TODO: подумать над декомпозицией
/**
 * DocumentComposeService будет инкапсулировать сложную логику
 * по "сборке" или композиции документов из разных частей.
 */
export class DocumentComposeService {
    /**
     * Создает документ.
     * @param data - Данные для создания.
     * @param creator - Пользователь.
     * @param authorId - ID автора.
     * @returns Результат создания.
     */
    public static async composeCreateDocument(
        data: ComposeChangeSet,
        creator: UserResponse,
        authorId: string
    ) {
        // подготовка списков для компенсаций/очистки
        const promoted: string[] = [] // новые ключи, созданные в процессе (удаляем при rollback)
        const tempKeys: string[] = [] // временные ключи (чистятся promote'ом; на всякий случай чистим после)

        try {
            if (!data.replaceMain) {
                throw new ApiError(
                    'Main document file is required for creation.',
                    400
                )
            }

            if (!isSupportedMime(data?.replaceMain?.mimeType)) {
                throw new ApiError('Unsupported main file type', 400)
            }

            const mainMime: SupportedMime = data.replaceMain.mimeType

            const result = await documentRepository.interactiveTransaction(
                async (_txRepo, txClient) => {
                    // 1) продвинуть основной
                    if (!data.replaceMain)
                        throw new ApiError(
                            'replaceMain is required for creation',
                            400
                        )

                    tempKeys.push(data.replaceMain.tempKey)

                    const main = await getFileStorageService().promoteFromTemp(
                        data.replaceMain.tempKey,
                        STORAGE_BASE_PATHS.ORIGINAL
                    )

                    promoted.push(main.key)

                    // 2) создать документ
                    const doc = await txClient.document.create({
                        data: {
                            title:
                                data.metadata?.title ??
                                data.replaceMain.fileName,
                            description: data.metadata?.description ?? null,
                            content: '', // будет заполнено воркером
                            filePath: main.key,
                            fileName: data.replaceMain.fileName,
                            fileSize: main.size,
                            mimeType: mainMime,
                            hash: (await import('node:crypto'))
                                .createHash('sha256')
                                .update(main.key)
                                .digest('hex'),
                            isPublished: true,
                            authorId: authorId,
                            creatorId: creator.id,
                            isConfidential:
                                data.metadata?.isConfidential ?? false,
                            isSecret: data.metadata?.isSecret ?? false,
                            accessCodeHash: data.metadata?.accessCode
                                ? await hashPassword(data.metadata.accessCode)
                                : null,
                            keywords: data.metadata?.keywords
                                ? data.metadata.keywords
                                      .split(',')
                                      .map(s => s.trim())
                                      .filter(Boolean)
                                : [],
                            categories: data.metadata?.categoryIds
                                ? {
                                      create: data.metadata.categoryIds.map(
                                          id => ({
                                              categoryId: id,
                                          })
                                      ),
                                  }
                                : undefined,
                        },
                        include: {
                            author: true,
                            creator: true,
                            categories: { include: { category: true } },
                        },
                    })

                    // Создаем записи в списке доступа, если документ конфиденциальный
                    if (
                        doc.isConfidential &&
                        data.metadata?.confidentialAccessUserIds?.length
                    ) {
                        await txClient.confidentialDocumentAccess.createMany({
                            data: data.metadata.confidentialAccessUserIds.map(
                                userId => ({
                                    documentId: doc.id,
                                    userId: userId,
                                })
                            ),
                        })
                    }

                    const clientIdToAttachmentId: Record<string, string> = {}

                    // 3) приложения
                    if (data.addAttachments?.length) {
                        for (const att of data.addAttachments) {
                            if (!isSupportedMime(att.mimeType)) {
                                throw new ApiError(
                                    'Unsupported attachment type',
                                    400
                                )
                            }

                            const attMime: SupportedMime = att.mimeType

                            tempKeys.push(att.tempKey)

                            const promotedAtt =
                                await getFileStorageService().promoteFromTemp(
                                    att.tempKey,
                                    STORAGE_BASE_PATHS.ATTACHMENTS
                                )

                            promoted.push(promotedAtt.key)

                            const newAttachment =
                                await txClient.attachment.create({
                                    data: {
                                        documentId: doc.id,
                                        fileName: att.fileName,
                                        fileSize: promotedAtt.size,
                                        mimeType: attMime,
                                        filePath: promotedAtt.key,
                                        order: -1,
                                    },
                                })

                            clientIdToAttachmentId[att.clientId] =
                                newAttachment.id
                        }
                    }

                    // Применяем порядок для ВСЕХ приложений
                    if (data.reorder?.length) {
                        for (const {
                            attachmentId,
                            clientId,
                            order,
                        } of data.reorder) {
                            const finalId =
                                attachmentId ?? clientIdToAttachmentId[clientId]

                            if (finalId) {
                                await txClient.attachment.update({
                                    where: { id: finalId },
                                    data: { order },
                                })
                            } else {
                                // Эта ситуация не должна возникать при корректном запросе с клиента
                                throw new ApiError(
                                    `[compose/commit] Reorder failed: could not find attachmentId for clientId ${clientId}`
                                )
                            }
                        }
                    }

                    // 4) сборка PDF
                    const attachments = await txClient.attachment.findMany({
                        where: { documentId: doc.id },
                        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
                    })

                    const valid = attachments
                        .filter(a => isSupportedMime(a.mimeType))
                        .map((a, idx) => ({
                            id: a.id,
                            filePath: a.filePath,
                            fileName: a.fileName,
                            mimeType: a.mimeType as SupportedMime,
                            order: idx,
                        }))

                    const pdf = await pdfCombiner.combineWithAttachments(
                        {
                            mainDocumentPath: doc.filePath,
                            mainDocumentMimeType: mainMime,
                            attachments: valid,
                        },
                        doc.fileName
                    )

                    if (!pdf.success || !pdf.combinedPdfKey) {
                        throw new ApiError(
                            pdf.error || 'Failed to build combined PDF'
                        )
                    }

                    // запись основной PDF
                    const conv = await txClient.convertedDocument.create({
                        data: {
                            documentId: doc.id,
                            conversionType: 'PDF',
                            filePath: pdf.combinedPdfKey,
                            fileSize: pdf.fileSize ?? 0,
                            originalFile: doc.filePath,
                        },
                    })

                    await txClient.document.update({
                        where: { id: doc.id },
                        data: { mainPdfId: conv.id },
                    })

                    // 5) ИНДЕКСАЦИЯ (в фоне)
                    // Ставим задачу на полную пересборку контента и последующую индексацию
                    if (doc.id) {
                        console.log(
                            `[API] Enqueuing job: 'update-content-and-reindex' for documentId: ${doc.id}`
                        )
                        await indexingQueue.add('update-content-and-reindex', {
                            documentId: doc.id,
                        })
                    }

                    await auditLogService.log(
                        {
                            userId: creator.id, // ID создателя (actor)
                            action: ACTION_TYPE.DOCUMENT_CREATED,
                            targetId: doc.id,
                            targetType: TARGET_TYPE.DOCUMENT,
                            details: {
                                documentId: doc.id,
                                documentName: doc.title,
                                categoryIds: doc.categories.map(
                                    c => c.categoryId
                                ),
                                categoryNames: doc.categories.map(
                                    c => c.category.name
                                ),
                                authorId: doc.authorId,
                                authorName: doc.author.username,
                            },
                        },
                        txClient
                    )

                    return doc
                },
                {
                    timeout: 60000,
                    maxWait: 30000,
                }
            )

            // финализация (после коммита): удалить старые файлы и любые temp
            for (const t of tempKeys) {
                await getFileStorageService().safeDelete(t)
            }

            return { docId: result.id }
        } catch (error) {
            for (const key of promoted) {
                await getFileStorageService().safeDelete(key)
            }

            if (error instanceof ApiError) {
                throw error
            }
            throw new ApiError(
                error instanceof Error
                    ? error.message
                    : 'Unknown compose error',
                500
            )
        }
    }

    /**
     * Обновляет документ.
     * @param documentId - ID документа.
     * @param data - Данные для обновления.
     * @param usere - Пользователь.
     * @param authorId - ID автора.
     * @returns Результат обновления.
     */
    public static async composeUpdateDocument(
        documentId: string,
        data: ComposeChangeSet,
        user: UserResponse,
        authorId: string | undefined
    ) {
        // подготовка списков для компенсаций/очистки
        const promoted: string[] = [] // новые ключи, созданные в процессе (удаляем при rollback)
        const tempKeys: string[] = [] // временные ключи (чистятся promote'ом; на всякий случай чистим после)
        const cleanupOnSuccess: string[] = [] // старые ключи, которые надо удалить после успешного коммита

        try {
            const result = await documentRepository.interactiveTransaction(
                async (_txRepo, txClient) => {
                    const existing = await txClient.document.findUnique({
                        where: { id: documentId },
                        include: {
                            categories: true,
                            mainPdf: true,
                            attachments: true,
                        },
                    })

                    if (!existing) {
                        throw new ApiError('Document not found', 404)
                    }

                    // USER может менять только свои документы
                    if (
                        user.role !== USER_ROLES.ADMIN &&
                        existing.authorId !== user.id &&
                        existing.creatorId !== user.id
                    ) {
                        throw new ApiError('Forbidden', 403)
                    }

                    // 1) metadata
                    if (data?.metadata) {
                        const keywords =
                            data.metadata.keywords
                                ?.split(',')
                                .map(s => s.trim())
                                .filter(Boolean) ?? undefined

                        await txClient.document.update({
                            where: { id: documentId },
                            data: {
                                title: data.metadata.title,
                                description: data.metadata.description,
                                keywords,
                                authorId: authorId,
                                isConfidential: data.metadata.isConfidential,
                                isSecret: data.metadata.isSecret,
                                accessCodeHash: data.metadata.accessCode
                                    ? await hashPassword(
                                          data.metadata.accessCode
                                      )
                                    : undefined,
                                categories: data.metadata.categoryIds
                                    ? {
                                          deleteMany: {},
                                          create: data.metadata.categoryIds.map(
                                              id => ({ categoryId: id })
                                          ),
                                      }
                                    : undefined,
                            },
                        })

                        // Синхронизируем список доступа для конфиденциальных документов
                        if (
                            data.metadata.isConfidential &&
                            data.metadata.confidentialAccessUserIds
                        ) {
                            await txClient.confidentialDocumentAccess.deleteMany(
                                {
                                    where: { documentId: documentId },
                                }
                            )
                            await txClient.confidentialDocumentAccess.createMany(
                                {
                                    data: data.metadata.confidentialAccessUserIds.map(
                                        userId => ({
                                            documentId: documentId,
                                            userId: userId,
                                        })
                                    ),
                                }
                            )
                        } else if (data.metadata.isConfidential === false) {
                            // Если документ перестал быть конфиденциальным, чистим список доступа
                            await txClient.confidentialDocumentAccess.deleteMany(
                                {
                                    where: { documentId: documentId },
                                }
                            )
                        }
                    }

                    // 2) replaceMain (опционально)
                    if (data?.replaceMain) {
                        if (!isSupportedMime(data.replaceMain.mimeType)) {
                            throw new ApiError(
                                'Unsupported main file type',
                                400
                            )
                        }
                        const mainMime: SupportedMime =
                            data.replaceMain.mimeType
                        tempKeys.push(data.replaceMain.tempKey)

                        const promotedMain =
                            await getFileStorageService().promoteFromTemp(
                                data.replaceMain.tempKey,
                                STORAGE_BASE_PATHS.ORIGINAL
                            )
                        promoted.push(promotedMain.key)

                        // обновить поля документа (оригинал)
                        await txClient.document.update({
                            where: { id: documentId },
                            data: {
                                filePath: promotedMain.key,
                                fileName: data.replaceMain.fileName,
                                fileSize: promotedMain.size,
                                mimeType: mainMime,
                                authorId: authorId,
                            },
                        })
                    }

                    const clientIdToAttachmentId: Record<string, string> = {}

                    // 3) addAttachments (опционально)
                    if (data?.addAttachments?.length) {
                        for (const att of data.addAttachments) {
                            if (!isSupportedMime(att.mimeType)) {
                                throw new ApiError(
                                    'Unsupported attachment type',
                                    400
                                )
                            }
                            const attMime: SupportedMime = att.mimeType
                            tempKeys.push(att.tempKey)

                            const promotedAtt =
                                await getFileStorageService().promoteFromTemp(
                                    att.tempKey,
                                    STORAGE_BASE_PATHS.ATTACHMENTS
                                )
                            promoted.push(promotedAtt.key)

                            const newAttachment =
                                await txClient.attachment.create({
                                    data: {
                                        documentId,
                                        fileName: att.fileName,
                                        fileSize: promotedAtt.size,
                                        mimeType: attMime,
                                        filePath: promotedAtt.key,
                                        order: -1,
                                    },
                                })

                            clientIdToAttachmentId[att.clientId] =
                                newAttachment.id
                        }
                    }

                    // 4) deleteAttachmentIds (опционально)
                    if (data?.deleteAttachmentIds?.length) {
                        console.log(
                            '[DEBUG] Attachment Deletion: Received IDs to delete:',
                            data.deleteAttachmentIds
                        )
                        const toDelete = await txClient.attachment.findMany({
                            where: {
                                id: { in: data.deleteAttachmentIds },
                                documentId,
                            },
                            select: { id: true, filePath: true },
                        })
                        console.log(
                            '[DEBUG] Attachment Deletion: Found attachments in DB:',
                            toDelete
                        )
                        for (const a of toDelete) {
                            if (a.filePath) cleanupOnSuccess.push(a.filePath)
                        }
                        await txClient.attachment.deleteMany({
                            where: {
                                id: { in: data.deleteAttachmentIds },
                                documentId,
                            },
                        })
                    }

                    // 5) reorder (опционально)
                    if (data?.reorder?.length) {
                        const existingIdsFromClient = data.reorder
                            .map(item => item.attachmentId)
                            .filter((id): id is string => !!id)

                        if (existingIdsFromClient.length > 0) {
                            const foundAttachments =
                                await txClient.attachment.findMany({
                                    where: {
                                        id: { in: existingIdsFromClient },
                                        documentId: documentId,
                                    },
                                    select: { id: true },
                                })

                            if (
                                foundAttachments.length !==
                                existingIdsFromClient.length
                            ) {
                                throw new ApiError(
                                    'Stale data: One or more attachments to reorder do not exist.'
                                )
                            }
                        }

                        for (const {
                            attachmentId,
                            clientId,
                            order,
                        } of data.reorder) {
                            const finalId =
                                attachmentId ?? clientIdToAttachmentId[clientId]

                            if (finalId) {
                                await txClient.attachment.update({
                                    where: { id: finalId },
                                    data: { order },
                                })
                            } else {
                                // Эта ситуация не должна возникать при корректном запросе с клиента
                                throw new ApiError(
                                    `[compose/commit] Reorder failed: could not find attachmentId for clientId ${clientId}`
                                )
                            }
                        }
                    }

                    // 6) собрать список приложений и пересобрать PDF
                    const doc = await txClient.document.findUnique({
                        where: { id: documentId },
                        select: {
                            id: true,
                            filePath: true,
                            fileName: true,
                            mimeType: true,
                            mainPdf: {
                                select: { id: true, filePath: true },
                            },
                            categories: {
                                select: { categoryId: true },
                            },
                            title: true,
                            description: true,
                            authorId: true,
                            isConfidential: true,
                            isSecret: true,
                            keywords: true,
                            confidentialAccessUsers: true,
                            attachments: true,
                        },
                    })
                    if (!doc) {
                        throw new ApiError(
                            'Document disappeared during transaction'
                        )
                    }

                    const attachments = await txClient.attachment.findMany({
                        where: { documentId },
                        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
                    })

                    // только валидные MIME берём в сборку
                    const valid = attachments
                        .filter(a => isSupportedMime(a.mimeType))
                        .map((a, idx) => ({
                            id: a.id,
                            filePath: a.filePath,
                            fileName: a.fileName,
                            mimeType: a.mimeType as SupportedMime,
                            order: idx,
                        }))

                    const pdf = await pdfCombiner.combineWithAttachments(
                        {
                            mainDocumentPath: doc.filePath,
                            mainDocumentMimeType: doc.mimeType as SupportedMime,
                            attachments: valid,
                        },
                        doc.fileName
                    )

                    if (!pdf.success || !pdf.combinedPdfKey) {
                        throw new ApiError(
                            pdf.error || 'Failed to build combined PDF'
                        )
                    }

                    // записать новый mainPdf и снять старый
                    const conv = await txClient.convertedDocument.create({
                        data: {
                            documentId: doc.id,
                            conversionType: 'PDF',
                            filePath: pdf.combinedPdfKey,
                            fileSize: pdf.fileSize ?? 0,
                            originalFile: doc.filePath,
                        },
                    })
                    await txClient.document.update({
                        where: { id: doc.id },
                        data: { mainPdfId: conv.id },
                    })
                    // Используем `existing` для получения информации о старом PDF
                    if (existing.mainPdf?.id) {
                        await txClient.convertedDocument.delete({
                            where: { id: existing.mainPdf.id },
                        })
                    }
                    if (existing.mainPdf?.filePath) {
                        cleanupOnSuccess.push(existing.mainPdf.filePath)
                    }

                    // ===== ИНДЕКСАЦИЯ (в фоне) =====
                    const hasFileChanges =
                        !!data.replaceMain ||
                        !!data.addAttachments?.length ||
                        !!data.deleteAttachmentIds?.length

                    // Ставим задачу в очередь для фоновой переиндексации
                    if (doc.id) {
                        if (hasFileChanges) {
                            // Если менялся состав файлов, запускаем полную пересборку контента
                            console.log(
                                `[API] Enqueuing job: 'update-content-and-reindex' for documentId: ${doc.id}`
                            )
                            await indexingQueue.add(
                                'update-content-and-reindex',
                                {
                                    documentId: doc.id,
                                }
                            )
                        } else {
                            // Если менялись только метаданные, достаточно простой переиндексации
                            console.log(
                                `[API] Enqueuing job: 'index-document' for documentId: ${doc.id}`
                            )
                            await indexingQueue.add('index-document', {
                                documentId: doc.id,
                            })
                        }
                    }

                    // --- Логирование изменений ---
                    const changes: UpdatedDetails[] = []

                    // 1. Сравнение метаданных
                    if (data?.metadata) {
                        if (
                            data.metadata?.title &&
                            data.metadata?.title !== existing.title
                        ) {
                            changes.push({
                                field: 'title',
                                oldValue: existing.title,
                                newValue: doc.title,
                            })
                        }
                        if (
                            data.metadata?.description &&
                            data.metadata?.description !== existing.description
                        ) {
                            changes.push({
                                field: 'description',
                                oldValue: existing.description,
                                newValue: doc.description,
                            })
                        }
                        if (authorId && authorId !== existing.authorId) {
                            changes.push({
                                field: 'authorId',
                                oldValue: existing.authorId,
                                newValue: authorId,
                            })
                        }
                        if (
                            data?.metadata?.keywords &&
                            data?.metadata?.keywords.trim() !==
                                existing.keywords.join(',').trim()
                        ) {
                            changes.push({
                                field: '',
                                oldValue: existing?.keywords.join('|'),
                                newValue: doc?.keywords.join('|'),
                            })
                        }

                        // Сравнение категорий
                        if (data.metadata?.categoryIds) {
                            const oldCategoryIds = existing.categories
                                .map(c => c.categoryId)
                                .sort()
                            const newCategoryIds = (
                                data.metadata?.categoryIds || []
                            ).sort()
                            if (
                                JSON.stringify(oldCategoryIds) !==
                                JSON.stringify(newCategoryIds)
                            ) {
                                changes.push({
                                    field: 'categories',
                                    oldValue: oldCategoryIds,
                                    newValue: newCategoryIds,
                                })
                            }
                        }
                    }

                    // 2. Логирование замены основного файла
                    if (data?.replaceMain) {
                        changes.push({
                            field: 'mainFile',
                            oldValue: existing.fileName,
                            newValue: data?.replaceMain?.fileName,
                        })
                    }

                    // 3. Логирование добавленных вложений
                    if (
                        data?.addAttachments &&
                        data?.addAttachments?.length > 0
                    ) {
                        changes.push({
                            field: 'attachmentsAdded',
                            newValue: data?.addAttachments?.map(
                                a => a.fileName
                            ),
                        })
                    }

                    // 4. Логирование удаленных вложений
                    if (
                        data?.deleteAttachmentIds &&
                        data?.deleteAttachmentIds?.length > 0
                    ) {
                        const deletedAttachmentNames = existing.attachments
                            .filter(att =>
                                data.deleteAttachmentIds?.includes(att.id)
                            )
                            .map(att => att.fileName)
                        changes.push({
                            field: 'attachmentsDeleted',
                            oldValue: deletedAttachmentNames,
                        })
                    }

                    // 5. Логирование изменения порядка
                    if (data?.reorder && data?.reorder?.length > 0) {
                        changes.push({
                            field: 'attachmentsReordered',
                            newValue: true,
                        })
                    }

                    // Финальный вызов сервиса логирования, если были изменения
                    if (changes.length > 0) {
                        await auditLogService.log(
                            {
                                userId: user.id,
                                action: ACTION_TYPE.DOCUMENT_UPDATED,
                                targetId: documentId,
                                targetType: TARGET_TYPE.DOCUMENT,
                                details: {
                                    documentId: documentId,
                                    documentName: doc.title,
                                    changes,
                                },
                            },
                            txClient
                        )
                    }

                    return doc
                },
                {
                    timeout: 60000,
                    maxWait: 30000,
                }
            )

            // финализация (после коммита): удалить старые файлы и любые temp
            for (const key of cleanupOnSuccess) {
                await getFileStorageService().safeDelete(key)
            }
            for (const t of tempKeys) {
                await getFileStorageService().safeDelete(t)
            }

            return { docId: result.id }
        } catch (error) {
            // компенсации: удалить все продвинутые ключи
            console.warn(
                '[compose/update] rolling back promoted files due to error'
            )

            for (const key of promoted) {
                await getFileStorageService().safeDelete(key)
            }

            if (error instanceof ApiError) {
                throw error
            }
            throw new ApiError(
                error instanceof Error
                    ? error.message
                    : 'Unknown compose error',
                500
            )
        }
    }
}
