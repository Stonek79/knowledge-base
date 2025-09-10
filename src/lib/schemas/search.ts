import { z } from 'zod';

/**
 * Схема валидации опций поиска
 */
export const searchOptionsSchema = z.object({
    limit: z.number().int().min(1).max(1000).optional(),
    offset: z.number().int().min(0).optional(),
});

/**
 * Схема валидации опций поиска для будущих движков (Elasticsearch)
 * Расширенные возможности для замены FlexSearch
 */
export const extendedSearchOptionsSchema = z.object({
    // Базовые опции
    limit: z.number().int().min(1).max(1000).optional(),
    offset: z.number().int().min(0).optional(),

    // Расширенные опции для Elasticsearch
    fields: z.array(z.string()).optional(),
    language: z.string().optional(),
    fuzzy: z.boolean().optional(),
    threshold: z.number().min(0).max(1).optional(),

    // Специфичные для Elasticsearch
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    highlight: z.boolean().optional(),
    explain: z.boolean().optional(),
});

/**
 * Схема валидации фильтров поиска
 */
export const searchFiltersSchema = z.object({
    categoryIds: z.array(z.string()).optional(),
    authorId: z.string().optional(),
    dateRange: z
        .object({
            from: z.date(),
            to: z.date(),
        })
        .optional(),
    documentType: z.string().optional(),
    isPublished: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    fileSize: z
        .object({
            min: z.number().int().min(0),
            max: z.number().int().min(0),
        })
        .optional(),
});

/**
 * Схема валидации подсвеченного фрагмента
 */
export const highlightSchema = z.object({
    text: z.string(),
    field: z.string(),
    position: z.number().int().min(0),
    length: z.number().int().min(1),
});

/**
 * Схема валидации метаданных документа
 */
export const documentMetadataSchema = z.object({
    authorId: z.string(),
    authorName: z.string(),
    categoryId: z.string().optional(),
    categoryName: z.string().optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
    tags: z.array(z.string()),
    fileSize: z.number().int().min(0),
    mimeType: z.string(),
});

/**
 * Схема валидации результата поиска
 */
export const searchResultSchema = z.object({
    documentId: z.string(),
    title: z.string(),
    description: z.string().optional(),
    relevance: z.number().min(0).max(1),
    highlights: z.array(highlightSchema),
    metadata: documentMetadataSchema,
    source: z.enum(['text', 'metadata', 'combined']),
});

/**
 * Схема валидации документа для индексации
 */
export const searchDocumentSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    content: z.string(),
    metadata: documentMetadataSchema,
    keywords: z.array(z.string()).default([]),
});

/**
 * Схема валидации статуса индекса
 */
export const indexStatusSchema = z.object({
    documentCount: z.number().int().min(0),
    indexSize: z.number().int().min(0),
    lastUpdated: z.date(),
    status: z.enum(['ready', 'indexing', 'error']),
    errors: z.array(z.string()).optional(),
});

/**
 * Схема валидации опций индексации
 */
export const indexOptionsSchema = z.object({
    update: z.boolean().optional(),
    wait: z.boolean().optional(),
    batch: z.boolean().optional(),
});

/**
 * Схема валидации конфигурации поискового движка
 */
export const searchEngineConfigSchema = z.object({
    resolution: z.number().int().min(1).max(9).optional(),
    tokenize: z.enum(['full', 'strict', 'forward']).optional(),
    cache: z.union([z.boolean(), z.number().int().min(1)]).optional(),
    language: z.string().optional(),
    threshold: z.number().min(0).max(1).optional(),
});

/**
 * Схема валидации результатов поиска с пагинацией
 */
export const searchResultsSchema = z.object({
    results: z.array(searchResultSchema),
    total: z.number().int().min(0),
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    hasMore: z.boolean(),
});

/**
 * Схема валидации статистики поиска
 */
export const searchStatsSchema = z.object({
    totalDocuments: z.number().int().min(0),
    indexedDocuments: z.number().int().min(0),
    lastIndexUpdate: z.date().optional(),
    searchCount: z.number().int().min(0),
    averageResponseTime: z.number().min(0),
});
