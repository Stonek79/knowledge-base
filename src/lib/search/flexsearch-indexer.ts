import { Index } from 'flexsearch'

import {
    clearIndexDump,
    loadDocs,
    loadIndexDump,
    saveDocs,
    saveIndexDump,
} from '@/lib/search/persistence'
import type {
    DocumentWithAuthor,
    SearchDocument,
    SearchFilters,
    SearchResult,
} from '@/lib/types/document'

const MAX_PREVIEW = 8_000

export class FlexSearchIndexer {
    private restorePromise: Promise<void> | null = null
    private index: Index
    private documents: Map<string, SearchDocument> = new Map()

    constructor() {
        this.index = new Index({
            tokenize: 'full', // матч внутри слова; 'forward' — префиксы
            resolution: 7, // снизит размер/память, оставит хороший скор
            cache: true,
            encoder: 'Normalize', // нормализация/регистронезависимость
        })

        this.restorePromise = this.restore()
    }

    async indexDocument(document: DocumentWithAuthor): Promise<void> {
        if (this.restorePromise) await this.restorePromise

        const searchDoc: SearchDocument = {
            id: document.id,
            title: document.title,
            content: document.content,
            description: document.description || '',
            keywords: document.keywords || [],
            categories: document.categories.map(c => c.category.name),
            categoryIds: document.categories.map(c => c.category.id),
            author: document.author.username,
            authorId: document.author.id,
            createdAt: document.createdAt,
        }

        this.documents.set(document.id, searchDoc)

        // Индексируем текст для поиска
        const searchText = `${searchDoc.title} ${searchDoc.content} ${searchDoc.description} ${searchDoc.keywords}`
        await this.index.add(document.id, searchText)
        await this.persist()
    }

    async search(
        query: string,
        filters?: SearchFilters
    ): Promise<SearchResult[]> {
        console.log('[FlexSearchIndexer] search query:', query)
        console.log('[FlexSearchIndexer] search filters:', filters)

        if (this.restorePromise) await this.restorePromise

        // if (!query.trim()) return [];

        // ✅ Правильный вызов FlexSearch API
        const results = await this.index.search(query, {
            limit: 50,
            suggest: true,
        })

        console.log('[FlexSearchIndexer] search results:', results)

        const searchResults: SearchResult[] = []

        // ✅ Обработка результатов FlexSearch
        for (const result of results) {
            const doc = this.documents.get(result.toString())
            if (!doc) continue

            if (filters && !this.matchesFilters(doc, filters)) continue

            searchResults.push({
                id: doc.id,
                title: doc.title,
                content: doc.content,
                description: doc.description,
                author: doc.author,
                createdAt: doc.createdAt,
                relevance: this.calculateRelevance(query, doc),
                highlights: this.extractHighlights(query, doc),
                keywords: doc.keywords,
            })
        }

        return searchResults.sort((a, b) => b.relevance - a.relevance)
    }

    async removeFromIndex(documentId: string): Promise<void> {
        if (this.restorePromise) await this.restorePromise

        this.documents.delete(documentId)
        await this.index.remove(documentId)
        await this.persist()
    }

    async reindexAll(documents: DocumentWithAuthor[]): Promise<void> {
        if (this.restorePromise) await this.restorePromise

        this.documents.clear()
        await this.index.clear()

        await clearIndexDump()

        for (const document of documents) {
            await this.indexDocument(document)
        }
        await this.persist()
    }

    private matchesFilters(
        doc: SearchDocument,
        filters: SearchFilters
    ): boolean {
        if (filters.categoryIds?.length) {
            const has = filters.categoryIds.some(id =>
                doc.categoryIds?.includes(id)
            )
            if (!has) return false
        }

        if (filters.authorId && doc.authorId !== filters.authorId) {
            return false
        }

        if (filters.dateFrom && doc.createdAt < filters.dateFrom) {
            return false
        }

        if (filters.dateTo && doc.createdAt > filters.dateTo) {
            return false
        }

        return true
    }

    private calculateRelevance(query: string, doc: SearchDocument): number {
        // Если запрос пустой - возвращаем базовую релевантность
        if (!query || query.trim() === '') {
            return 0.5 // Базовая релевантность для всех документов
        }

        const queryLower = query.toLowerCase()
        let score = 0

        // Поиск в заголовке (высший приоритет)
        if (doc.title.toLowerCase().includes(queryLower)) score += 3

        // Поиск в ключевых словах
        if (doc.keywords?.some(k => k.toLowerCase().includes(queryLower)))
            score += 2

        // Поиск в описании
        if (doc.description?.toLowerCase().includes(queryLower)) score += 1

        // Поиск в контенте
        if (doc.content.toLowerCase().includes(queryLower)) score += 1

        // Поиск в категориях
        if (doc.categories.some(cat => cat.toLowerCase().includes(queryLower)))
            score += 1

        return Math.min(score / 7, 1.0)
    }

    private extractHighlights(query: string, doc: SearchDocument): string[] {
        const highlights: string[] = []
        const queryLower = query.toLowerCase()

        // Подсветка в заголовке
        if (doc.title.toLowerCase().includes(queryLower)) {
            highlights.push(doc.title)
        }

        // Подсветка в описании
        if (doc.description?.toLowerCase().includes(queryLower)) {
            highlights.push(doc.description)
        }

        // Извлечение фрагментов из контента
        const contentFragments = this.extractContentFragments(
            doc.content,
            queryLower
        )
        highlights.push(...contentFragments)

        return highlights.slice(0, 3) // Максимум 3 фрагмента
    }

    private extractContentFragments(content: string, query: string): string[] {
        const fragments: string[] = []
        const sentences = content
            .split(/[.!?]+/)
            .filter(s => s.trim().length > 0)

        for (const sentence of sentences) {
            if (sentence.toLowerCase().includes(query)) {
                const fragment = sentence.trim().substring(0, 200)
                if (fragment.length > 50) {
                    fragments.push(
                        fragment + (fragment.length === 200 ? '...' : '')
                    )
                }
            }
        }

        return fragments.slice(0, 2)
    }

    private async persist(): Promise<void> {
        try {
            const dump: Record<string, string> = {}
            this.index.export((key: string, data: string) => {
                dump[key] = data
            })
            await saveIndexDump(dump)

            const docsObj = Object.fromEntries(
                Array.from(this.documents.entries()).map(([id, doc]) => [
                    id,
                    {
                        ...doc,
                        content:
                            doc.content.length > MAX_PREVIEW
                                ? doc.content.slice(0, MAX_PREVIEW)
                                : doc.content,
                    },
                ])
            )

            await saveDocs(docsObj)
        } catch (e) {
            console.error('[persist]', e)
        }
    }

    private async restore(): Promise<void> {
        try {
            const dump = await loadIndexDump()
            for (const [k, v] of Object.entries(dump)) this.index.import(k, v)
            const docs = await loadDocs()
            this.documents = new Map(
                Object.entries(docs) as Array<[string, SearchDocument]>
            )
        } catch (e) {
            // если сюда дошло — это уже не “NoSuchKey”, но всё равно не валим поток
            console.warn(
                '[FlexSearch restore] non-critical restore issue:',
                e instanceof Error ? e.message : e
            )
            this.documents = new Map()
        }
    }

    public isEmpty(): boolean {
        return this.documents.size === 0
    }
}
