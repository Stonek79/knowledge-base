import { z } from 'zod';

import {
    documentMetadataSchema,
    extendedSearchOptionsSchema,
    highlightSchema,
    indexOptionsSchema,
    indexStatusSchema,
    searchDocumentSchema,
    searchEngineConfigSchema,
    searchFiltersSchema,
    searchOptionsSchema,
    searchResultSchema,
    searchResultsSchema,
    searchStatsSchema,
} from '../schemas/search';

export type SearchOptions = z.infer<typeof searchOptionsSchema>;
export type SearchFilters = z.infer<typeof searchFiltersSchema>;
export type Highlight = z.infer<typeof highlightSchema>;
export type DocumentMetadata = z.infer<typeof documentMetadataSchema>;
export type SearchResult = z.infer<typeof searchResultSchema>;
export type SearchDocument = z.infer<typeof searchDocumentSchema>;
export type IndexStatus = z.infer<typeof indexStatusSchema>;
export type IndexOptions = z.infer<typeof indexOptionsSchema>;
export type SearchEngineConfig = z.infer<typeof searchEngineConfigSchema>;
export type SearchResults = z.infer<typeof searchResultsSchema>;
export type SearchStats = z.infer<typeof searchStatsSchema>;

// Будущие типы для Elasticsearch
export type ExtendedSearchOptions = z.infer<typeof extendedSearchOptionsSchema>;
