import { z } from 'zod';

import {
    aggregationOptionsSchema,
    documentFiltersSchema,
    paginationOptionsSchema,
    sortOptionsSchema,
} from '../schemas/filter';

export type DocumentFilters = z.infer<typeof documentFiltersSchema>;
export type SortOptions = z.infer<typeof sortOptionsSchema>;
export type PaginationOptions = z.infer<typeof paginationOptionsSchema>;
export type AggregationOptions = z.infer<typeof aggregationOptionsSchema>;
