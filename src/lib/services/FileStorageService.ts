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
 */
export class FileStorageService {
    private client: MinioClient | null = null;
    private bucket: string;
    private bucketChecked = false;

    constructor() {
        this.bucket = MINIO_CONFIG.bucket;
    }

    /**
     * Lazily gets or creates the Minio client instance and ensures bucket exists.
     */
    private async getClient(): Promise<MinioClient> {
        if (this.client) {
            return this.client;
        }

        // В среде сборки (где нет MINIO_ENDPOINT) возвращаем mock-клиент
        if (!process.env.MINIO_ENDPOINT) {
            console.warn('>>> Build environment detected or MINIO_ENDPOINT is not set. Using MOCK Minio client.');
            const mockClient = {
                putObject: async () => ({ etag: '', versionId: '' }),
                getObject: async () => null,
                removeObject: async () => {},
                statObject: async () => ({ size: 0, lastModified: new Date(), etag: '' }),
                presignedGetObject: async () => 'http://mock-url',
                bucketExists: async () => true,
                makeBucket: async () => {},
                copyObject: async () => ({ etag: '', versionId: '' }),
            } as unknown as MinioClient;
            return mockClient;
        }

        const config: MinioConfig = {
            endPoint: process.env.MINIO_ENDPOINT,
            port: parseInt(process.env.MINIO_PORT || '9000'),
            useSSL: MINIO_CONFIG.useSSL,
            accessKey: process.env.MINIO_ROOT_USER || 'kb_admin',
            secretKey: process.env.MINIO_ROOT_PASSWORD || 'kb_minio_password',
            region: MINIO_CONFIG.region,
        };

        this.client = new MinioClient(config);
        await this.ensureBucketExists(this.client);
        return this.client;
    }

    /**
     * Загружает документ в MinIO хранилище
     */
    async uploadDocument(
        file: Buffer,
        metadata: FileMetadata,
        options: UploadOptions = {}
    ): Promise<FileUploadResult> {
        const client = await this.getClient();
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

            await client.putObject(
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
     */
    async uploadByKey(
        key: string,
        buffer: Buffer,
        contentType: string = 'application/json'
    ): Promise<void> {
        try {
            const client = await this.getClient();
            const metaData = {
                'Content-Type': contentType,
            };
            await client.putObject(
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
     */
    async downloadDocument(key: string): Promise<Buffer> {
        try {
            const client = await this.getClient();
            const stream = await client.getObject(this.bucket, key);
            const chunks: Buffer[] = [];

            return new Promise((resolve, reject) => {
                stream.on('data', chunk => chunks.push(chunk));
                stream.on('end', () => resolve(Buffer.concat(chunks)));
                stream.on('error', reject);
            });
        } catch (error) {
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
            if (error instanceof Error) {
                throw error;
            }
            throw new Error(String(error));
        }
    }

    /**
     * Удаляет документ из хранилища
     */
    async deleteDocument(key: string): Promise<StorageOperationResult> {
        try {
            const client = await this.getClient();
            await client.removeObject(this.bucket, key);
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
     */
    async getFileInfo(key: string): Promise<FileInfo> {
        try {
            const client = await this.getClient();
            const stat = await client.statObject(this.bucket, key);
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
     */
    async getFileUrl(
        key: string,
        expirySeconds: number = 86400
    ): Promise<string> {
        try {
            const client = await this.getClient();
            return await client.presignedGetObject(
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

    private generateHash(buffer: Buffer): string {
        return createHash('sha256').update(buffer).digest('hex');
    }

    private async ensureBucketExists(client: MinioClient): Promise<void> {
        if (this.bucketChecked) return;
        try {
            const exists = await client.bucketExists(this.bucket);
            if (!exists) {
                await client.makeBucket(this.bucket, MINIO_CONFIG.region);
                console.log(`Bucket ${this.bucket} создан`);
            }
            this.bucketChecked = true;
        } catch (error) {
            console.error(`Ошибка создания bucket: ${error}`);
        }
    }

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

    private async copyObject(srcKey: string, destKey: string): Promise<void> {
        const client = await this.getClient();
        await client.copyObject(
            this.bucket,
            destKey,
            `/${this.bucket}/${srcKey}`
        );
    }

    async safeDelete(key: string): Promise<void> {
        try {
            const client = await this.getClient();
            await client.removeObject(this.bucket, key);
        } catch {
            console.log(`[safeDelete] Файл не найден: ${key}`);
        }
    }
}

/**
 * Экспорт экземпляра для использования в приложении
 */
export const fileStorageService = new FileStorageService();