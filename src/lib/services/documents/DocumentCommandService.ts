import { unlink } from 'fs/promises';
import { isAbsolute } from 'path';

import { GOTENBERG_URL } from '@/constants/app';
import { USER_ROLES } from '@/constants/user';
import { DocumentProcessor } from '@/core/documents/DocumentProcessor';
import { GotenbergAdapter } from '@/core/documents/GotenbergAdapter';
import { ApiError } from '@/lib/api';
import { indexingQueue } from '@/lib/queues/indexing';
import { DocumentRepository } from '@/lib/repositories/documentRepository';
import { getFileStorageService } from '@/lib/services/FileStorageService';
import { settingsService } from '@/lib/services/SettingsService';
import {
    CreateDocumentServiceData,
    UpdateDocumentData,
} from '@/lib/types/document';
import { SupportedMime } from '@/lib/types/mime';
import { UserResponse } from '@/lib/types/user';
import { FileUtils } from '@/utils/files';
import { isSupportedMime, mimeMapper } from '@/utils/mime';

/**
 * DocumentCommandService инкапсулирует логику для изменения (создания, обновления, удаления) документов.
 */
export class DocumentCommandService {
    /**
     * Создает новый документ на основе загруженных данных.
     * @param formData - Данные формы, содержащие файл и метаданные.
     * @param user - Пользователь, выполняющий действие.
     * @returns - Созданный объект документа.
     */
    public static async createDocument(
        data: CreateDocumentServiceData,
        user: UserResponse
    ) {
        let createdFileKey: string | null = null;
        let createdPdfKey: string | null = null;

        try {
            if (user.role === USER_ROLES.GUEST) {
                throw new ApiError('Forbidden', 403);
            }

            const {
                file,
                authorId,
                creatorId,
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
     * Обновляет метаданные документа.
     * @param id - ID документа.
     * @param data - Данные для обновления.
     * @param user - Текущий пользователь.
     * @returns - Обновленный документ.
     */
    public static async updateDocument(
        id: string,
        data: UpdateDocumentData,
        user: UserResponse,
        authorId: string | undefined
    ) {
        const document = await DocumentRepository.findUnique({
            where: { id },
        });
        if (!document) {
            throw new ApiError('Документ не найден', 404);
        }

        if (
            user.role !== USER_ROLES.ADMIN &&
            user.role === USER_ROLES.USER &&
            document.authorId !== user.id &&
            document.creatorId !== user.id
        ) {
            throw new ApiError(
                'Можно редактировать только свои документы',
                403
            );
        }

        const updatedDocument = await DocumentRepository.update({
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
        });

        await indexingQueue.add('index-document', {
            documentId: updatedDocument.id,
        });

        return updatedDocument;
    }

    /**
     * "Мягко" удаляет документ, устанавливая флаг deletedAt.
     * Файлы при этом не удаляются. Документ исключается из поискового индекса.
     * @param id - ID документа.
     * @param user - Текущий пользователь.
     */
    public static async softDeleteDocument(id: string, user: UserResponse) {
        // Сначала мы должны найти документ, чтобы проверить права доступа.
        // Наш Prisma-клиент расширен, поэтому findUnique не вернет уже "удаленные" документы.
        const document = await DocumentRepository.findUnique({
            where: { id },
            select: { authorId: true, creatorId: true },
        });

        if (!document) {
            throw new ApiError('Документ не найден', 404);
        }

        if (
            document.authorId !== user.id &&
            document.creatorId !== user.id &&
            user.role !== USER_ROLES.ADMIN
        ) {
            throw new ApiError('Вы можете удалять только свои документы', 403);
        }

        // Выполняем "мягкое" удаление через update
        await DocumentRepository.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                viewCount: 0,
                isPublished: false,
            },
        });

        // Удаляем документ из поискового индекса
        await indexingQueue.add('remove-from-index', { documentId: id });
    }

    /**
     * **Безвозвратно** удаляет документ и все связанные с ним данные и файлы.
     * @param id - ID документа.
     * @param user - Текущий пользователь (должен быть ADMIN или создатель документа).
     */
    public static async hardDeleteDocument(id: string, user: UserResponse) {
        const fileKeys: string[] = [];
        await DocumentRepository.interactiveTransaction(async tx => {
            const snapshot = await tx.document.findUnique({
                where: { id },
                include: {
                    author: {
                        select: { id: true, username: true, role: true },
                    },
                    mainPdf: { select: { filePath: true } },
                    attachments: { select: { filePath: true } },
                    convertedVersions: { select: { filePath: true } },
                },
            });

            if (!snapshot) {
                throw new ApiError('Документ не найден', 404);
            }

            if (
                snapshot.author.id !== user.id &&
                snapshot.creatorId !== user.id &&
                user.role !== USER_ROLES.ADMIN
            ) {
                throw new ApiError(
                    'Вы можете удалять только свои документы',
                    403
                );
            }

            const converted = await tx.convertedDocument.findMany({
                where: { id: snapshot.id },
                select: { filePath: true },
            });

            for (const it of converted) fileKeys.push(it.filePath);

            if (snapshot.filePath) fileKeys.push(snapshot.filePath);
            if (snapshot.mainPdf?.filePath)
                fileKeys.push(snapshot.mainPdf.filePath);
            for (const a of snapshot.attachments ?? [])
                fileKeys.push(a.filePath);
            for (const c of snapshot.convertedVersions ?? [])
                fileKeys.push(c.filePath);

            await tx.convertedDocument.deleteMany({
                where: { id: snapshot.id },
            });
            await tx.documentCategory.deleteMany({
                where: { documentId: snapshot.id },
            });
            await tx.attachment.deleteMany({
                where: { documentId: snapshot.id },
            });
            await tx.document.delete({ where: { id: snapshot.id } });
        });

        for (const key of fileKeys) {
            try {
                if (isAbsolute(key)) {
                    await unlink(key);
                } else {
                    await getFileStorageService().deleteDocument(key);
                }
            } catch (e) {
                console.error(`Не удалось удалить файл ${key}`, e);
            }
        }

        await indexingQueue.add('remove-from-index', { documentId: id });
    }

    /**
     * Восстанавливает "мягко" удаленный документ.
     * @param documentId - ID документа для восстановления.
     */
    public static async restoreDocument(documentId: string) {
        // Проверяем, что документ существует и действительно удален
        const existingDocument = await DocumentRepository.findUnique({
            where: { id: documentId, deletedAt: { not: null } },
            select: { id: true }, // выбираем только id для эффективности
        });

        if (!existingDocument) {
            throw new ApiError(
                'Удаленный документ для восстановления не найден',
                404
            );
        }

        const restoredDocument = await DocumentRepository.update({
            where: { id: documentId },
            data: {
                deletedAt: null,
                isPublished: true,
            },
        });

        // Ставим в очередь на переиндексацию, чтобы он снова появился в поиске
        await indexingQueue.add('index-document', { documentId });

        return restoredDocument;
    }
}
