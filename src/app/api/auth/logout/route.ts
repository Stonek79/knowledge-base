import { type NextRequest, NextResponse } from 'next/server'

import { HOME_PATH } from '@/constants/api'
import { COOKIE_NAME, COOKIE_SESSION_ID_NAME } from '@/constants/app'
import { ACTION_TYPE, TARGET_TYPE } from '@/constants/audit-log'
import { handleApiError } from '@/lib/api'
import { AuthService } from '@/lib/auth/AuthService'
import { auditLogService } from '@/lib/services/AuditLogService'

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Log out a user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logout successful, clears authentication cookie.
 */
export async function POST(req: NextRequest) {
    try {
        // Основная задача logout - это удалить httpOnly cookie с токеном.
        // Мы не можем напрямую удалить cookie из NextRequest на сервере,
        // мы должны отправить ответ, который инструктирует браузер удалить cookie.

        const response = NextResponse.json(
            { message: 'Выход успешен' },
            { status: 200 }
        )

        const token = AuthService.getTokenFromRequest(req)

        if (token) {
            const user = await AuthService.verifyToken(token)
            if (user) {
                await auditLogService.log({
                    userId: user.id,
                    action: ACTION_TYPE.USER_LOGOUT,
                    targetType: TARGET_TYPE.USER,
                    details: {
                        ipAddress:
                            req.headers.get('x-forwarded-for') ?? undefined,
                        userAgent: req.headers.get('user-agent') ?? undefined,
                    },
                })
            }
        }

        // Инструкция браузеру удалить cookie 'token'
        // Устанавливаем cookie с тем же именем, пустым значением и истекшим сроком действия (maxAge: 0)
        response.cookies.set(COOKIE_NAME, '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: HOME_PATH,
            maxAge: 0, // Важно для удаления cookie
        })

        response.cookies.set(COOKIE_SESSION_ID_NAME, '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: HOME_PATH,
            maxAge: 0,
        })

        return response
    } catch (error) {
        // Хотя операция logout проста, все равно обернем в обработчик ошибок на всякий случай
        return handleApiError(error, {
            message: 'Внутренняя ошибка сервера при выходе',
        })
    }
}
