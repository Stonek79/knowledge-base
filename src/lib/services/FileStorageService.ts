import { createHash } from 'crypto';
import { Client as MinioClient } from 'minio';

import {
    MINIO_CONFIG,
    STORAGE_BASE_PATHS,
    STORAGE_PATHS,
} from '@/constants/app';

import {
    FileInfo,
    FileMetadata,
    FileUploadResult,
    MinioConfig,
    StorageBasePath,
    StorageOperationResult,
    UploadOptions,
} from '../types/storage';

interface CodedError extends Error {
    code?: string;
}

/**
 * Сервис для работы с файловым хранилищем MinIO
 * @description Сервис для работы с файловым хранилищем MinIO
 * @returns {FileStorageService}
 * @example
 * const fileStorageService = new FileStorageService();
 * const file = await fileStorageService.uploadDocument(file, metadata);
 * const file = await fileStorageService.downloadDocument(key);
 * const file = await fileStorageService.deleteDocument(key);
 * const file = await fileStorageService.getFileInfo(key);
 * const file = await fileStorageService.getFileUrl(key);
 * const file = await fileStorageService.generateStorageKey(originalName, hash);
 * const file = await fileStorageService.generateHash(buffer);
 * const file = await fileStorageService.ensureBucketExists();
 */
export class FileStorageService {
    private client: MinioClient;
    private bucket: string;

    constructor() {
        const config: MinioConfig = {
            endPoint: process.env.MINIO_ENDPOINT || 'localhost',
            port: parseInt(process.env.MINIO_PORT || '9000'),
            useSSL: MINIO_CONFIG.useSSL,
            accessKey: process.env.MINIO_ACCESS_KEY || 'kb_admin',
            secretKey: process.env.MINIO_SECRET_KEY || 'kb_minio_password',
            region: MINIO_CONFIG.region,
        };

        this.client = new MinioClient(config);
        this.bucket = MINIO_CONFIG.bucket;
        this.ensureBucketExists();
    }

    /**
     * Загружает документ в MinIO хранилище
     * @param {Buffer} file - Файл для загрузки
     * @param {FileMetadata} metadata - Метаданные файла
     * @param {UploadOptions} options - Опции загрузки
     * @returns {Promise<FileUploadResult>} Результат загрузки файла
     * @example
     * const file = await fileStorageService.uploadDocument(file, metadata);
     */
    async uploadDocument(
        file: Buffer,
        metadata: FileMetadata,
        options: UploadOptions = {}
    ): Promise<FileUploadResult> {
        const hash = this.generateHash(file);
        const basePath = options.basePath ?? STORAGE_BASE_PATHS.ORIGINAL;
        const key = this.generateStorageKey(
            metadata.originalName,
            hash,
            basePath
        );

        try {
            const toAscii = (val: unknown) =>
                encodeURIComponent(String(val))
                    .replace(/%0A|%0D/gi, '')
                    .slice(0, 200);

            const metaData = {
                'Content-Type': metadata.mimeType,
                'x-amz-meta-original-name': toAscii(metadata.originalName),
                'x-amz-meta-hash': String(hash),
                'x-amz-meta-size': String(metadata.size),
                ...(metadata.tags && {
                    'x-amz-meta-tags': metadata.tags.map(toAscii).join(','),
                }),
                ...(metadata.customMetadata &&
                    Object.fromEntries(
                        Object.entries(metadata.customMetadata).map(
                            ([k, v]) => [`x-amz-meta-${toAscii(k)}`, toAscii(v)]
                        )
                    )),
            };

            await this.client.putObject(
                this.bucket,
                key,
                file,
                file.length,
                metaData
            );

            const url = await this.getFileUrl(key, options.presignedExpiry);

            return {
                key,
                url,
                size: file.length,
                hash,
                mimeType: metadata.mimeType,
                storagePath: key,
            };
        } catch (error) {
            throw new Error(
                `Ошибка загрузки файла: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
            );
        }
    }

    /**
     * Загружает буфер по фиксированному ключу в MinIO
     * @param key Ключ (например, "search-indexes/flexsearch-index.json")
     * @param buffer Данные
     * @param contentType MIME-тип (по умолчанию application/json)
     */
    async uploadByKey(
        key: string,
        buffer: Buffer,
        contentType: string = 'application/json'
    ): Promise<void> {
        try {
            const metaData = {
                'Content-Type': contentType,
            };
            await this.client.putObject(
                this.bucket,
                key,
                buffer,
                buffer.length,
                metaData
            );
        } catch (error) {
            throw new Error(
                `Ошибка загрузки файла по ключу "${key}": ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
            );
        }
    }

    /**
     * Скачивает документ из MinIO хранилища
     * @param {string} key - Ключ файла
     * @returns {Promise<Buffer>} Файл
     * @example
     * const file = await fileStorageService.downloadDocument(key);
     */
    async downloadDocument(key: string): Promise<Buffer> {
        try {
            const stream = await this.client.getObject(this.bucket, key);
            const chunks: Buffer[] = [];

            return new Promise((resolve, reject) => {
                stream.on('data', chunk => chunks.push(chunk));
                stream.on('end', () => resolve(Buffer.concat(chunks)));
                stream.on('error', reject);
            });
        } catch (error) {
            // Безопасно проверяем, является ли ошибка ошибкой Minio "NoSuchKey"
            if (
                typeof error === 'object' &&
                error !== null &&
                'code' in error &&
                (error as { code: unknown }).code === 'NoSuchKey'
            ) {
                const notFound: CodedError = new Error(
                    `Файл не найден: ${key}`
                );
                notFound.code = 'NoSuchKey';
                throw notFound;
            }
            // Остальные ошибки пробрасываем как есть
            if (error instanceof Error) {
                throw error;
            }
            throw new Error(String(error));
        }
    }

