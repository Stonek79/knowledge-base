import {
    IndexStatus,
    SearchDocument,
    SearchOptions,
    SearchResult,
} from '../../types/search';

/**
 * Интерфейс поискового движка для возможности замены
 * В будущем FlexSearch может быть заменен на Elasticsearch
 */
export interface SearchEngine {
    search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
    indexDocument(document: SearchDocument): Promise<void>;
    removeDocument(documentId: string): Promise<void>;
    reindexAll(documents: SearchDocument[]): Promise<void>;
    getIndexStatus(): Promise<IndexStatus>;
    clearIndex(): Promise<void>;
}
