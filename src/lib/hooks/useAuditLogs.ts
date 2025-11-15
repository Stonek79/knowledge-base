import { useMemo } from 'react'
import useSWR from 'swr'
import { API_ADMIN_LOGS_PATH } from '@/constants/api'
import { makeSWRFetcher } from '@/lib/api/apiHelper'
import type { ActionType, AuditLogsListResponse } from '@/lib/types/audit-log'

const fetcher = makeSWRFetcher({ returnNullOn401: false })

interface UseAuditLogsProps {
    page?: number
    limit?: number
    userIds?: string[]
    actions?: ActionType[]
    startDate?: string
    endDate?: string
}

/**
 * Хук для получения журнала аудита с фильтрацией и пагинацией.
 * Обертка над useSWR для запроса к API логов.
 * @param {UseAuditLogsProps} props - Параметры для запроса логов.
 * @returns {{logs: AuditLogResponse[], pagination: object, error: any, isLoading: boolean}} - Возвращает список логов,
 * информацию о пагинации, состояние загрузки и ошибку.
 */
export function useAuditLogs({
    page = 1,
    limit = 20,
    userIds,
    actions,
    startDate,
    endDate,
}: UseAuditLogsProps) {
    const params = new URLSearchParams()
    params.append('page', String(page))
    params.append('limit', String(limit))

    if (userIds?.length) {
        userIds.forEach(id => {
            params.append('userIds', id)
        })
    }
    if (actions?.length) {
        actions.forEach(action => {
            params.append('actions', action)
        })
    }
    if (startDate) {
        params.append('startDate', startDate)
    }
    if (endDate) {
        params.append('endDate', endDate)
    }

    const swrKey = `${API_ADMIN_LOGS_PATH}?${params.toString()}`

    const { data, error, isLoading } = useSWR<AuditLogsListResponse>(
        swrKey,
        fetcher
    )

    const pagination = useMemo(() => data?.pagination, [data?.pagination])
    const logs = useMemo(() => data?.logs || [], [data?.logs])
    const total = pagination?.total || 0

    return {
        logs,
        pagination,
        error,
        isLoading,
        total,
    }
}
