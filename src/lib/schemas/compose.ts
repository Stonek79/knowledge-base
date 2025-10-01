import { z } from 'zod';

import { isSupportedMime } from '@/utils/mime';

export const attachmentReorderItemSchema = z.object({
    attachmentId: z.string().optional(),
    clientId: z.string(),
    order: z.number().int().min(0),
});

export const stagedFileSchema = z.object({
    tempKey: z.string().min(1),
    originalName: z.string().min(1),
    mimeType: z.string().refine(isSupportedMime, {
        message: 'Unsupported MIME type',
    }),
    size: z.number().int().positive(),
    clientId: z.string(),
});

export const metadataPatchSchema = z
    .object({
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        keywords: z.string().optional(), // "тег1, тег2"
        categoryIds: z.array(z.string()).optional(),
        isConfidential: z.boolean().optional(),
        isSecret: z.boolean().optional(),
        accessCode: z.string().optional(),
        confidentialAccessUserIds: z.array(z.string()).optional(),
        authorId: z.string().optional(),
        username: z.string().optional(),
    })
    .refine(data => !!data.authorId || !!data.username, {
        message:
            'Необходимо указать автора (либо выбрать существующего, либо ввести имя нового)',
        path: ['authorId'], // Путь для отображения ошибки
    });

export const composeChangeSetSchema = z.object({
    operationId: z.uuid(),
    metadata: metadataPatchSchema.optional(),
    replaceMain: stagedFileSchema.optional(),
    addAttachments: z.array(stagedFileSchema).optional(),
    deleteAttachmentIds: z.array(z.string()).optional(),
    reorder: z.array(attachmentReorderItemSchema).optional(),
});
