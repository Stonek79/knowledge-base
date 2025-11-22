import { z } from '@/lib/zod'
// This file will contain shared schemas that can be reused across different OpenAPI resource definitions.

export const PaginationSchema = z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
})

export const DocumentWithAuthorSchema = z.object({
    id: z.uuid(),
    title: z.string(),
    description: z.string().nullable().optional(),
    filePath: z.string(),
    fileName: z.string(),
    fileSize: z.number().int().min(0),
    mimeType: z.string(),
    hash: z.string(),
    format: z.string(),
    isPublished: z.boolean(),
    documentType: z.string(),
    isConfidential: z.boolean(),
    isSecret: z.boolean(),
    accessCodeHash: z.string().nullable().optional(),
    tags: z.array(z.string()),
    keywords: z.array(z.string()),
    viewCount: z.number().int().min(0),
    downloadCount: z.number().int().min(0),
    createdAt: z.date(),
    updatedAt: z.date(),
    creatorId: z.uuid(),
    authorId: z.uuid(),
    author: z.object({
        id: z.uuid(),
        username: z.string(),
        role: z.enum(['ADMIN', 'USER', 'GUEST']),
    }),
})
