import { z } from 'zod'

/**
 * Схема валидации опций кэша
 */
export const cacheOptionsSchema = z.object({
    ttl: z.number().int().min(1).max(86400).optional(), // 1 секунда - 24 часа
    prefix: z.string().optional(),
    compress: z.boolean().optional(),
})

/**
 * Схема валидации результата операции с кэшем
 */
export const cacheOperationResultSchema = z.object({
    success: z.boolean(),
    error: z.string().optional(),
    data: z.any().optional(),
})

/**
 * Схема валидации статистики кэша
 */
export const cacheStatsSchema = z.object({
    totalKeys: z.number().int().min(0),
    memoryUsage: z.number().int().min(0),
    hitRate: z.number().min(0).max(1),
    lastCleanup: z.date().optional(),
})
