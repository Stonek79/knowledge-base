import { unlink } from 'node:fs/promises'
import { isAbsolute } from 'node:path'

import { ACTION_TYPE, TARGET_TYPE } from '@/constants/audit-log'
import { USER_ROLES } from '@/constants/user'
import type { DocumentProcessor } from '@/core/documents/DocumentProcessor'
import { ApiError } from '@/lib/api/errors'
import { indexingQueue } from '@/lib/queues/indexing'
import type { DocumentRepositoryV2 } from '@/lib/repositories/DocumentRepositoryV2'
import type { AuditLogServiceV2 } from '@/lib/services/AuditLogServiceV2'
import type { FileStorageService } from '@/lib/services/FileStorageService'
import type { SettingsService } from '@/lib/services/SettingsService'
import type { UpdatedDetails } from '@/lib/types/audit-log'
import type {
    CreateDocumentServiceData,
    UpdateDocumentData,
} from '@/lib/types/document'
import type { SupportedMime } from '@/lib/types/mime'
import type { Prisma } from '@/lib/types/prisma'
import type { UserResponse } from '@/lib/types/user'
import { FileUtils } from '@/utils/files'
import { isSupportedMime, mimeMapper } from '@/utils/mime'

/**
 * DocumentServiceV2 инкапсулирует логику для изменения документов.
 * Использует DI.
 */
export class DocumentServiceV2 {
    constructor(
        private docRepo: DocumentRepositoryV2,
        private auditService: AuditLogServiceV2,
        private storageService: FileStorageService,
        private settingsService: SettingsService,
        private processor: DocumentProcessor
    ) {}

