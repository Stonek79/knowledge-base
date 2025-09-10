import { z } from 'zod';
import { isSupportedMime } from '@/utils/mime';

import { MIME } from '@/constants/mime';

export const attachmentReorderItemSchema = z.object({
    attachmentId: z.string().optional(),
    clientId: z.string(),
    order: z.number().int().min(0),
});

export const stagedFileSchema = z.object({
    tempKey: z.string().min(1),
    originalName: z.string().min(1),
    // mimeType: z.enum([MIME.DOCX, MIME.DOC, MIME.PDF]),
    mimeType: z.string().refine(isSupportedMime, {
        message: 'Unsupported MIME type',
    }),
    size: z.number().int().positive(),
    clientId: z.string(),
});

export const metadataPatchSchema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    keywords: z.string().optional(), // "тег1, тег2"
    categoryIds: z.array(z.string()).optional(),
});

export const composeChangeSetSchema = z.object({
    operationId: z.uuid(),
    metadata: metadataPatchSchema.optional(),
    replaceMain: stagedFileSchema.optional(),
    addAttachments: z.array(stagedFileSchema).optional(),
    deleteAttachmentIds: z.array(z.string()).optional(),
    reorder: z.array(attachmentReorderItemSchema).optional(),
});
