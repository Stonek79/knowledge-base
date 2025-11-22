import { NextResponse } from 'next/server'
import { z } from '@/lib/zod'

/** Пэйлоад ошибки, возвращаемый API (совместим с клиентским парсером) */
export type ApiErrorPayload = {
    message: string
    errors?: Record<string, string[]> | null
}

interface ApiErrorOptions {
    status?: number
    message?: string
    errors?: Record<string, string[]> | null
}

/**
 * Контракт ошибок API (сервер → клиент)
 *
 * Всегда возвращаем JSON:
 * {
 *   "message": string,
 *   "errors"?: Record<string, string[]> | null
 * }
 *
 * - handleApiError гарантирует этот контракт.
 * - Клиентский ApiHttpError.payload соответствует этому формату.
 * - Zod ошибки сериализуются через error.flatten().fieldErrors → errors.
 */

/**
 * Преобразует любую ошибку в стандартизированный JSON ответ.
 * Формат body: { message: string, errors?: Record<string, string[]> | null }
 * @param error - любая ошибка (Error, ZodError, ApiError, unknown)
 * @param options - переопределение статуса/сообщения
 * @returns NextResponse с корректным статусом и телом ApiErrorPayload
 */
export function handleApiError(
    error: unknown,
    options: ApiErrorOptions = {}
): NextResponse {
    // Логируем ошибку на сервере для отладки
    console.error('[API Error]:', error)

    if (error instanceof z.ZodError) {
        // Дополнительное детальное логгирование для Zod-ошибок
        console.error(
            '[Zod Validation Error Details]:',
            JSON.stringify(error.flatten(), null, 2)
        )
        return NextResponse.json(
            {
                message: options.message || 'Ошибка валидации данных',
                errors: error.flatten().fieldErrors,
            },
            { status: options.status || 400 }
        )
    }

    if (error instanceof ApiError) {
        return NextResponse.json(
            {
                message: error.message,
                errors: error.errors,
            },
            { status: error.status }
        )
    }

    if (error instanceof Error) {
        // PrismaClientKnownRequestError и другие специфичные ошибки Prisma наследуются от Error
        // Можно добавить более специфичную обработку для кодов ошибок Prisma, если это необходимо
        // например, if (error.code === 'P2002') для уникальных ограничений

        return NextResponse.json(
            {
                message:
                    error.message ||
                    options.message ||
                    'Внутренняя ошибка сервера',
                errors: options.errors,
            },
            { status: options.status || 500 }
        )
    }

    // Если это не экземпляр Error и не ZodError
    return NextResponse.json(
        {
            message: options.message || 'Неизвестная внутренняя ошибка сервера',
            errors: options.errors,
        },
        { status: options.status || 500 }
    )
}

/**
 * Специфичная ошибка для серверной логики API (используйте, когда хотите явно задать статус/детали).
 * Пример: throw new ApiError('Forbidden', 403)
 */
export class ApiError extends Error {
    public readonly status: number
    public readonly errors: Record<string, string[]> | null

    constructor(
        message: string,
        status: number = 500,
        errors: Record<string, string[]> | null = null
    ) {
        super(message)
        this.name = 'ApiError'
        this.status = status
        this.errors = errors
        Object.setPrototypeOf(this, ApiError.prototype)
    }
}