    /**
     * Удаляет документ из хранилища
     * @param {string} key - Ключ файла
     * @returns {Promise<StorageOperationResult>} Результат удаления файла
     * @example
     * const result = await fileStorageService.deleteDocument(key);
     */
    async deleteDocument(key: string): Promise<StorageOperationResult> {
        try {
            await this.client.removeObject(this.bucket, key);
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: `Ошибка удаления файла: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
            };
        }
    }

    /**
     * Получает информацию о файле
     * @param {string} key - Ключ файла
     * @returns {Promise<FileInfo>} Информация о файле
     * @example
     * const fileInfo = await fileStorageService.getFileInfo(key);
     */
    async getFileInfo(key: string): Promise<FileInfo> {
        try {
            const stat = await this.client.statObject(this.bucket, key);
            return {
                key,
                size: stat.size,
                lastModified: stat.lastModified,
                etag: stat.etag,
                mimeType: stat.metaData?.['content-type'],
                metadata: stat.metaData,
            };
        } catch (error) {
            throw new Error(`Файл не найден: ${key}`);
        }
    }

    /**
     * Получает presigned URL для файла
     * @param {string} key - Ключ файла
     * @param {number} expirySeconds - Время действия URL в секундах
     * @returns {Promise<string>} URL файла
     * @example
     * const url = await fileStorageService.getFileUrl(key);
     */
    async getFileUrl(
        key: string,
        expirySeconds: number = 86400
    ): Promise<string> {
        try {
            return await this.client.presignedGetObject(
                this.bucket,
                key,
                expirySeconds
            );
        } catch (error) {
            throw new Error(
                `Ошибка получения URL: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
            );
        }
    }

    /**
     * Генерирует уникальный ключ для хранения файла
     * @param {string} originalName - Оригинальное имя файла
     * @param {string} hash - Хеш файла
     * @returns {string} Ключ файла
     * @example
     * const key = fileStorageService.generateStorageKey(originalName, hash);
     */
    private generateStorageKey(
        originalName: string,
        hash: string,
        basePath: StorageBasePath = STORAGE_BASE_PATHS.ORIGINAL
    ): string {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const extension = originalName.split('.').pop() || '';
        const fileName = hash.substring(0, 8);

        return `${STORAGE_PATHS[basePath]}/${year}/${month}/${fileName}.${extension}`;
    }

    /**
     * Генерирует SHA-256 хеш файла
     * @param {Buffer} buffer - Буфер файла
     * @returns {string} Хеш файла
     * @example
     * const hash = fileStorageService.generateHash(buffer);
     */
    private generateHash(buffer: Buffer): string {
        return createHash('sha256').update(buffer).digest('hex');
    }

    /**
     * Создает bucket если он не существует
     * @returns {Promise<void>}
     * @example
     * await fileStorageService.ensureBucketExists();
     */
    private async ensureBucketExists(): Promise<void> {
        try {
            const exists = await this.client.bucketExists(this.bucket);
            if (!exists) {
                await this.client.makeBucket(this.bucket, MINIO_CONFIG.region);
                console.log(`Bucket ${this.bucket} создан`);
            }
        } catch (error) {
            console.error(`Ошибка создания bucket: ${error}`);
        }
    }

    /**
     * Перемещает файл из временного хранилища в основное хранилище
     * @param {string} tempKey - Ключ временного файла
     * @param {StorageBasePath} basePath - Базовый путь для хранения файла
     * @returns {Promise<{ key: string; size: number; mimeType: string }>} Информация о файле
     * @example
     * const info = await fileStorageService.promoteFromTemp(tempKey, basePath);
     */
    async promoteFromTemp(
        tempKey: string,
        basePath: StorageBasePath
    ): Promise<{ key: string; size: number; mimeType: string }> {
        const fileName = tempKey.split('/').pop() || `file-${Date.now()}`;
        const destKey = `${STORAGE_PATHS[basePath]}/${fileName}`;
        await this.copyObject(tempKey, destKey);
        await this.safeDelete(tempKey);
        const info = await this.getFileInfo(destKey);
        return {
            key: destKey,
            size: info.size,
            mimeType: info.mimeType ?? 'application/octet-stream',
        };
    }

    /**
     * Копирует файл из одного места в другое
     * @param {string} srcKey - Ключ исходного файла
     * @param {string} destKey - Ключ конечного файла
     * @returns {Promise<void>}
     * @example
     * await fileStorageService.copyObject(srcKey, destKey);
     */
    private async copyObject(srcKey: string, destKey: string): Promise<void> {
        await this.client.copyObject(
            this.bucket,
            destKey,
            `/${this.bucket}/${srcKey}`
        );
    }

    /**
     * Удаляет файл
     * @param {string} key - Ключ файла
     * @returns {Promise<void>}
     * @example
     * await fileStorageService.safeDelete(key);
     */
    async safeDelete(key: string): Promise<void> {
        try {
            await this.client.removeObject(this.bucket, key);
        } catch {
            console.log(`[safeDelete] Файл не найден: ${key}`);
        }
    }
}

/**
 * Экспорт экземпляра для использования в приложении
 * @returns {FileStorageService}
 * @example
 * const fileStorageService = new FileStorageService();
 */
export const fileStorageService = new FileStorageService();
