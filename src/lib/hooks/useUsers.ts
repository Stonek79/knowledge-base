import useSWR from 'swr';

import { API_USERS_PATH } from '@/constants/api';
import { makeSWRFetcher } from '@/lib/api/apiHelper';
import { UsersListResponse } from '@/lib/types/user';

const fetcher = makeSWRFetcher({ returnNullOn401: true });

export function useUsers() {
    const { data, error, isLoading, mutate } = useSWR<UsersListResponse | null>(
        API_USERS_PATH,
        fetcher
    );

    return {
        users: data?.users || [],
        total: data?.pagination?.total || 0,
        isLoading,
        error,
        mutate,
    };
}
