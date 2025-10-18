'use client'

import { useCallback, useRef } from 'react'

/**
 * A hook that allows you to cancel the previous function call until the delay expires
 * @param callback
 * @param delay - in mc
 */

type Callback<T> = (...args: T[]) => void

export const useDebounce = <T>(callback: Callback<T>, delay: number = 500) => {
    const timer = useRef<NodeJS.Timeout | null>(null)

    return useCallback(
        (...args: T[]) => {
            if (timer.current) {
                clearTimeout(timer.current)
            }

            timer.current = setTimeout(() => {
                callback(...args)
            }, delay)
        },
        [callback, delay]
    )
}
