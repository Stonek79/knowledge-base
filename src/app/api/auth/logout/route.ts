import { NextResponse } from 'next/server';

import { HOME_PATH } from '@/constants/api';
import { COOKIE_NAME } from '@/constants/app';
import { handleApiError } from '@/lib/api';

export async function POST() {
    try {
        // Основная задача logout - это удалить httpOnly cookie с токеном.
        // Мы не можем напрямую удалить cookie из NextRequest на сервере,
        // мы должны отправить ответ, который инструктирует браузер удалить cookie.

        const response = NextResponse.json(
            { message: 'Выход успешен' },
            { status: 200 }
        );

        // Инструкция браузеру удалить cookie 'token'
        // Устанавливаем cookie с тем же именем, пустым значением и истекшим сроком действия (maxAge: 0)
        response.cookies.set(COOKIE_NAME, '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: HOME_PATH,
            maxAge: 0, // Важно для удаления cookie
        });

        return response;
    } catch (error) {
        // Хотя операция logout проста, все равно обернем в обработчик ошибок на всякий случай
        return handleApiError(error, {
            message: 'Внутренняя ошибка сервера при выходе',
        });
    }
}
