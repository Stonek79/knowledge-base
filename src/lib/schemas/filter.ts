import { z } from 'zod';

import { DOCUMENT_TYPE, SORT_ORDER } from '@/constants/document';

/**
 * Схема валидации фильтров документов
 */
export const documentFiltersSchema = z.object({
    categoryIds: z.array(z.string()).optional(),
    authorId: z.string().optional(),
    dateRange: z
        .object({
            from: z.date().optional(),
            to: z.date().optional(),
        })
        .optional(),
    documentType: z.enum(DOCUMENT_TYPE).optional(),
    isPublished: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    fileSize: z
        .object({
            min: z.number().int().min(0).optional(),
            max: z.number().int().min(0).optional(),
        })
        .optional(),
    mimeType: z.string().optional(),
    searchQuery: z.string().optional(),
});

/**
 * Схема валидации опций сортировки
 */
export const sortOptionsSchema = z.object({
    field: z.enum([
        'createdAt',
        'updatedAt',
        'title',
        'fileSize',
        'viewCount',
        'downloadCount',
    ]),
    order: z.enum([SORT_ORDER.ASC, SORT_ORDER.DESC]).default(SORT_ORDER.DESC),
});

/**
 * Схема валидации пагинации
 */
export const paginationOptionsSchema = z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
});

/**
 * Схема валидации агрегации
 */
export const aggregationOptionsSchema = z.object({
    groupBy: z
        .enum(['authorId', 'documentType', 'mimeType', 'createdAt'])
        .optional(),
    count: z.boolean().default(true),
    sum: z.array(z.enum(['fileSize', 'viewCount', 'downloadCount'])).optional(),
});
