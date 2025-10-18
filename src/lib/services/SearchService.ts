import { SearchCache } from '../search/cache/SearchCache'
import { SearchCoordinator } from '../search/coordinator/SearchCoordinator'
import { FlexSearchEngine } from '../search/implementations/flexsearch/FlexSearchEngine'
import type {
    SearchDocument,
    SearchFilters,
    SearchOptions,
    SearchResult,
} from '../types/search'

/**
 * Основной сервис поиска, объединяющий все компоненты
 */
export class SearchService {
    private coordinator: SearchCoordinator
    private cache: SearchCache
    private textEngine: FlexSearchEngine

    constructor() {
        this.textEngine = new FlexSearchEngine({
            resolution: 7,
            tokenize: 'full',
            cache: true,
        })

        this.coordinator = new SearchCoordinator(this.textEngine)
        this.cache = new SearchCache()
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
        // Проверяем кэш
        const cachedResults = this.cache.get(query, filters)
        if (cachedResults) {
            return cachedResults
        }

        // Выполняем поиск
        const results = await this.coordinator.search(query, filters, options)

        // Сохраняем в кэш
        this.cache.set(query, filters, results)

        return results
    }

    /**
     * Поиск только по метаданным через PostgreSQL
     * @param filters - Фильтры для поиска
     * @param options - Опции поиска
     * @returns Документы, соответствующие фильтрам
     */
    async searchByMetadata(
        filters: SearchFilters,
        options: SearchOptions = {}
    ): Promise<SearchResult[]> {
        return await this.coordinator.search('', filters, options)
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
        return await this.coordinator.searchByContent(query, options)
    }

    /**
     * Индексирует документ для поиска
     * @param document - Документ для индексации
     */
    async indexDocument(document: SearchDocument): Promise<void> {
        await this.textEngine.indexDocument(document)
        // Инвалидируем кэш при изменении документов
        this.cache.invalidateAll()
    }

    /**
     * Удаляет документ из индекса
     * @param documentId - ID документа для удаления
     */
    async removeDocument(documentId: string): Promise<void> {
        await this.textEngine.removeDocument(documentId)
        this.cache.invalidateAll()
    }

    /**
     * Переиндексирует все документы
     * @param documents - Массив документов для индексации
     */
    async reindexAll(documents: SearchDocument[]): Promise<void> {
        await this.textEngine.reindexAll(documents)
        this.cache.invalidateAll()
    }

    /**
     * Получает статус поискового движка
     * @returns Статус индекса
     */
    async getSearchEngineStatus() {
        return await this.coordinator.getSearchEngineStatus()
    }

    /**
     * Получает статистику кэша
     * @returns Статистика использования кэша
     */
    getCacheStats() {
        return this.cache.getStats()
    }

    /**
     * Очищает кэш поиска
     */
    clearCache(): void {
        this.cache.clear()
    }
}

// Экспорт экземпляра для использования в приложении
export const searchService = new SearchService()
