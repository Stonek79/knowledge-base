import type { AuditLogRepositoryV2 } from '@/lib/repositories/AuditLogRepositoryV2'
import { AuditLogPayloadSchema } from '@/lib/schemas/audit-log'
import type { AuditLogResponse, LogPayload } from '@/lib/types/audit-log'
import type { Prisma } from '@/lib/types/prisma'
import { z } from '@/lib/zod'

export class AuditLogServiceV2 {
    constructor(private repo: AuditLogRepositoryV2) {}

    /**
     * Записывает действие пользователя в журнал аудита.
     */
    async log(
        payload: LogPayload,
        tx?: Prisma.TransactionClient
    ): Promise<void> {
        const { userId, action, details, targetId, targetType } = payload

        try {
            const validationResult = AuditLogPayloadSchema.safeParse({
                action,
                details,
                targetId,
                targetType,
            })

            if (!validationResult.success) {
                console.error('Invalid audit log payload:', {
                    payload,
                    error: z.flattenError(validationResult.error),
                })
                return
            }

            const validatedData = validationResult.data

            await this.repo.create(
                {
                    user: { connect: { id: userId } },
                    action: validatedData.action,
                    targetId: validatedData.targetId,
                    targetType: validatedData.targetType,
                    details: validatedData.details,
                },
                tx
            )
        } catch (error) {
            console.error('Failed to write to audit log:', {
                error,
                payload,
            })
        }
    }

    /**
     * Получает список логов с пагинацией и фильтрацией.
     */
    async getLogs(params: {
        page: number
        limit: number
        userIds?: string[]
        actions?: string[]
        startDate?: Date
        endDate?: Date
        sortBy: string
        sortOrder: 'asc' | 'desc'
    }): Promise<{ logs: AuditLogResponse[]; total: number }> {
        return this.repo.findManyWithCount(params)
    }

    /**
     * Удаляет старые логи.
     */
    async pruneOldLogs(cutoffDate: Date): Promise<number> {
        const { count } = await this.repo.deleteOlderThan(cutoffDate)
        return count
    }
}
