import { useState } from 'react'

import { API_PROFILE_CHANGE_PASSWORD_PATH } from '@/constants/api'
import { ApiError } from '@/lib/api'

import type { ChangePasswordFormData } from '../types/profile'

export function useChangePassword() {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    /**
     * Функция для отправки запроса на смену пароля.
     * @param data - Данные формы (старый, новый и подтверждение пароля).
     * @returns Promise<boolean> - true в случае успеха, false в случае ошибки.
     */
    const changePassword = async (
        data: ChangePasswordFormData
    ): Promise<boolean> => {
        setIsLoading(true)
        setError(null) // Очищаем предыдущие ошибки
        try {
            const response = await fetch(API_PROFILE_CHANGE_PASSWORD_PATH, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })

            if (!response.ok) {
                const errorData = await response.json()
                // Предполагаем, что errorData содержит свойство 'message'
                throw new ApiError(
                    errorData.message || 'Ошибка смены пароля',
                    response.status
                )
            }

            // Пароль успешно изменен
            return true
        } catch (e) {
            if (e instanceof ApiError) {
                setError(e.message)
            } else if (e instanceof Error) {
                setError(e.message)
            } else {
                setError('Произошла неизвестная ошибка')
            }
            return false // Указываем на неудачу
        } finally {
            setIsLoading(false)
        }
    }

    return { changePassword, isLoading, error }
}
