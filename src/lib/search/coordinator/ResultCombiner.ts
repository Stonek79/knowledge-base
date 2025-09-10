import { SearchResult } from '../../types/search';

/**
 * Комбинирует результаты поиска из разных источников
 */
export class ResultCombiner {
    /**
     * Объединяет результаты текстового поиска и поиска по метаданным
     * @param textResults - Результаты текстового поиска
     * @param metadataResults - Результаты поиска по метаданным
     * @param query - Поисковый запрос
     * @returns Объединенные результаты
     */
    combineResults(
        textResults: SearchResult[],
        metadataResults: SearchResult[],
        query: string
    ): SearchResult[] {
        const combined = new Map<string, SearchResult>();

        // Добавляем результаты текстового поиска
        textResults.forEach(result => {
            combined.set(result.documentId, {
                ...result,
                source: 'text' as const,
            });
        });

        // Добавляем результаты поиска по метаданным
        metadataResults.forEach(result => {
            const existing = combined.get(result.documentId);
            if (existing) {
                // Если документ уже найден, повышаем релевантность
                combined.set(result.documentId, {
                    ...existing,
                    relevance: Math.min(existing.relevance + 0.2, 1),
                    source: 'combined' as const,
                });
            } else {
                combined.set(result.documentId, {
                    ...result,
                    source: 'metadata' as const,
                });
            }
        });

        // Сортируем по релевантности
        return Array.from(combined.values()).sort(
            (a, b) => b.relevance - a.relevance
        );
    }

    /**
     * Удаляет дубликаты из результатов поиска
     * @param results - Результаты поиска
     * @returns Результаты без дубликатов
     */
    removeDuplicates(results: SearchResult[]): SearchResult[] {
        const seen = new Set<string>();
        return results.filter(result => {
            if (seen.has(result.documentId)) {
                return false;
            }
            seen.add(result.documentId);
            return true;
        });
    }

    /**
     * Группирует результаты по категориям
     * @param results - Результаты поиска
     * @returns Сгруппированные результаты
     */
    groupByCategory(results: SearchResult[]): Map<string, SearchResult[]> {
        const grouped = new Map<string, SearchResult[]>();

        results.forEach(result => {
            const category = result.metadata.categoryName || 'Без категории';
            if (!grouped.has(category)) {
                grouped.set(category, []);
            }
            grouped.get(category)!.push(result);
        });

        return grouped;
    }
}
