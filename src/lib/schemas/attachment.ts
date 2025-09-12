import { AttachmentType } from '@prisma/client';
import { z } from 'zod';

import { MIME } from '@/constants/mime';

export const baseAttachmentSchema = z.object({
    id: z.string().min(1),
    fileName: z.string().min(1).max(255),
    mimeType: z.enum([MIME.DOCX, MIME.DOC, MIME.PDF]),
    fileSize: z.number().int().min(1),
    order: z.number().int().min(0).optional(),
    attachmentType: z.enum(AttachmentType).default(AttachmentType.ATTACHMENT),
    createdAt: z.date(),
});

export const attachmentMetadataSchema = z.object({
    fileName: z.string().min(1).max(255),
    mimeType: z.enum([MIME.DOCX, MIME.DOC, MIME.PDF]),
    fileSize: z.number().int().min(1),
    attachmentType: z.enum(AttachmentType).default(AttachmentType.ATTACHMENT),
    order: z.number().int().min(0).optional(),
});

export const attachmentUploadSchema = z.object({
    file: z.any().optional(),
    attachmentType: z.enum(AttachmentType).default(AttachmentType.ATTACHMENT),
    order: z.number().int().min(0).optional(),
});

export const attachmentsReorderSchema = z.object({
    items: z
        .array(
            z.object({
                attachmentId: z.string().min(1),
                order: z.number().int().min(0),
            })
        )
        .min(1),
});
