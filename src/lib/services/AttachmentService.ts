// src/lib/services/AttachmentService.ts
import { STORAGE_BASE_PATHS } from '@/constants/app'
import { attachmentMetadataSchema } from '@/lib/schemas/attachment'
import type { AttachmentMetadata } from '@/lib/types/attachment'

import { getFileStorageService } from './FileStorageService'

/**
 * Сервис для управления приложениями к документам
 * Обеспечивает загрузку, удаление и изменение порядка приложений
 *
 * Примечание: Сервис работает только с файловым хранилищем.
 * Управление записями БД происходит в API роутах.
 */
export class AttachmentService {
    /**
     * Загружает приложение в MinIO
     * @param fileBuffer Буфер файла приложения
     * @param metadata Метаданные приложения
     * @returns Результат загрузки с ключом файла
     */
    async uploadAttachment(
        fileBuffer: Buffer,
        metadata: AttachmentMetadata
    ): Promise<{ key: string; size: number; mimeType: string }> {
        // Валидация метаданных
        const validatedMetadata = attachmentMetadataSchema.parse(metadata)

        // Загружаем файл в MinIO
        const result = await getFileStorageService().uploadDocument(
            fileBuffer,
            {
                originalName: validatedMetadata.fileName,
                mimeType: validatedMetadata.mimeType,
                size: validatedMetadata.fileSize,
            },
            { basePath: STORAGE_BASE_PATHS.ATTACHMENTS }
        )

        return {
            key: result.key,
            size: result.size,
            mimeType: result.mimeType,
        }
    }

    /**
     * Удаляет файл приложения из MinIO
     * @param fileKey Ключ файла в MinIO
     */
    async deleteAttachment(fileKey: string): Promise<void> {
        await getFileStorageService().deleteDocument(fileKey)
    }

    /**
     * Получает информацию о файле приложения
     * @param fileKey Ключ файла в MinIO
     */
    async getAttachmentInfo(fileKey: string) {
        return getFileStorageService().getFileInfo(fileKey)
    }

    /**
     * Скачивает файл приложения
     * @param fileKey Ключ файла в MinIO
     */
    async downloadAttachment(fileKey: string): Promise<Buffer> {
        return getFileStorageService().downloadDocument(fileKey)
    }

    /**
     * Получает URL для скачивания приложения
     * @param fileKey Ключ файла в MinIO
     * @param expirySeconds Время действия URL
     */
    async getAttachmentUrl(
        fileKey: string,
        expirySeconds?: number
    ): Promise<string> {
        return getFileStorageService().getFileUrl(fileKey, expirySeconds)
    }
}

// Экспорт экземпляра сервиса
export const attachmentService = new AttachmentService()
