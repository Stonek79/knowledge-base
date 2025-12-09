import type { ActionType } from '@prisma/client'
import { auditLogResponseSchema } from '@/lib/schemas/audit-log'
import type { AuditLogResponse, TargetType } from '@/lib/types/audit-log'
import type { Prisma, PrismaClient } from '@/lib/types/prisma'

/**
 * AuditLogRepositoryV2 инкапсулирует доступ к журналу аудита.
 * Использует внедрение зависимостей (DI).
 */
export class AuditLogRepositoryV2 {
    constructor(private prisma: PrismaClient) {}

    /**
     * Создает новую запись в журнале аудита.
     */
    async create(
        data: Prisma.AuditLogCreateInput,
        tx?: Prisma.TransactionClient
    ): Promise<void> {
        const db = tx ?? this.prisma
        await db.auditLog.create({ data })
    }

    /**
     * Находит множество записей в журнале аудита.
     */
    async findMany(params: {
        skip?: number
        take?: number
        where?: Prisma.AuditLogWhereInput
        orderBy?: Prisma.AuditLogOrderByWithRelationInput
    }): Promise<AuditLogResponse[]> {
        const { skip, take, where, orderBy } = params
        const rawLogs = await this.prisma.auditLog.findMany({
            skip,
            take,
            where,
            orderBy,
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                    },
                },
            },
        })

        return this.validateAndTransformLogs(rawLogs)
    }

    /**
     * Находит множество записей в журнале с подсчетом общего количества.
     */
    async findManyWithCount(params: {
        page: number
        limit: number
        userIds?: string[]
        actions?: string[]
        startDate?: Date
        endDate?: Date
        sortBy: string
        sortOrder: 'asc' | 'desc'
    }): Promise<{ logs: AuditLogResponse[]; total: number }> {
        const {
            page,
            limit,
            userIds,
            actions,
            startDate,
            endDate,
            sortBy,
            sortOrder,
        } = params

        const where: Prisma.AuditLogWhereInput = {}
        if (userIds && userIds.length > 0) {
            where.userId = { in: userIds }
        }
        if (actions && actions.length > 0) {
            where.action = { in: actions as ActionType[] }
        }
        if (startDate || endDate) {
            where.timestamp = {}
            if (startDate) {
                where.timestamp.gte = startDate
            }
            if (endDate) {
                where.timestamp.lte = endDate
            }
        }

        const [rawLogs, total] = await this.prisma.$transaction([
            this.prisma.auditLog.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                        },
                    },
                },
            }),
            this.prisma.auditLog.count({ where }),
        ])

        const logs = this.validateAndTransformLogs(rawLogs)

        return { logs, total }
    }

    /**
     * Подсчитывает количество записей в журнале аудита.
     */
    async count(where?: Prisma.AuditLogWhereInput): Promise<number> {
        return this.prisma.auditLog.count({ where })
    }

    /**
     * Удаляет записи журнала аудита старше указанной даты.
     */
    async deleteOlderThan(cutoffDate: Date): Promise<{ count: number }> {
        return this.prisma.auditLog.deleteMany({
            where: {
                timestamp: {
                    lt: cutoffDate,
                },
            },
        })
    }

    /**
     * Валидирует и преобразует "сырые" данные логов из Prisma в типизированный ответ API.
     */
    private validateAndTransformLogs(
        rawLogs: Prisma.AuditLogGetPayload<{
            include: { user: { select: { id: true; username: true } } }
        }>[]
    ): AuditLogResponse[] {
        return rawLogs.map(rawLog => {
            try {
                return auditLogResponseSchema.parse({
                    id: rawLog.id,
                    timestamp: rawLog.timestamp,
                    action: rawLog.action,
                    user: rawLog.user
                        ? { id: rawLog.user.id, username: rawLog.user.username }
                        : { id: '', username: 'Unknown' },
                    targetId: rawLog.targetId,
                    targetType: rawLog.targetType as TargetType | null,
                    details: rawLog.details,
                })
            } catch (error) {
                console.error('Error validating audit log entry from DB:', {
                    rawLog,
                    error,
                })
                return {
                    id: rawLog.id,
                    timestamp: rawLog.timestamp,
                    action: rawLog.action,
                    user: rawLog.user
                        ? { id: rawLog.user.id, username: rawLog.user.username }
                        : { id: '', username: 'Unknown' },
                    targetId: rawLog.targetId,
                    targetType: null,
                    details: null,
                }
            }
        })
    }
}
