import type {
    fileInfoSchema,
    fileMetadataSchema,
    fileUploadResultSchema,
    minioConfigSchema,
    storageBasePathSchema,
    storageOperationResultSchema,
    uploadOptionsSchema,
} from '@/lib/schemas/storage'
import type { z } from '@/lib/zod'

export type FileMetadata = z.infer<typeof fileMetadataSchema>
export type FileUploadResult = z.infer<typeof fileUploadResultSchema>
export type FileInfo = z.infer<typeof fileInfoSchema>
export type MinioConfig = z.infer<typeof minioConfigSchema>
export type UploadOptions = z.infer<typeof uploadOptionsSchema>
export type StorageOperationResult = z.infer<
    typeof storageOperationResultSchema
>

export type StorageBasePath = z.infer<typeof storageBasePathSchema>
