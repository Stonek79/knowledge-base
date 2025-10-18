import { NextResponse } from 'next/server'

import { handleApiError } from '@/lib/api'
import { AuthService } from '@/lib/auth/AuthService'

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Log in a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful, returns user and sets auth cookie
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid credentials
 */
export async function POST(req: Request) {
    try {
        const body = await req.json()

        // 1. Вся сложная логика теперь в сервисе
        const { user, token } = await AuthService.login(body)

        // 2. Создаем успешный ответ
        const response = NextResponse.json(
            {
                message: 'Вход успешен',
                user,
            },
            { status: 200 }
        )

        // 3. Устанавливаем httpOnly cookie с помощью метода сервиса
        AuthService.setTokenCookie(response, token)

        return response
    } catch (error) {
        // 4. Обрабатываем ошибки централизованно
        return handleApiError(error)
    }
}
