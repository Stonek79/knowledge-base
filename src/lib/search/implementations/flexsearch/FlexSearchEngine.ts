import { DefaultSearchResults, Index } from 'flexsearch';

import {
    Highlight,
    IndexStatus,
    SearchDocument,
    SearchEngineConfig,
    SearchOptions,
    SearchResult,
} from '../../../types/search';
import { SearchEngine } from '../../interfaces/SearchEngine';

/**
 * Конфигурация FlexSearch
 */
export type FlexSearchConfig = SearchEngineConfig;

/**
 * Реализация поискового движка на основе FlexSearch
 * Обеспечивает полнотекстовый поиск с поддержкой нечеткого поиска
 */
export class FlexSearchEngine implements SearchEngine {
    private index: Index;
    private documents: Map<string, SearchDocument> = new Map();
    private config: FlexSearchConfig;

    constructor(config: FlexSearchConfig = {}) {
        this.config = {
            resolution: config.resolution || 7,
            tokenize: config.tokenize || 'full',
            cache: config.cache ?? true,
            language: config.language || 'ru',
            threshold: config.threshold || 0.1,
        };

        this.index = new Index({
            tokenize: this.config.tokenize,
            resolution: this.config.resolution,
            cache: this.config.cache ? 100 : false, // Кэш на 100 слотов
            encoder: 'Normalize',
        });
    }

    /**
     * Выполняет поиск по тексту с использованием FlexSearch
     * @param query - Поисковый запрос
     * @param options - Опции поиска
     * @returns Результаты поиска с релевантностью
     */
    async search(
        query: string,
        options: SearchOptions = {}
    ): Promise<SearchResult[]> {
        try {
            const results = await this.index.search(query, {
                limit: options.limit || 100,
                offset: options.offset || 0,
            });

            return this.processSearchResults(results, query, options);
        } catch (error) {
            console.error('Ошибка поиска FlexSearch:', error);
            return [];
        }
    }

    /**
     * Индексирует документ для поиска
     * @param document - Документ для индексации
     */
    async indexDocument(document: SearchDocument): Promise<void> {
        try {
            // Создаем строку для индексации (FlexSearch принимает только строку)
            const indexContent = [
                document.title,
                document.description || '',
                document.content,
                document.metadata.tags.join(' '),
                document.metadata.authorName,
                document.metadata.categoryName || '',
                document.keywords.join(' '),
            ].join(' ');

            // Добавляем в индекс
            await this.index.add(document.id, indexContent);

            // Сохраняем документ в памяти
            this.documents.set(document.id, document);

            console.log(`Документ ${document.id} проиндексирован`);
        } catch (error) {
            console.error(`Ошибка индексации документа ${document.id}:`, error);
            throw error;
        }
    }

    /**
     * Удаляет документ из индекса
     * @param documentId - ID документа для удаления
     */
    async removeDocument(documentId: string): Promise<void> {
        try {
            await this.index.remove(documentId);
            this.documents.delete(documentId);
            console.log(`Документ ${documentId} удален из индекса`);
        } catch (error) {
            console.error(`Ошибка удаления документа ${documentId}:`, error);
            throw error;
        }
    }

    /**
     * Переиндексирует все документы
     * @param documents - Массив документов для индексации
     */
    async reindexAll(documents: SearchDocument[]): Promise<void> {
        try {
            // Очищаем текущий индекс
            await this.clearIndex();

            // Индексируем все документы
            for (const document of documents) {
                await this.indexDocument(document);
            }

            console.log(`Переиндексировано ${documents.length} документов`);
        } catch (error) {
            console.error('Ошибка переиндексации:', error);
            throw error;
        }
    }

    /**
     * Проверяет состояние индекса
     * @returns Статус индекса
     */
    async getIndexStatus(): Promise<IndexStatus> {
        try {
            const documentCount = this.documents.size;
            const indexSize = documentCount * 1024;
            const lastUpdated = new Date();

            return {
                documentCount,
                indexSize,
                lastUpdated,
                status: 'ready',
            };
        } catch (error) {
            return {
                documentCount: 0,
                indexSize: 0,
                lastUpdated: new Date(),
                status: 'error',
                errors: [
                    error instanceof Error
                        ? error.message
                        : 'Неизвестная ошибка',
                ],
            };
        }
    }

    /**
     * Очищает индекс
     */
    async clearIndex(): Promise<void> {
        try {
            await this.index.clear();
            this.documents.clear();
            console.log('Индекс очищен');
        } catch (error) {
            console.error('Ошибка очистки индекса:', error);
            throw error;
        }
    }

    /**
     * Обрабатывает результаты поиска FlexSearch
     * @param results - Сырые результаты FlexSearch
     * @param query - Поисковый запрос
     * @param options - Опции поиска
     * @returns Обработанные результаты поиска
     */
    private processSearchResults(
        results: DefaultSearchResults,
        query: string,
        options: SearchOptions
    ): SearchResult[] {
        const searchResults: SearchResult[] = [];

        for (const documentId of results) {
            const document = this.documents.get(documentId.toString());
            if (!document) continue;

            const relevance = this.calculateRelevance(document, query);
            const highlights = this.generateHighlights(document, query);

            searchResults.push({
                documentId: document.id,
                title: document.title,
                description: document.description,
                relevance,
                highlights,
                metadata: document.metadata,
                source: 'text' as const,
            });
        }

        // Применяем лимиты из опций
        let finalResults = searchResults;

        if (options.limit) {
            const start = options.offset || 0;
            const end = start + options.limit;
            finalResults = searchResults.slice(start, end);
        }

        // Сортируем по релевантности
        return finalResults.sort((a, b) => b.relevance - a.relevance);
    }

    /**
     * Вычисляет релевантность результата
     * @param document - Документ для анализа
     * @param query - Поисковый запрос
     * @returns Релевантность (0-1)
     */
    private calculateRelevance(
        document: SearchDocument,
        query: string
    ): number {
        const queryWords = query.toLowerCase().split(/\s+/);
        const titleMatch = queryWords.filter(word =>
            document.title.toLowerCase().includes(word)
        ).length;
        const contentMatch = queryWords.filter(word =>
            document.content.toLowerCase().includes(word)
        ).length;

        const totalWords = queryWords.length;
        const titleScore = (titleMatch / totalWords) * 0.6;
        const contentScore = (contentMatch / totalWords) * 0.4;

        return Math.min(titleScore + contentScore, 1);
    }

    /**
     * Генерирует подсвеченные фрагменты текста
     * @param document - Документ
     * @param query - Поисковый запрос
     * @returns Массив подсвеченных фрагментов
     */
    private generateHighlights(
        document: SearchDocument,
        query: string
    ): Highlight[] {
        const highlights: Highlight[] = [];
        const queryWords = query.toLowerCase().split(/\s+/);

        // Ищем в заголовке
        queryWords.forEach(word => {
            const index = document.title.toLowerCase().indexOf(word);
            if (index !== -1) {
                highlights.push({
                    text: document.title.substring(index, index + word.length),
                    field: 'title',
                    position: index,
                    length: word.length,
                });
            }
        });

        // Ищем в содержимом
        queryWords.forEach(word => {
            const index = document.content.toLowerCase().indexOf(word);
            if (index !== -1) {
                const start = Math.max(0, index - 20);
                const end = Math.min(
                    document.content.length,
                    index + word.length + 20
                );
                highlights.push({
                    text: document.content.substring(start, end),
                    field: 'content',
                    position: index,
                    length: word.length,
                });
            }
        });

        return highlights;
    }
}
