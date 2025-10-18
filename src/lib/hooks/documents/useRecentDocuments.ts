// src/lib/hooks/documents/useRecentDocuments.ts
import useSWR from 'swr'

import type { DocumentWithAuthor, SearchResult } from '@/lib/types/document'

const RECENT_DOCUMENTS_KEY = 'recent-documents'
const MAX_RECENT_DOCUMENTS = 10

type RecentDocument =
    | DocumentWithAuthor
    | (SearchResult & {
          viewedAt: string
      })

// Функция для получения данных из localStorage
const getRecentDocuments = (): RecentDocument[] => {
    if (typeof window === 'undefined') return []
    try {
        const stored = localStorage.getItem(RECENT_DOCUMENTS_KEY)
        return stored ? JSON.parse(stored) : []
    } catch (error) {
        console.error('Failed to parse recent documents:', error)
        return []
    }
}

export const useRecentDocuments = () => {
    const { data: recentDocuments, mutate } = useSWR<RecentDocument[]>(
        RECENT_DOCUMENTS_KEY,
        getRecentDocuments,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            fallbackData: [],
        }
    )

    const addRecentDocument = (document: DocumentWithAuthor | SearchResult) => {
        const current = getRecentDocuments()

        // Убираем документ если уже есть
        const filtered = current.filter(
            d => d.id !== document.id && !d?.deletedAt
        )

        // Добавляем новый документ в начало с текущим временем
        const updated = [
            {
                ...document,
                viewedAt: new Date().toISOString(),
            },
            ...filtered,
        ].slice(0, MAX_RECENT_DOCUMENTS)

        // Сохраняем в localStorage
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(
                    RECENT_DOCUMENTS_KEY,
                    JSON.stringify(updated)
                )
                console.log(
                    'Recent documents updated:',
                    updated?.map(d => d?.id)
                )
            } catch (error) {
                console.error('Failed to save recent documents:', error)
            }
        }

        mutate(updated, false)
    }

    const removeRecentDocument = (documentId: string) => {
        // Читаем свежие данные прямо из localStorage
        const current = getRecentDocuments()
        const updated = current.filter(
            doc => doc.id !== documentId && !doc?.deletedAt
        )

        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(
                    RECENT_DOCUMENTS_KEY,
                    JSON.stringify(updated)
                )
            } catch (error) {
                console.error(
                    'Failed to save recent documents after removal:',
                    error
                )
            }
        }

        // Обновляем состояние SWR для всех компонентов, использующих этот хук
        mutate(updated, false)
    }

    return {
        recentDocuments: recentDocuments || [],
        addRecentDocument,
        removeRecentDocument,
    }
}
