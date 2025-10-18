import type { SearchFilters, SearchResult } from '../../types/search'

/**
 * Кэш для результатов поиска
 */
export interface SearchCacheEntry {
    /** Результаты поиска */
    results: SearchResult[]
    /** Время создания кэша */
    timestamp: number
    /** Время жизни кэша в миллисекундах */
    ttl: number
}

/**
 * Сервис кэширования результатов поиска
 */
export class SearchCache {
    private cache = new Map<string, SearchCacheEntry>()
    private defaultTtl = 5 * 60 * 1000 // 5 минут

    /**
     * Получает результаты поиска из кэша
     * @param query - Поисковый запрос
     * @param filters - Фильтры поиска
     * @returns Результаты поиска или null если не найдены
     */
    get(query: string, filters: SearchFilters = {}): SearchResult[] | null {
        const key = this.generateCacheKey(query, filters)
        const entry = this.cache.get(key)

        if (!entry) {
            return null
        }

        // Проверяем, не истек ли кэш
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key)
            return null
        }

        return entry.results
    }

    /**
     * Сохраняет результаты поиска в кэш
     * @param query - Поисковый запрос
     * @param filters - Фильтры поиска
     * @param results - Результаты поиска
     * @param ttl - Время жизни кэша в миллисекундах
     */
    set(
        query: string,
        filters: SearchFilters,
        results: SearchResult[],
        ttl?: number
    ): void {
        const key = this.generateCacheKey(query, filters)
        const entry: SearchCacheEntry = {
            results,
            timestamp: Date.now(),
            ttl: ttl || this.defaultTtl,
        }

        this.cache.set(key, entry)
    }

    /**
     * Удаляет результаты поиска из кэша
     * @param query - Поисковый запрос
     * @param filters - Фильтры поиска
     */
    delete(query: string, filters: SearchFilters = {}): void {
        const key = this.generateCacheKey(query, filters)
        this.cache.delete(key)
    }

    /**
     * Очищает весь кэш
     */
    clear(): void {
        this.cache.clear()
    }

    /**
     * Инвалидирует все результаты поиска
     * Вызывается при изменении документов
     */
    invalidateAll(): void {
        this.clear()
    }

    /**
     * Получает статистику кэша
     * @returns Статистика использования кэша
     */
    getStats(): {
        size: number
        hitRate: number
        totalHits: number
        totalMisses: number
    } {
        const totalHits = this.totalHits
        const totalMisses = this.totalMisses
        const total = totalHits + totalMisses

        return {
            size: this.cache.size,
            hitRate: total > 0 ? totalHits / total : 0,
            totalHits,
            totalMisses,
        }
    }

    /**
     * Генерирует ключ кэша на основе запроса и фильтров
     * @param query - Поисковый запрос
     * @param filters - Фильтры поиска
     * @returns Ключ кэша
     */
    private generateCacheKey(query: string, filters: SearchFilters): string {
        const filterString = JSON.stringify(filters)
        return `${query}:${filterString}`
    }

    // Счетчики для статистики
    private totalHits = 0
    private totalMisses = 0
}
