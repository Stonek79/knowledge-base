import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { auditLogRepository } from '@/lib/repositories/AuditLogRepository'
import { AuditLogPayloadSchema } from '@/lib/schemas/audit-log'
import type { LogPayload } from '@/lib/types/audit-log'

class AuditLogService {
    /**
     * Записывает действие пользователя в журнал аудита.
     * @param payload - Объект с данными для лога.
     * @param tx - Транзакция, в которой нужно создать запись.
     */
    async log(
        payload: LogPayload,
        tx?: Prisma.TransactionClient
    ): Promise<void> {
        const { userId, action, details, targetId, targetType } = payload

        try {
            // 1. Валидируем пейлоад целиком.
            // Zod автоматически проверит, что `details` соответствуют `action`.
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
                // Не продолжаем, если пейлоад невалиден.
                return
            }

            const validatedData = validationResult.data

            // 2. Сохраняем лог в БД.
            await auditLogRepository.create(
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
}

export const auditLogService = new AuditLogService()
