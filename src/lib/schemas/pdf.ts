import { z } from 'zod';

import { MIME } from '@/constants/mime';

export const pdfCombineRequestSchema = z.object({
    mainDocumentPath: z.string(),
    mainDocumentMimeType: z.enum(MIME),
    attachments: z.array(
        z.object({
            id: z.string(),
            filePath: z.string(),
            order: z.number().int().min(0),
            fileName: z.string(),
            mimeType: z.enum(MIME),
        })
    ),
});

export const pdfCombineResultSchema = z.object({
    success: z.boolean(),
    combinedPdfPath: z.string().optional(),
    combinedPdfKey: z.string().optional(),
    error: z.string().optional(),
    fileSize: z.number().int().min(0).optional(),
    originalName: z.string().optional(),
});
