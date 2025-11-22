import type {
    Prisma,
    ActionType as PrismaActionType,
    AuditLog as PrismaAuditLogType,
} from '@prisma/client'
import type { TARGET_TYPE } from '@/constants/audit-log'
import type { z } from '@/lib/zod'
import type {
    AuditLogPayloadSchema,
    auditLogResponseSchema,
    auditLogsListParamsSchema,
    changesDetailsSchema,
} from '../schemas/audit-log'

// --- JSON Types ---
// Эти типы корректно представляют любое валидное JSON-значение.
export type JsonLiteral = string | number | boolean | null
export type Json = JsonLiteral | { [key: string]: Json } | Json[]

export type AuditLog = PrismaAuditLogType
export type ActionType = PrismaActionType
export type TargetType = (typeof TARGET_TYPE)[keyof typeof TARGET_TYPE]

// Тип для параметров запроса списка логов
export type AuditLogsListParams = z.infer<typeof auditLogsListParamsSchema>

// Тип для ответа API
export type AuditLogResponse = z.infer<typeof auditLogResponseSchema>

// Тип для создания лога с правильно типизированными `details`
export type AuditLogPayload = z.infer<typeof AuditLogPayloadSchema>

// Тип для единого объекта payload, используемого в AuditLogService
export type LogPayload = z.input<typeof AuditLogPayloadSchema> & {
    userId?: string
}

// Тип для логирования изменений
export type UpdatedDetails = z.infer<typeof changesDetailsSchema>

// Общий тип для списка логов
export type AuditLogsListResponse = {
    logs: AuditLogResponse[]
    pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
    }
}

// Типы для Prisma
export type AuditLogWhereInput = Prisma.AuditLogWhereInput
export type AuditLogOrderBy = Prisma.AuditLogOrderByWithRelationInput
