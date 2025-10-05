import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

import { COOKIE_NAME } from '@/constants/app';
import { JWT_SECRET } from '@/constants/auth';
import { ApiError, handleApiError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { jwtPayloadSchema } from '@/lib/schemas/user';

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get the currently authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The authenticated user object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized, invalid or missing token
 */
export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get(COOKIE_NAME)?.value;

        if (!token) {
            throw new ApiError('Токен аутентификации не предоставлен', 401);
        }

        const jwtSecret = process.env.JWT_SECRET || JWT_SECRET;

        if (!jwtSecret) {
            console.error('JWT_SECRET не определен в .env');
            throw new ApiError('Ошибка конфигурации сервера (JWT)', 500);
        }

        let decoded: unknown;
        try {
            decoded = jwt.verify(token, jwtSecret);
        } catch (error) {
            const errResponse = NextResponse.json(
                {
                    message: 'Невалидный или истекший токен',
                    error: 'InvalidTokenError',
                },
                { status: 401 }
            );

            // Удаляем невалидный cookie
            errResponse.cookies.set(COOKIE_NAME, '', { maxAge: 0 });
            return errResponse;
        }

        const validationResult = jwtPayloadSchema.safeParse(decoded);

        console.log('[me] validationResult', validationResult);

        if (!validationResult.success) {
            throw new ApiError('Некорректный формат токена', 401);
        }

        const { id } = validationResult.data;

        if (!id) {
            // Если токен есть, но его содержимое не соответствует схеме, это тоже ошибка авторизации
            throw new ApiError('Некорректный формат токена', 401);
        }

        // Получаем самые свежие данные пользователя из БД
        const user = await prisma.user.findUnique({
            where: {
                id,
            },
            select: {
                id: true,
                username: true,
                role: true,
            },
        });

        if (!user) {
            // Если пользователь с таким ID из токена не найден в БД, это критическая ошибка синхронизации
            const errResponse = NextResponse.json(
                { message: 'Пользователь не найден', error: 'UserNotFound' },
                { status: 401 }
            );

            return errResponse;
        }

        return NextResponse.json(user, { status: 200 });
    } catch (error) {
        // Обработка ошибок ApiError для корректных HTTP-ответов
        if (error instanceof ApiError) {
            const response = NextResponse.json(
                { message: error.message, error: error.name }, // Используем error.name для кода ошибки
                { status: error.status }
            );

            return response;
        }
        // Обработка остальных (непредвиденных) ошибок
        return handleApiError(error, {
            message: 'Ошибка при получении данных пользователя',
        });
    }
}
