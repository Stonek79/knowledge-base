import { type NextRequest, NextResponse } from 'next/server'

import { COOKIE_NAME, COOKIE_SESSION_ID_NAME } from '@/constants/app'
import { ACTION_TYPE, TARGET_TYPE } from '@/constants/audit-log'
import { JWT_SECRET } from '@/constants/auth'
import { ApiError, handleApiError } from '@/lib/api'
import { AuthService } from '@/lib/auth/AuthService'
import { prisma } from '@/lib/prisma'
import { auditLogService } from '@/lib/services/AuditLogService'

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
        const sessionIdCookie = req.cookies.get(COOKIE_SESSION_ID_NAME)?.value
        const token = AuthService.getTokenFromRequest(req)

        if (!token) {
            throw new ApiError('Токен аутентификации не предоставлен', 401)
        }

        const decodedUser = await AuthService.verifyToken(token)

        const jwtSecret = process.env.JWT_SECRET || JWT_SECRET

        if (!jwtSecret) {
            console.error('JWT_SECRET не определен в .env')
            throw new ApiError('Ошибка конфигурации сервера (JWT)', 500)
        }

        if (!decodedUser) {
            const errResponse = NextResponse.json(
                {
                    message: 'Невалидный или истекший токен',
                    error: 'InvalidTokenError',
                },
                { status: 401 }
            )

            // Удаляем невалидный cookie
            errResponse.cookies.set(COOKIE_NAME, '', { maxAge: 0 })
            errResponse.cookies.set(COOKIE_SESSION_ID_NAME, '', {
                maxAge: 0,
                path: '/',
            })

            await auditLogService.log({
                action: ACTION_TYPE.USER_LOGIN_FAILED,
                targetType: TARGET_TYPE.SYSTEM,
                details: {
                    isInvalidToken: true,
                },
            })
            
            return errResponse
        }

        // Получаем самые свежие данные пользователя из БД
        const user = await prisma.user.findUnique({
            where: {
                id: decodedUser.id,
            },
            select: {
                id: true,
                username: true,
                role: true,
                profile: true,
            },
        })

        if (!user) {
            // Если пользователь с таким ID из токена не найден в БД, это критическая ошибка синхронизации
            const errResponse = NextResponse.json(
                { message: 'Пользователь не найден', error: 'UserNotFound' },
                { status: 401 }
            )

            await auditLogService.log({
                details: {
                    isFailUser: true,
                },
                action: ACTION_TYPE.USER_LOGIN_FAILED,
                targetType: TARGET_TYPE.SYSTEM,
            })

            return errResponse
        }

        const response = NextResponse.json(user, { status: 200 })

        // Если session_id cookie нет, значит это новая сессия браузера, устанавливаем ее
        if (!sessionIdCookie) {
            response.cookies.set(COOKIE_SESSION_ID_NAME, 'true', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
            })

            await auditLogService.log({
                userId: user.id,
                action: ACTION_TYPE.USER_LOGIN,
                details: {
                    attemptedUsername: user.username,
                    ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
                    userAgent: req.headers.get('user-agent') ?? undefined,
                },
            })
        }

        return response
    } catch (error) {
        // Обработка ошибок ApiError для корректных HTTP-ответов
        if (error instanceof ApiError) {
            const response = NextResponse.json(
                { message: error.message, error: error.name }, // Используем error.name для кода ошибки
                { status: error.status }
            )

            return response
        }
        // Обработка остальных (непредвиденных) ошибок
        return handleApiError(error, {
            message: 'Ошибка при получении данных пользователя',
        })
    }
}
