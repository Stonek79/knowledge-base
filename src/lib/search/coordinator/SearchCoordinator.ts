import { SearchFilters, SearchOptions, SearchResult } from '../../types/search';
import { SearchEngine } from '../interfaces/SearchEngine';
import { ResultCombiner } from './ResultCombiner';

/**
 * Координатор поиска, объединяющий результаты из разных источников
 */
export class SearchCoordinator {
    private textSearchEngine: SearchEngine;
    private resultCombiner: ResultCombiner;

    constructor(textSearchEngine: SearchEngine) {
        this.textSearchEngine = textSearchEngine;
        this.resultCombiner = new ResultCombiner();
    }

    /**
     * Выполняет комбинированный поиск по тексту и метаданным
     * @param query - Поисковый запрос
     * @param filters - Фильтры для метаданных
     * @param options - Опции поиска
     * @returns Объединенные результаты поиска
     */
    async search(
        query: string,
        filters: SearchFilters = {},
        options: SearchOptions = {}
    ): Promise<SearchResult[]> {
        try {
            // Поиск по тексту через FlexSearch
            const textResults = await this.textSearchEngine.search(
                query,
                options
            );

            // Поиск по метаданным через PostgreSQL (будет реализован позже)
            const metadataResults = await this.searchByMetadata(
                filters,
                options
            );

            // Объединяем результаты
            const combinedResults = this.resultCombiner.combineResults(
                textResults,
                metadataResults,
                query
            );

            return combinedResults;
        } catch (error) {
            console.error('Ошибка координации поиска:', error);
            return [];
        }
    }

    /**
     * Поиск только по метаданным через PostgreSQL
     * @param filters - Фильтры для поиска
     * @param options - Опции поиска
     * @returns Документы, соответствующие фильтрам
     */
    private async searchByMetadata(
        filters: SearchFilters,
        options: SearchOptions
    ): Promise<SearchResult[]> {
        // TODO: Реализовать поиск по метаданным через Prisma
        // Пока возвращаем пустой массив
        return [];
    }

    /**
     * Поиск только по содержимому через FlexSearch
     * @param query - Текстовый запрос
     * @param options - Опции поиска
     * @returns Результаты текстового поиска
     */
    async searchByContent(
        query: string,
        options: SearchOptions = {}
    ): Promise<SearchResult[]> {
        return await this.textSearchEngine.search(query, options);
    }

    /**
     * Получает статус поискового движка
     * @returns Статус индекса
     */
    async getSearchEngineStatus() {
        return await this.textSearchEngine.getIndexStatus();
    }
}
