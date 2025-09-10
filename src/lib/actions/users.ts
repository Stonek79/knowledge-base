import { NextRequest } from 'next/server';

import { API_USERS_PATH } from '@/constants/api';
import { api } from '@/lib/api/apiHelper';
import { CreateUserData, UpdateUserData, UserResponse } from '@/lib/types/user';
import { extractToken, validateToken } from '@/utils/jwt';

export async function createUser(data: CreateUserData) {
    const { user } = await api.post<{ user: UserResponse }>(
        API_USERS_PATH,
        data
    );

    return user;
}

export async function updateUser(userId: string, data: UpdateUserData) {
    const { user } = await api.put<{ user: UserResponse }>(
        `${API_USERS_PATH}/${userId}`,
        data
    );

    return user;
}

export async function deleteUser(userId: string) {
    const res = await api.del<{ message: string }>(
        `${API_USERS_PATH}/${userId}`
    );

    return res;
}

/**
 * Получает текущего пользователя из JWT токена запроса
 * @param req - NextRequest объект
 * @returns AuthenticatedUser данные или null, если пользователь не аутентифицирован
 */
export async function getCurrentUser(
    req: NextRequest
): Promise<UserResponse | null> {
    const token = await extractToken(req);
    if (!token) {
        return null;
    }

    return validateToken(token);
}
