import { z } from 'zod';

import {
    cacheOperationResultSchema,
    cacheOptionsSchema,
    cacheStatsSchema,
} from '../schemas/cache';

export type CacheOptions = z.infer<typeof cacheOptionsSchema>;
export type CacheOperationResult = z.infer<typeof cacheOperationResultSchema>;
export type CacheStats = z.infer<typeof cacheStatsSchema>;
