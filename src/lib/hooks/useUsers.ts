import useSWR from 'swr'

import { API_USERS_PATH } from '@/constants/api'
import { makeSWRFetcher } from '@/lib/api/apiHelper'
import type { UserSortableFields, UsersListResponse } from '@/lib/types/user'

const fetcher = makeSWRFetcher({ returnNullOn401: true })

interface UseUsersProps {
    search?: string
    status?: string
    page?: number
    limit?: number
    sortBy?: UserSortableFields
    sortOrder?: 'asc' | 'desc'
}
export function useUsers(filters?: UseUsersProps) {
    const {
        search = '',
        status = '',
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
    } = filters || {}
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (status) params.set('status', status)
    if (page) params.set('page', String(page))
    if (limit) params.set('limit', String(limit))
    if (sortBy) params.set('sortBy', sortBy)
    if (sortOrder) params.set('sortOrder', sortOrder)

    const url = `${API_USERS_PATH}?${params.toString()}`

    const { data, error, isLoading, mutate } = useSWR<UsersListResponse | null>(
        url,
        fetcher
    )

    return {
        users: data?.users || [],
        total: data?.pagination?.total || 0,
        isLoading,
        error,
        mutate,
    }
}