    /**
     * Создает новый документ на основе загруженных данных.
     */
    async createDocument(data: CreateDocumentServiceData, user: UserResponse) {
        let createdFileKey: string | null = null
        let createdPdfKey: string | null = null

        try {
            if (user.role === USER_ROLES.GUEST) {
                throw new ApiError('Forbidden', 403)
            }

            const {
                file,
                authorId,
                creatorId,
                title,
                description,
                categoryIds,
                keywords,
            } = data

            if (
                !authorId ||
                (user.id !== authorId && user.role !== USER_ROLES.ADMIN)
            ) {
                throw new ApiError(
                    'Вы можете загружать документы только для себя',
                    403
                )
            }

            const [maxFileSize, allowedMimeTypes] = await Promise.all([
                this.settingsService.getMaxFileSize(),
                this.settingsService.getAllowedMimeTypes(),
            ])

            if (!file || !(file instanceof File)) {
                throw new ApiError('Файл не найден', 400)
            }

            if (
                !allowedMimeTypes.includes(file.type) ||
                !isSupportedMime(file.type)
            ) {
                throw new ApiError('Unsupported file type', 415)
            }
            const mime: SupportedMime = file.type

            const buffer = Buffer.from(await file.arrayBuffer())
            if (buffer.byteLength > maxFileSize) {
                throw new ApiError(
                    `Файл слишком большой. Макс. ${Math.round(
                        maxFileSize / (1024 * 1024)
                    )}MB`,
                    413
                )
            }

            const fileValidation = await FileUtils.validateFile(buffer, mime)
            if (!fileValidation.valid) {
                throw new ApiError(
                    fileValidation.error || 'Ошибка валидации данных',
                    400
                )
            }

            const hash = await FileUtils.generateFileHash(buffer)
            const existingDocument = await this.docRepo.findUnique({
                where: { hash },
            })
            if (existingDocument) {
                throw new ApiError(
                    'Документ с таким содержимым уже существует',
                    409
                )
            }

            const processed = await this.processor.processUpload(
                buffer,
                mime,
                file.name,
                {
                    enableOcr: true,
                }
            )

            const filePath =
                processed.storage?.originalKey ?? processed.original.path
            createdFileKey = processed.storage?.originalKey ?? null
            createdPdfKey = processed.storage?.pdfKey ?? null

            const newDocument = await this.docRepo.interactiveTransaction(
                async (txRepo, txClient) => {
                    const doc = await txRepo.create({
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
                            creatorId: creatorId,
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
                    })

                    await this.auditService.log(
                        {
                            userId: user.id,
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

                    if (processed.storage?.pdfKey) {
                        const conv = await txRepo.createConvertedDocument({
                            data: {
                                documentId: doc.id,
                                conversionType: 'PDF',
                                filePath: processed.storage.pdfKey,
                                fileSize: (
                                    await this.storageService.getFileInfo(
                                        processed.storage.pdfKey
                                    )
                                ).size,
                                originalFile: filePath,
                            },
                        })
                        await txRepo.update({
                            where: { id: doc.id },
                            data: { mainPdfId: conv.id },
                        })
                    }

                    return doc
                }
            )

            await indexingQueue.add('index-document', {
                documentId: newDocument.id,
            })

            return newDocument
        } catch (error) {
            if (createdPdfKey) {
                void this.storageService.deleteDocument(createdPdfKey)
            }
            if (createdFileKey) {
                void this.storageService.deleteDocument(createdFileKey)
            }
            throw error
        }
    }

    /**
     * Обновляет метаданные документа.
     */
    async updateDocument(
        id: string,
        data: UpdateDocumentData,
        user: UserResponse,
        authorId: string | undefined
    ) {
        const updatedDocument = await this.docRepo.interactiveTransaction(
            async (txRepo, txClient) => {
                const documentBeforeUpdate = await txRepo.findUnique({
                    where: { id },
                    select: {
                        title: true,
                        description: true,
                        authorId: true,
                        creatorId: true,
                        categories: {
                            select: {
                                categoryId: true,
                            },
                        },
                    },
                })

                if (!documentBeforeUpdate) {
                    throw new ApiError('Документ не найден', 404)
                }

                if (
                    user.role !== USER_ROLES.ADMIN &&
                    user.role === USER_ROLES.USER &&
                    documentBeforeUpdate.authorId !== user.id &&
                    documentBeforeUpdate.creatorId !== user.id
                ) {
                    throw new ApiError(
                        'Можно редактировать только свои документы',
                        403
                    )
                }

                const doc = await txRepo.update({
                    where: { id },
                    data: {
                        title: data.title,
                        description: data.description,
                        keywords:
                            data.keywords
                                ?.split(',')
                                .map(s => s.trim())
                                .filter(Boolean) || undefined,
                        authorId: authorId,
                        categories: data.categoryIds
                            ? {
                                  deleteMany: {},
                                  create: data.categoryIds.map(categoryId => ({
                                      categoryId,
                                  })),
                              }
                            : undefined,
                    },
                    include: {
                        author: true,
                        creator: true,
                        categories: { include: { category: true } },
                    },
                })

                const changes: UpdatedDetails[] = []

                if (data.title && data.title !== documentBeforeUpdate.title) {
                    changes.push({
                        field: 'title',
                        oldValue: documentBeforeUpdate.title,
                        newValue: data.title,
                    })
                }
                if (
                    data.description &&
                    data.description !== documentBeforeUpdate.description
                ) {
                    changes.push({
                        field: 'description',
                        oldValue: documentBeforeUpdate.description,
                        newValue: data.description,
                    })
                }
                if (authorId && authorId !== documentBeforeUpdate.authorId) {
                    changes.push({
                        field: 'authorId',
                        oldValue: documentBeforeUpdate.authorId,
                        newValue: authorId,
                    })
                }

                const oldCategoryIds = documentBeforeUpdate?.categories
                    .map(c => c.categoryId)
                    .sort()
                const newCategoryIds = (data.categoryIds || []).sort()
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

                if (changes.length > 0) {
                    await this.auditService.log(
                        {
                            userId: user.id,
                            action: ACTION_TYPE.DOCUMENT_UPDATED,
                            targetId: id,
                            targetType: TARGET_TYPE.DOCUMENT,
                            details: {
                                changes,
                                documentId: id,
                                documentName: doc.title,
                            },
                        },
                        txClient
                    )
                }

                return doc
            }
        )

        await indexingQueue.add('index-document', {
            documentId: updatedDocument.id,
        })

        return updatedDocument
    }

    /**
     * "Мягко" удаляет документ.
     */
    async softDeleteDocument(id: string, user: UserResponse) {
        await this.docRepo.interactiveTransaction(async (txRepo, txClient) => {
            const document = await txRepo.findUnique({
                where: { id },
                select: {
                    title: true,
                    authorId: true,
                    creatorId: true,
                },
            })

            if (!document) {
                throw new ApiError('Документ не найден', 404)
            }

            if (
                document.authorId !== user.id &&
                document.creatorId !== user.id &&
                user.role !== USER_ROLES.ADMIN
            ) {
                throw new ApiError(
                    'Вы можете удалять только свои документы',
                    403
                )
            }

            await this.auditService.log(
                {
                    userId: user.id,
                    action: ACTION_TYPE.DOCUMENT_DELETED_SOFT,
                    targetId: id,
                    targetType: TARGET_TYPE.DOCUMENT,
                    details: {
                        documentId: id,
                        documentName: document.title,
                    },
                },
                txClient
            )

            await txRepo.update({
                where: { id },
                data: {
                    deletedAt: new Date(),
                    viewCount: 0,
                    isPublished: false,
                },
            })
        })

        await indexingQueue.add('remove-from-index', { documentId: id })
    }

    /**
     * **Безвозвратно** удаляет документ.
     */
    async hardDeleteDocument(id: string, user: UserResponse) {
        const fileKeys: string[] = []
        await this.docRepo.interactiveTransaction(async (txRepo, txClient) => {
            const snapshot = await txRepo.findUnique({
                where: { id },
                include: {
                    author: {
                        select: { id: true, username: true, role: true },
                    },
                    mainPdf: { select: { filePath: true } },
                    attachments: { select: { filePath: true } },
                    convertedVersions: { select: { filePath: true } },
                },
            })

            if (!snapshot) {
                throw new ApiError('Документ не найден', 404)
            }

            if (
                snapshot.author.id !== user.id &&
                snapshot.creatorId !== user.id &&
                user.role !== USER_ROLES.ADMIN
            ) {
                throw new ApiError(
                    'Вы можете удалять только свои документы',
                    403
                )
            }

            await this.auditService.log(
                {
                    userId: user.id,
                    action: ACTION_TYPE.DOCUMENT_DELETED_HARD,
                    targetId: id,
                    targetType: TARGET_TYPE.DOCUMENT,
                    details: {
                        documentId: id,
                        documentName: snapshot.title,
                    },
                },
                txClient
            )

            // TODO: В V2 репозитории нет методов deleteMany для связанных таблиц.
            // Надо бы их добавить или использовать prisma напрямую через txClient.
            // Для простоты используем txClient.
            const db = txClient as Prisma.TransactionClient

            const converted = await db.convertedDocument.findMany({
                where: { id: snapshot.id },
                select: { filePath: true },
            })

            for (const it of converted) fileKeys.push(it.filePath)

            if (snapshot.filePath) fileKeys.push(snapshot.filePath)
            if (snapshot.mainPdf?.filePath)
                fileKeys.push(snapshot.mainPdf.filePath)
            for (const a of snapshot.attachments ?? [])
                fileKeys.push(a.filePath)
            for (const c of snapshot.convertedVersions ?? [])
                fileKeys.push(c.filePath)

            await db.convertedDocument.deleteMany({
                where: { id: snapshot.id },
            })
            await db.documentCategory.deleteMany({
                where: { documentId: snapshot.id },
            })
            await db.attachment.deleteMany({
                where: { documentId: snapshot.id },
            })
            await db.document.delete({ where: { id: snapshot.id } })
        })

        for (const key of fileKeys) {
            try {
                if (isAbsolute(key)) {
                    await unlink(key)
                } else {
                    await this.storageService.deleteDocument(key)
                }
            } catch (e) {
                console.error(`Не удалось удалить файл ${key}`, e)
            }
        }

        await indexingQueue.add('remove-from-index', { documentId: id })
    }

    /**
     * Восстанавливает "мягко" удаленный документ.
     */
    async restoreDocument(documentId: string) {
        const existingDocument = await this.docRepo.findUnique({
            where: { id: documentId, deletedAt: { not: null } },
            select: { id: true },
        })

        if (!existingDocument) {
            throw new ApiError(
                'Удаленный документ для восстановления не найден',
                404
            )
        }

        const restoredDocument = await this.docRepo.update({
            where: { id: documentId },
            data: {
                deletedAt: null,
                isPublished: true,
            },
        })

        await indexingQueue.add('index-document', { documentId })

        return restoredDocument
    }
}
