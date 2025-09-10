import jwt from 'jsonwebtoken';

import { NextRequest } from 'next/server';

import { COOKIE_NAME } from '@/constants/app';
import { userResponseSchema } from '@/lib/schemas/user';
import { UserResponse } from '@/lib/types/user';

/**
 * Валидирует JWT токен и возвращает payload
 * @param token - JWT токен для валидации
 * @returns AuthenticatedUser данные из токена или null, если токен невалиден
 */
export async function validateToken(
    token: string
): Promise<UserResponse | null> {
    try {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('JWT_SECRET не определен в .env');
            return null;
        }

        const compact = token.trim().replace(/^"|"$/g, '');
        if (
            !/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(compact)
        ) {
            throw new Error('Invalid token format'); // или return null в getCurrentUser
        }
        const decoded = jwt.verify(compact, jwtSecret);

        const validationResult = userResponseSchema.safeParse(decoded);

        if (!validationResult.success) {
            console.error('Невалидный формат JWT payload');
            return null;
        }

        return {
            id: validationResult.data.id,
            username: validationResult.data.username,
            role: validationResult.data.role,
            createdAt: validationResult.data.createdAt,
        };
    } catch (error) {
        console.error('Ошибка валидации JWT:', error);
        return null;
    }
}

/**
 * Извлекает JWT токен из куков запроса
 * @param req - NextRequest объект
 * @returns JWT токен или null, если он не найден
 */
export async function extractToken(req: NextRequest): Promise<string | null> {
    const raw = req.cookies.get(COOKIE_NAME)?.value ?? '';
    const token = raw.trim().replace(/^"|"$/g, '');
    return token || null;
}
