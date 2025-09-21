import useSWR from 'swr';

import { useCallback, useMemo } from 'react';

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
            ...(filters?.search && { search: filters.search }),
            ...(filters?.categoryIds && {
                categoryIds: filters.categoryIds.join(','),
            }),
            ...(filters?.sortBy && { sortBy: filters.sortBy }),
            ...(filters?.sortOrder && { sortOrder: filters.sortOrder }),
        });
        return params.toString();
    }, [
        filters?.page,
        filters?.limit,
        filters?.search,
        filters?.categoryIds,
        filters?.sortBy,
        filters?.sortOrder,
    ]);

    // Создаем стабильный ключ для SWR
    const swrKey = useMemo(
        () => `${API_DOCUMENTS_PATH}?${queryString}`,
        [queryString]
    );

    const { data, error, isLoading, mutate } = useSWR<DocumentListResponse>(
        swrKey,
        fetcher,
        {
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            revalidateIfStale: true,
            dedupingInterval: 2000,
        }
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
