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
