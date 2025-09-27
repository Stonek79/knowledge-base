import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { NextResponse } from 'next/server';

import { COOKIE_NAME } from '@/constants/app';
import { JWT_EXPIRES_IN, JWT_SECRET } from '@/constants/auth';
import { ApiError, handleApiError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { loginSchema } from '@/lib/schemas/auth';
import { HOME_PATH } from '@/constants/api';

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const validation = loginSchema.safeParse(body);

        if (!validation.success) {
            return handleApiError(validation.error, {
                status: 400,
                message: 'Ошибка валидации данных',
            });
        }

        const { username, password } = validation.data;

        const user = await prisma.user.findUnique({ where: { username } });

        if (!user) {
            throw new ApiError('Пользователь не найден', 404);
        }

        if (!user.password) {
            // Это может произойти, если пользователь был создан, например, через соц. сети (OAuth) и не имеет пароля
            throw new ApiError(
                'Учетная запись не поддерживает вход по паролю',
                403
            );
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new ApiError('Неверный пароль', 401);
        }

        // Генерация JWT
        const tokenPayload = {
            id: user.id,
            username: user.username,
            role: user.role,
            createdAt: user.createdAt,
            enabled: user.enabled || false,
        };

        const jwtSecret: jwt.Secret = process.env.JWT_SECRET || JWT_SECRET;
        if (!jwtSecret) {
            console.error('JWT_SECRET не определен в .env');
            throw new ApiError(
                'Ошибка конфигурации сервера (JWT) - секрет не найден',
                500
            );
        }

        const signOptions: jwt.SignOptions = { expiresIn: JWT_EXPIRES_IN };

        const token = jwt.sign(tokenPayload, jwtSecret, signOptions);

        // Установка HttpOnly cookie
        const response = NextResponse.json(
            {
                message: 'Вход успешен',
                user: tokenPayload,
            },
            { status: 200 }
        );

        response.cookies.set(COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: JWT_EXPIRES_IN,
            path: HOME_PATH,
        });

        return response;
    } catch (error) {
        if (error instanceof ApiError) {
            return handleApiError(error, {
                status: error.status,
                message: error.message,
                errors: error.errors,
            });
        }
        return handleApiError(error, {
            message: 'Внутренняя ошибка сервера при входе',
        });
    }
}
