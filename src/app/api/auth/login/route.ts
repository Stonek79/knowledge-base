import { NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api';
import { AuthService } from '@/lib/auth/AuthService';

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // 1. Вся сложная логика теперь в сервисе
        const { user, token } = await AuthService.login(body);

        // 2. Создаем успешный ответ
        const response = NextResponse.json(
            {
                message: 'Вход успешен',
                user,
            },
            { status: 200 }
        );

        // 3. Устанавливаем httpOnly cookie с помощью метода сервиса
        AuthService.setTokenCookie(response, token);

        return response;
    } catch (error) {
        // 4. Обрабатываем ошибки централизованно
        return handleApiError(error);
    }
}
