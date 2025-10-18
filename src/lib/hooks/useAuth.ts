'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect } from 'react'
import useSWR from 'swr'

import { API_ME_PATH, LOGIN_PAGE_PATH } from '@/constants/api'
import { logout as logoutAction } from '@/lib/actions/actions'
import type { UserResponse } from '@/lib/types/user'

const fetcher = (url: string) =>
    fetch(url, {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
    }).then(res => {
        if (!res.ok) {
            if (res.status === 401) {
                return null
            }
            throw new Error(`HTTP error! status: ${res.status}`)
        }
        return res.json()
    })

export function useAuth() {
    const { data, error, mutate } = useSWR<UserResponse | null>(
        API_ME_PATH,
        fetcher
    )

    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        if (data === null) {
            const returnTo =
                pathname && pathname !== LOGIN_PAGE_PATH
                    ? `?returnTo=${encodeURIComponent(pathname)}`
                    : ''
            router.replace(`${LOGIN_PAGE_PATH}${returnTo}`)
        }
    }, [data, pathname, router])

    const logout = useCallback(async () => {
        try {
            await logoutAction(mutate)
        } catch (error) {
            console.error('Ошибка при выходе:', error)
        }
    }, [mutate])

    return {
        user: data,
        isLoading: data === undefined && !error,
        isError: error,
        logout,
        mutate,
    }
}
