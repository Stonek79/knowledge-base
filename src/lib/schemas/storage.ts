import { STORAGE_BASE_PATHS } from '@/constants/app'
import { MIME } from '@/constants/mime'
import { z } from '@/lib/zod'

/**
 * Схема валидации метаданных файла
 * @description Схема валидации метаданных файла
 * @returns {z.ZodObject<{originalName: z.ZodString<{message: string; path: string[]; code: "invalid_string" | "too_small" | "too_big";}, "originalName">, mimeType: z.ZodEnum<["docx", "doc", "pdf"]>, size: z.ZodNumber<{message: string; path: string[]; code: "too_small" | "too_big";}, "size">, tags: z.ZodArray<z.ZodString<{message: string; path: string[]; code: "invalid_string" | "too_small" | "too_big";}, "tags">, "tags">, customMetadata: z.ZodRecord<z.ZodString<{message: string; path: string[]; code: "invalid_string" | "too_small" | "too_big";}, "customMetadata">, z.ZodString<{message: string; path: string[]; code: "invalid_string" | "too_small" | "too_big";}, "customMetadata">>>, "customMetadata">}
 * @example
 * {
 *     originalName: 'example.docx',
 *     mimeType: 'docx',
 *     size: 1024,
 *     tags: ['tag1', 'tag2'],
 *     customMetadata: { key1: 'value1', key2: 'value2' }
 * }
 */
export const fileMetadataSchema = z.object({
    originalName: z
        .string()
        .min(1, 'Имя файла обязательно')
        .max(255, 'Имя файла слишком длинное'),
    mimeType: z.enum([MIME.DOCX, MIME.DOC, MIME.PDF]),
    size: z
        .number()
        .min(1, 'Размер файла должен быть больше 0')
        .max(2 * 1024 * 1024, 'Максимальный размер файла 2MB'),
    tags: z.array(z.string().max(50)).optional(),
    customMetadata: z
        .record(z.string().max(100), z.string().max(500))
        .optional(),
})

/**
 * Схема валидации результата загрузки
 * @description Схема валидации результата загрузки
 * @returns {z.ZodObject<{key: z.ZodString<{message: string; path: string[]; code: "invalid_string" | "too_small" | "too_big";}, "key">, url: z.ZodUrl<{message: string; path: string[]; code: "invalid_string" | "invalid_url";}, "url">, size: z.ZodNumber<{message: string; path: string[]; code: "too_small" | "too_big";}, "size">, hash: z.ZodString<{message: string; path: string[]; code: "invalid_string" | "too_small" | "too_big";}, "hash">, mimeType: z.ZodString<{message: string; path: string[]; code: "invalid_string" | "too_small" | "too_big";}, "mimeType">, storagePath: z.ZodString<{message: string; path: string[]; code: "invalid_string" | "too_small" | "too_big";}, "storagePath">}
 * @example
 * {
 *     key: 'example.docx',
 *     url: 'https://example.com/example.docx',
 *     size: 1024,
 *     hash: '1234567890',
 *     mimeType: 'docx',
 *     storagePath: 'documents/original'
 * }
 */
export const fileUploadResultSchema = z.object({
    key: z.string().min(1),
    url: z.url('Некорректный URL'),
    size: z.number().positive(),
    hash: z.string().length(64, 'Хеш должен быть 64 символа'),
    mimeType: z.string().min(1),
    storagePath: z.string().min(1),
})

/**
 * Схема валидации информации о файле
 * @description Схема валидации информации о файле
 * @returns {z.ZodObject<{key: z.ZodString<{message: string; path: string[]; code: "invalid_string" | "too_small" | "too_big";}, "key">, size: z.ZodNumber<{message: string; path: string[]; code: "too_small" | "too_big";}, "size">, lastModified: z.ZodDate<{message: string; path: string[]; code: "invalid_date";}, "lastModified">, etag: z.ZodString<{message: string; path: string[]; code: "invalid_string" | "too_small" | "too_big";}, "etag">, mimeType: z.ZodString<{message: string; path: string[]; code: "invalid_string" | "too_small" | "too_big";}, "mimeType">, metadata: z.ZodRecord<z.ZodString<{message: string; path: string[]; code: "invalid_string" | "too_small" | "too_big";}, "metadata">, z.ZodString<{message: string; path: string[]; code: "invalid_string" | "too_small" | "too_big";}, "metadata">>>, "metadata">}
 * @example
 * {
 *     key: 'example.docx',
 *     size: 1024,
 *     lastModified: new Date(),
 *     etag: '1234567890',
 *     mimeType: 'docx',
 *     metadata: { key1: 'value1', key2: 'value2' }
 * }
 */
