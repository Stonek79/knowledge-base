import { type KeyedMutator } from 'swr';

import {
    API_LOGIN_PATH,
    API_LOGOUT_PATH,
    API_REGISTER_PATH,
} from '@/constants/api';
import { api } from '@/lib/api/apiHelper';
import { UserLoginInput, UserResponse } from '@/lib/types/user';

/**
 * Выполняет вход пользователя в систему.
 * @param credentials - Учетные данные для входа.
 */
export async function login(
    credentials: UserLoginInput
): Promise<UserResponse> {
    const { user } = await api.post<{ user: UserResponse }>(
        API_LOGIN_PATH,
        credentials
    );

    return user;
}

/**
 * Выполняет выход пользователя из системы.
 * @param mutate - SWR мутатор для обновления кэша.
 */
export async function logout(
    mutate: KeyedMutator<UserResponse | null>
): Promise<void> {
    await mutate(
        async () => {
            await fetch(API_LOGOUT_PATH, {
                method: 'POST',
                credentials: 'include',
            });
            return null;
        },
        {
            optimisticData: null,
            populateCache: true,
            revalidate: false,
        }
    );
}

/**
 * Регистрирует нового пользователя.
 * @param credentials - Учетные данные для регистрации.
 */
export async function register(credentials: UserLoginInput): Promise<void> {
    const response = await fetch(API_REGISTER_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Internal server error');
    }
}
