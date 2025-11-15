import bcrypt from 'bcryptjs'
import { jwtVerify, SignJWT } from 'jose'
import type { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { COOKIE_NAME } from '@/constants/app'
import { ACTION_TYPE, TARGET_TYPE } from '@/constants/audit-log'
import { JWT_EXPIRES_IN, JWT_SECRET } from '@/constants/auth'
import { ApiError } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { loginSchema } from '@/lib/schemas/auth'
import { auditLogService } from '@/lib/services/AuditLogService'
import type { UserResponse, UserRole } from '@/lib/types/user'

// Определяем тип для payload токена
export type UserJWTPayload = {
    id: string
    username: string
    role: UserRole
    enabled: boolean
    createdAt: Date
}

/**
 * AuthService инкапсулирует всю логику аутентификации и управления JWT.
 */
export class AuthService {
    private static getJwtSecret(): Uint8Array {
        const secret = process.env.JWT_SECRET || JWT_SECRET
        if (!secret) {
            console.error('JWT_SECRET не определен в .env')
            throw new ApiError('Ошибка конфигурации сервера (JWT)', 500)
        }
        return new TextEncoder().encode(secret)
    }

    /**
     * Создает (подписывает) JWT для пользователя.
     * @param user - Объект пользователя для включения в payload.
     * @returns - Строка с JWT.
     */
    public static async signToken(user: UserJWTPayload): Promise<string> {
        const secret = AuthService.getJwtSecret()

        console.log(
            '[signToken] process.env.JWT_MAX_AGE',
            process.env.JWT_MAX_AGE
        )

        return new SignJWT(user)
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime(`${JWT_EXPIRES_IN}s`)
            .sign(secret)
    }

    /**
     * Верифицирует JWT и возвращает его payload.
     * @param token - Строка с JWT.
     * @returns - Payload токена или null при ошибке.
     */
    public static async verifyToken(
        token: string
    ): Promise<UserJWTPayload | null> {
        try {
            const secret = AuthService.getJwtSecret()
            const { payload } = await jwtVerify(token, secret)
            return payload as UserJWTPayload
        } catch (error) {
            console.warn(
                'JWT verification failed:',
                error instanceof Error ? error.message : 'Unknown error'
            )
            return null
        }
    }

    /**
     * Обрабатывает логику входа пользователя.
     * @param credentials - Учетные данные (имя пользователя и пароль).
     * @returns - Объект пользователя и JWT.
     */
    public static async login(credentials: unknown): Promise<{
        user: UserResponse
        token: string
    }> {
        const validation = loginSchema.safeParse(credentials)
        if (!validation.success) {
            throw new ApiError(
                'Ошибка валидации данных',
                400,
                z.flattenError(validation.error).fieldErrors
            )
        }

        const { username, password } = validation.data
        const user = await prisma.user.findUnique({ where: { username } })

        if (!user) {
            // Логируем неудачную попытку входа
            await auditLogService.log({
                details: { attemptedUsername: username, isFailUser: true },
                action: ACTION_TYPE.USER_LOGIN_FAILED,
                targetType: TARGET_TYPE.SYSTEM,
            })
            throw new ApiError('Пользователь не найден', 404)
        }

        if (user.status === 'PLACEHOLDER') {
            throw new ApiError('Учетная запись не активирована', 403)
        }

        if (!user.password) {
            throw new ApiError(
                'Учетная запись не поддерживает вход по паролю',
                403
            )
        }

        const isPasswordValid = await bcrypt.compare(password, user.password)
        if (!isPasswordValid) {
            // Логируем неудачную попытку входа
            await auditLogService.log({
                userId: user.id,
                details: { attemptedUsername: username, isFailPassword: true },
                action: ACTION_TYPE.USER_LOGIN_FAILED,
            })
            throw new ApiError('Неверный пароль', 401)
        }

        const tokenPayload: UserJWTPayload = {
            id: user.id,
            username: user.username,
            role: user.role,
            createdAt: user.createdAt,
            enabled: user.enabled || false,
        }

        const token = await AuthService.signToken(tokenPayload)

        // Логируем успешный вход
        await auditLogService.log({
            userId: user.id,
            action: ACTION_TYPE.USER_LOGIN,
            details: { attemptedUsername: username },
        })

        return { user: tokenPayload, token }
    }

    /**
     * Извлекает JWT из cookie запроса.
     * @param req - Объект NextRequest.
     * @returns - Строка с JWT или null.
     */
    public static getTokenFromRequest(req: NextRequest): string | null {
        return req.cookies.get(COOKIE_NAME)?.value ?? null
    }

    /**
     * Устанавливает httpOnly cookie с токеном в ответ.
     * @param response - Объект NextResponse.
     * @param token - Строка с JWT.
     */
    public static setTokenCookie(response: NextResponse, token: string): void {
        response.cookies.set(COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: JWT_EXPIRES_IN,
            path: '/',
        })
    }
}
