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
        if (this.restorePromise) await this.restorePromise

        // Оставляем только буквы и цифры, чтобы запрос соответствовал токенизации FlexSearch
        const sanitizedQuery = query.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim()
        const tokens = sanitizedQuery.split(/\s+/).filter(Boolean)

        if (tokens.length === 0) return []

        // Формируем запрос с оператором AND для поиска всех слов
        const searchQuery = tokens.join(' AND ')

        const results = await this.index.search(searchQuery, {
            limit: 50,
            suggest: true,
        })

        const searchResults: SearchResult[] = []

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
                relevance: this.calculateRelevance(sanitizedQuery, doc),
                highlights: this.extractHighlights(sanitizedQuery, doc),
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
        const queryTokens = query.toLowerCase().split(/\s+/).filter(Boolean)
        if (queryTokens.length === 0) return 0.5

        let score = 0
        const titleLower = doc.title.toLowerCase()
        const descriptionLower = doc.description?.toLowerCase() || ''
        const contentLower = doc.content.toLowerCase()
        const keywordsLower = doc.keywords?.map(k => k.toLowerCase()) || []
        const categoriesLower = doc.categories.map(c => c.toLowerCase())

        // Проверяем, что все токены есть в поле, прежде чем начислять очки
        if (queryTokens.every(token => titleLower.includes(token))) score += 3
        if (
            queryTokens.every(token =>
                keywordsLower.some(k => k.includes(token))
            )
        )
            score += 2
        if (queryTokens.every(token => descriptionLower.includes(token)))
            score += 1
        if (queryTokens.every(token => contentLower.includes(token))) score += 1
        if (
            queryTokens.every(token =>
                categoriesLower.some(c => c.includes(token))
            )
        )
            score += 1

        return Math.min(score / 7, 1.0)
    }

    private extractHighlights(query: string, doc: SearchDocument): string[] {
        const highlights: string[] = []
        const queryTokens = query.toLowerCase().split(/\s+/).filter(Boolean)
        if (queryTokens.length === 0) return []

        // Подсветка в заголовке (если все токены есть)
        const titleLower = doc.title.toLowerCase()
        if (queryTokens.every(token => titleLower.includes(token))) {
            highlights.push(doc.title)
        }

        // Подсветка в описании (если все токены есть)
        if (doc.description) {
            const descriptionLower = doc.description.toLowerCase()
            if (queryTokens.every(token => descriptionLower.includes(token))) {
                highlights.push(doc.description)
            }
        }

        // Извлечение фрагментов из контента
        const contentFragments = this.extractContentFragments(
            doc.content,
            queryTokens
        )
        highlights.push(...contentFragments)

        return highlights.slice(0, 3) // Максимум 3 фрагмента
    }

    private extractContentFragments(
        content: string,
        queryTokens: string[]
    ): string[] {
        if (queryTokens.length === 0) return []

        const fragments: string[] = []
        const sentences = content
            .split(/[.!?]+/)
            .filter(s => s.trim().length > 0)

        for (const sentence of sentences) {
            const sentenceLower = sentence.toLowerCase()
            // Ищем предложения, где есть ВСЕ слова из запроса
            if (queryTokens.every(token => sentenceLower.includes(token))) {
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
