import useSWR from 'swr';

import { API_SEARCH_PATH } from '@/constants/api';
import { makeSWRFetcher } from '@/lib/api/apiHelper';
import { SearchFilters, SearchResult } from '@/lib/types/document';

const fetcher = makeSWRFetcher({ returnNullOn401: true });

export const useSearch = (query: string, filters?: SearchFilters) => {
    const queryString = new URLSearchParams({
        q: query || '',
        ...(filters?.categoryIds && {
            categoryIds: filters.categoryIds.join(','),
        }),
        ...(filters?.authorId && { authorId: filters.authorId }),
        ...(filters?.dateFrom && { dateFrom: filters.dateFrom.toISOString() }),
        ...(filters?.dateTo && { dateTo: filters.dateTo.toISOString() }),
        ...(filters?.sortBy && { sortBy: filters.sortBy }),
        ...(filters?.sortOrder && { sortOrder: filters.sortOrder }),
    }).toString();

    const { data, error, isLoading } = useSWR<{ results: SearchResult[] } | null>(
        `${API_SEARCH_PATH}?${queryString}`,
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 2 * 60 * 1000, // 2 минуты
        }
    );

    console.log('[useSearch] data', data);
    console.log('[useSearch] query:', query);
    console.log('[useSearch] filters:', filters);
    console.log('[useSearch] queryString:', queryString);

    return { results: data?.results || [], error, isLoading };
};
