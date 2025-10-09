import { useCallback, useMemo } from 'react';

import useSWR from 'swr';

import { API_DOCUMENTS_PATH } from '@/constants/api';
import { makeSWRFetcher } from '@/lib/api/apiHelper';
import { DocumentFilters, DocumentListResponse } from '@/lib/types/document';

const fetcher = makeSWRFetcher({ returnNullOn401: false });

export const useDocuments = (filters: DocumentFilters) => {
    // Мемоизируем queryString
    const queryString = useMemo(() => {
        const params = new URLSearchParams({
            page: filters?.page?.toString() || '1',
            limit: filters?.limit?.toString() || '10',
            ...(filters?.q && { q: filters.q }),
            ...(filters?.categoryIds && {
                categoryIds: filters.categoryIds.join(','),
            }),
            ...(filters?.sortBy && { sortBy: filters.sortBy }),
            ...(filters?.sortOrder && { sortOrder: filters.sortOrder }),
            ...(filters?.authorId && { authorId: filters.authorId }),
            ...(filters?.status && { status: filters.status }),
        });
        return params.toString();
    }, [
        filters?.page,
        filters?.limit,
        filters?.q,
        filters?.categoryIds,
        filters?.sortBy,
        filters?.sortOrder,
        filters?.authorId,
        filters?.status,
    ]);

    // Создаем стабильный ключ для SWR
    const swrKey = useMemo(
        () => `${API_DOCUMENTS_PATH}?${queryString}`,
        [queryString]
    );

    // Определяем тип запроса
    const isSearchQuery = Boolean(filters?.q?.trim());

    // Разные настройки для поиска и фильтрации
    const swrConfig = useMemo(() => {
        if (isSearchQuery) {
            // Настройки для поиска
            return {
                revalidateOnFocus: false, // Не обновлять при фокусе
                revalidateOnReconnect: true,
                revalidateIfStale: true,
                dedupingInterval: 5 * 60 * 1000, // 5 минут кэш
            };
        } else {
            // Настройки для обычной фильтрации
            return {
                revalidateOnFocus: true,
                revalidateOnReconnect: true,
                revalidateIfStale: true,
                dedupingInterval: 2000, // 2 секунды
            };
        }
    }, [isSearchQuery]);

    const { data, error, isLoading, mutate } = useSWR<DocumentListResponse>(
        swrKey,
        fetcher,
        swrConfig
    );

    // Мемоизируем результаты
    const documents = useMemo(() => data?.documents || [], [data?.documents]);
    const pagination = useMemo(() => data?.pagination, [data?.pagination]);

    // Мемоизируем функцию обновления
    const refetch = useCallback(() => mutate(), [mutate]);

    return {
        documents,
        pagination,
        error,
        isLoading,
        mutate,
        refetch,
    };
};
