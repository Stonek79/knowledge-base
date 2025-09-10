import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

import {
    DocumentWithAuthor,
    SearchDocument,
    SearchFilters,
    SearchResult,
} from '@/lib/types/document';

export class DocumentIndexer {
    private index: Map<string, SearchDocument> = new Map();
    private indexPath: string;
    private initialized = false;

    constructor() {
        this.indexPath = join(process.cwd(), 'storage', 'search-index.json');
    }

    async indexDocument(document: DocumentWithAuthor): Promise<void> {
        await this.ready();
        const searchDoc: SearchDocument = {
            id: document.id,
            title: document.title,
            content: document.content,
            description: document.description || '',
            keywords: document.keywords || '',
            categories: document.categories.map(c => c.category.name),
            categoryIds: document.categories.map(c => c.category.id),
            author: document.author.username,
            authorId: document.author.id,
            createdAt: document.createdAt,
        };

        this.index.set(document.id, searchDoc);
        await this.saveIndex();
    }

    isEmpty(): boolean {
        return this.index.size === 0;
    }

    async removeFromIndex(documentId: string): Promise<void> {
        await this.ready();
        this.index.delete(documentId);
        await this.saveIndex();
    }

    async search(
        query: string,
        filters?: SearchFilters
    ): Promise<SearchResult[]> {
        await this.ready();
        const results: SearchResult[] = [];

        for (const [documentId, doc] of this.index) {
            console.log('[DocumentIndexer] doc', doc);
            console.log('[DocumentIndexer] query', query);

            // Поиск по тексту
            const matchesQuery =
                query === '' ||
                doc.title.toLowerCase().includes(query.toLowerCase()) ||
                doc.content.toLowerCase().includes(query.toLowerCase()) ||
                doc.keywords.some(k => k.toLowerCase().includes(query.toLowerCase())) ||
                doc.description?.toLowerCase().includes(query.toLowerCase());

            if (!matchesQuery) continue;

            // Применение фильтров
            let matchesFilters = true;

            if (filters) {
                // Фильтр по категориям

                if (filters?.categoryIds?.length) {
                    const has = filters.categoryIds.some(id =>
                        doc.categoryIds?.includes(id)
                    );
                    if (!has) continue;
                }

                // Фильтр по автору
                if (filters.authorId) {
                    if (doc.authorId !== filters.authorId) continue;
                }

                // Фильтр по датам
                if (filters.dateFrom) {
                    if (doc.createdAt < filters.dateFrom) continue;
                }
                if (filters.dateTo) {
                    if (doc.createdAt > filters.dateTo) continue;
                }
            }

            if (matchesFilters) {
                results.push({
                    id: documentId,
                    title: doc.title,
                    content: doc.content,
                    description: doc.description,
                    keywords: doc.keywords,
                    author: doc.author,
                    createdAt: doc.createdAt,
                    relevance: 1.0,
                    highlights: [],
                });
            }
        }

        return results.map(result => ({
            ...result,
            relevance: this.calculateRelevance(query, result),
            highlights: this.extractHighlights(query, result),
        }));
    }

    private async ready(): Promise<void> {
        if (this.initialized) return;
        await this.loadIndex();
        this.initialized = true;
    }

    private async loadIndex(): Promise<void> {
        try {
            const data = await readFile(this.indexPath, 'utf-8');
            const indexData = JSON.parse(data);
            this.index = new Map(Object.entries(indexData));
        } catch (error) {
            console.error(error);
            // Индекс не существует, создаем пустой
            this.index = new Map();
        }
    }

    private async saveIndex(): Promise<void> {
        const indexData = Object.fromEntries(this.index);
        await writeFile(this.indexPath, JSON.stringify(indexData, null, 2));
    }

    async reindexAll(documents: DocumentWithAuthor[]): Promise<void> {
        this.index.clear();
        for (const document of documents) {
            await this.indexDocument(document);
        }
    }

    private calculateRelevance(query: string, result: SearchResult): number {
        // Простой алгоритм релевантности
        const queryLower = query.toLowerCase();
        const titleMatch = result.title.toLowerCase().includes(queryLower)
            ? 2
            : 0;
        const contentMatch = result.content.toLowerCase().includes(queryLower)
            ? 1
            : 0;
        return Math.min((titleMatch + contentMatch) / 3, 1.0);
    }

    private extractHighlights(query: string, result: SearchResult): string[] {
        // Простая подсветка
        const highlights: string[] = [];
        const queryLower = query.toLowerCase();

        if (result.title.toLowerCase().includes(queryLower)) {
            highlights.push(result.title);
        }

        // Извлечение фрагментов из контента
        const contentFragments = this.extractContentFragments(
            result.content,
            queryLower
        );
        highlights.push(...contentFragments);

        return highlights;
    }

    private extractContentFragments(content: string, query: string): string[] {
        const fragments: string[] = [];
        const contentLower = content.toLowerCase();
        const queryLower = query.toLowerCase();

        // Разбиваем контент на предложения
        const sentences = contentLower
            .split(/[.!?]+/)
            .filter(s => s.trim().length > 0);

        for (const sentence of sentences) {
            if (sentence.toLowerCase().includes(queryLower)) {
                // Ограничиваем длину фрагмента
                const fragment = sentence.trim().substring(0, 200);
                if (fragment.length > 50) {
                    // Минимальная длина фрагмента
                    fragments.push(
                        fragment + (fragment.length === 200 ? '...' : '')
                    );
                }
            }
        }

        // Возвращаем максимум 3 фрагмента
        return fragments.slice(0, 3);
    }
}
