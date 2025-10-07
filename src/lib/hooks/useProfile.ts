import useSWR from 'swr';

import { API_PROFILE_PATH } from '@/constants/api';
import { api, makeSWRFetcher } from '@/lib/api/apiHelper';
import { ProfileUpdate } from '@/lib/types/profile';
import { UserWithProfile } from '@/lib/types/user';

const fetcher = makeSWRFetcher();

/**
 * Хук для работы с профилем текущего пользователя (чтение и запись).
 */
export function useProfile() {
    const { data, error, isLoading, mutate } = useSWR<UserWithProfile>(
        API_PROFILE_PATH,
        fetcher
    );

    /**
     * Обновляет профиль пользователя.
     * @param profileData - Данные для обновления.
     */
    const updateProfile = async (profileData: ProfileUpdate) => {
        try {
            // 1. Отправляем запрос на обновление
            const updatedUser = await api.put<UserWithProfile>(
                API_PROFILE_PATH,
                profileData
            );

            // 2. Заменяем данные в кеше SWR на свежие, без повторного запроса
            await mutate(updatedUser, false);

            return updatedUser;
        } catch (err) {
            // Пробрасываем ошибку для обработки в UI
            throw err;
        }
    };

    return {
        profile: data,
        isLoading,
        error,
        updateProfile,
        mutate,
    };
}