export const fileInfoSchema = z.object({
    key: z.string().min(1),
    size: z.number().nonnegative(),
    lastModified: z.date(),
    etag: z.string().min(1),
    mimeType: z.string().optional(),
    metadata: z.record(z.string(), z.string()).optional(),
})

/**
 * Схема валидации конфигурации MinIO
 * @description Схема валидации конфигурации MinIO
 * @returns {z.ZodObject<{endPoint: z.ZodString<{message: string; path: string[]; code: "invalid_string" | "too_small" | "too_big";}, "endPoint">, port: z.ZodNumber<{message: string; path: string[]; code: "too_small" | "too_big";}, "port">, useSSL: z.ZodBoolean<{message: string; path: string[]; code: "invalid_boolean";}, "useSSL">, accessKey: z.ZodString<{message: string; path: string[]; code: "invalid_string" | "too_small" | "too_big";}, "accessKey">, secretKey: z.ZodString<{message: string; path: string[]; code: "invalid_string" | "too_small" | "too_big";}, "secretKey">, region: z.ZodString<{message: string; path: string[]; code: "invalid_string" | "too_small" | "too_big";}, "region">}
 * @example
 * {
 *     endPoint: 'localhost',
 *     port: 9000,
 *     useSSL: false,
 *     accessKey: 'minioadmin',
 *     secretKey: 'minioadmin',
 *     region: 'us-east-1'
 * }
 */
export const minioConfigSchema = z.object({
    endPoint: z.string().min(1, 'Endpoint обязателен'),
    port: z.number().int().min(1).max(65535, 'Некорректный порт'),
    useSSL: z.boolean(),
    accessKey: z.string().min(1, 'Access key обязателен'),
    secretKey: z.string().min(1, 'Secret key обязателен'),
    region: z.string().optional(),
})

/**
 * Схема валидации базового пути хранения файла
 * @description Схема валидации базового пути хранения файла
 * @returns {z.ZodEnum<["original", "converted", "thumbnails", "temp"]>}
 * @example
 * 'original'
 */
export const storageBasePathSchema = z.enum(Object.values(STORAGE_BASE_PATHS))

/**
 * Схема валидации опций загрузки
 * @description Схема валидации опций загрузки
 * @returns {z.ZodObject<{overwrite: z.ZodBoolean<{message: string; path: string[]; code: "invalid_boolean";}, "overwrite">, public: z.ZodBoolean<{message: string; path: string[]; code: "invalid_boolean";}, "public">, presignedExpiry: z.ZodNumber<{message: string; path: string[]; code: "too_small" | "too_big";}, "presignedExpiry">, basePath: z.ZodEnum<["original", "converted", "thumbnails", "temp"]>}
 * @example
 * {
 *     overwrite: true,
 *     public: false,
 *     presignedExpiry: 60
 *     basePath: 'original'
 * }
 */
export const uploadOptionsSchema = z.object({
    overwrite: z.boolean().optional(),
    public: z.boolean().optional(),
    presignedExpiry: z.number().int().min(60).max(604800).optional(), // 1 минута - 7 дней
    basePath: storageBasePathSchema.optional(),
})

/**
 * Схема валидации результата операции
 * @description Схема валидации результата операции
 * @returns {z.ZodObject<{success: z.ZodBoolean<{message: string; path: string[]; code: "invalid_boolean";}, "success">, error: z.ZodString<{message: string; path: string[]; code: "invalid_string" | "too_small" | "too_big";}, "error">, data: z.ZodRecord<z.ZodString<{message: string; path: string[]; code: "invalid_string" | "too_small" | "too_big";}, "data">, z.ZodString<{message: string; path: string[]; code: "invalid_string" | "too_small" | "too_big";}, "data">>>, "data">}
 * @example
 * {
 *     success: true,
 *     error: null,
 *     data: { key: 'example.docx', url: 'https://example.com/example.docx' }
 * }
 */
export const storageOperationResultSchema = z.object({
    success: z.boolean(),
    error: z.string().optional(),
    data: z.record(z.string(), z.string()).optional(),
})
