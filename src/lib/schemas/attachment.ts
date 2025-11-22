import { ATTACHMENT_TYPE } from '@/constants/document'
import { MIME } from '@/constants/mime'
import { z } from '@/lib/zod'

export const baseAttachmentSchema = z.object({
    id: z.string().min(1),
    fileName: z.string().min(1).max(255),
    mimeType: z.enum([MIME.DOCX, MIME.DOC, MIME.PDF]),
    fileSize: z.number().int().min(1),
    order: z.number().int().min(0).optional(),
    attachmentType: z.enum(ATTACHMENT_TYPE).default(ATTACHMENT_TYPE.ATTACHMENT),
    createdAt: z.date(),
})

export const createAttachmentSchema = z.object({
    id: z.string().min(1),
    fileName: z.string().min(1).max(255),
    mimeType: z.string(),
    fileSize: z.number().int().min(1),
    order: z.number().int().min(0).optional(),
    attachmentType: z.enum(ATTACHMENT_TYPE).default(ATTACHMENT_TYPE.ATTACHMENT),
    createdAt: z.date(),
    documentId: z.string().min(1),
    filePath: z.string().min(1),
})

export const attachmentMetadataSchema = z.object({
    fileName: z.string().min(1).max(255),
    mimeType: z.enum([MIME.DOCX, MIME.DOC, MIME.PDF]),
    fileSize: z.number().int().min(1),
    attachmentType: z.enum(ATTACHMENT_TYPE).default(ATTACHMENT_TYPE.ATTACHMENT),
    order: z.number().int().min(0).optional(),
})

export const attachmentUploadSchema = z.object({
    file: z.any().optional(),
    attachmentType: z.enum(ATTACHMENT_TYPE).default(ATTACHMENT_TYPE.ATTACHMENT),
    order: z.number().int().min(0).optional(),
})

export const attachmentsReorderSchema = z.object({
    items: z
        .array(
            z.object({
                attachmentId: z.string().min(1),
                order: z.number().int().min(0),
            })
        )
        .min(1),
})
