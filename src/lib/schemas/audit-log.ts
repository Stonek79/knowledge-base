import {
    ACTION_TYPE,
    ACTION_TYPE_VALUES,
    TARGET_TYPE_VALUES,
} from '@/constants/audit-log'
import { z } from '@/lib/zod'

// Используем встроенную схему z.json() для гарантии, что `details` - валидный JSON.
const jsonSchema = z.json()

// --- Специфичные схемы для поля `details` ---
export const changesDetailsSchema = z.object({
    field: z.string(),
    oldValue: jsonSchema.optional(),
    newValue: jsonSchema.optional(),
})

// Для USER_UPDATED: храним, что и как изменилось.
const UserUpdatedDetailsSchema = z
    .object({
        changes: z.array(changesDetailsSchema),
    })
    .optional()

// Для DOCUMENT_ACCESS_GRANTED/REVOKED: храним, кого затронуло действие.
const DocumentAccessDetailsSchema = z
    .object({
        grantedToUserId: z.string(),
        grantedToUsername: z.string(),
    })
    .optional()

// Для USER_LOGIN_FAILED: храним, какой логин использовался.
const UserLoginFailedDetailsSchema = z
    .object({
        attemptedUsername: z.string().optional(),
        isFailUser: z.boolean().optional(),
        isFailPassword: z.boolean().optional(),
        isInvalidToken: z.boolean().optional(),
    })
    .optional()

// Новые схемы для details
const UserLoginDetailsSchema = z
    .object({
        ipAddress: z.string().optional(),
        userAgent: z.string().optional(),
        attemptedUsername: z.string(),
    })
    .optional()

const UserLogoutDetailsSchema = z
    .object({
        ipAddress: z.string().optional(),
        userAgent: z.string().optional(),
    })
    .optional()

const UserCreatedDetailsSchema = z
    .object({
        createdUserId: z.string(),
        createdUsername: z.string(),
    })
    .optional()

const UserDeletedDetailsSchema = z
    .object({
        deletedUserId: z.string(),
        deletedUsername: z.string(),
    })
    .optional()

const UserPasswordChangedDetailsSchema = z
    .object({
        changedUserId: z.string(),
        changedUsername: z.string(),
    })
    .optional()

const ProfileUpdatedDetailsSchema = z
    .object({
        updatedUserId: z.string(),
        updatedUsername: z.string(),
        changes: z.array(changesDetailsSchema),
    })
    .optional()

const DocumentCreatedDetailsSchema = z
    .object({
        documentId: z.string(),
        documentName: z.string(),
        categoryIds: z.array(z.string()).optional(),
        categoryNames: z.array(z.string()).optional(),
        authorId: z.string(),
        authorName: z.string(),
    })
    .optional()

const DocumentUpdatedDetailsSchema = z
    .object({
        documentId: z.string(),
        documentName: z.string(),
        changes: z.array(changesDetailsSchema),
    })
    .optional()

const DocumentViewedDetailsSchema = z
    .object({
        documentId: z.string(),
        documentName: z.string(),
        ipAddress: z.string().optional(),
    })
    .optional()

const DocumentDownloadedDetailsSchema = z
    .object({
        documentId: z.string(),
        documentName: z.string(),
        ipAddress: z.string().optional(),
    })
    .optional()

const DocumentDeletedSoftDetailsSchema = z
    .object({
        documentId: z.string(),
        documentName: z.string(),
    })
    .optional()

const DocumentDeletedHardDetailsSchema = z
    .object({
        documentId: z.string(),
        documentName: z.string(),
    })
    .optional()

const DocumentRestoredDetailsSchema = z
    .object({
        documentId: z.string(),
        documentName: z.string(),
    })
    .optional()

const CategoryCreatedDetailsSchema = z
    .object({
        categoryId: z.string(),
        categoryName: z.string(),
    })
    .optional()

const CategoryUpdatedDetailsSchema = z
    .object({
        categoryId: z.string(),
        categoryName: z.string(),
        changes: z.array(changesDetailsSchema),
    })
    .optional()

const CategoryDeletedDetailsSchema = z
    .object({
        categoryId: z.string(),
        categoryName: z.string(),
    })
    .optional()

const SystemSettingsUpdatedDetailsSchema = z
    .object({
        changes: z.array(
            z.object({
                settingName: z.string(),
                oldValue: jsonSchema.optional(),
                newValue: jsonSchema,
            })
        ),
    })
    .optional()

// --- Основные схемы ---

// "Умная" схема, которая валидирует `details` в зависимости от `action`.
export const AuditLogPayloadSchema = z.discriminatedUnion('action', [
    // Действия с определенной структурой `details`
    z.object({
        action: z.literal(ACTION_TYPE.USER_UPDATED),
        details: UserUpdatedDetailsSchema,
        targetId: z.string().optional(),
        targetType: z.enum(TARGET_TYPE_VALUES).optional(),
    }),
    z.object({
        action: z.literal(ACTION_TYPE.DOCUMENT_ACCESS_GRANTED),
        details: DocumentAccessDetailsSchema,
        targetId: z.string().optional(),
        targetType: z.enum(TARGET_TYPE_VALUES).optional(),
    }),
    z.object({
        action: z.literal(ACTION_TYPE.DOCUMENT_ACCESS_REVOKED),
        details: DocumentAccessDetailsSchema,
        targetId: z.string().optional(),
        targetType: z.enum(TARGET_TYPE_VALUES).optional(),
    }),
    z.object({
        action: z.literal(ACTION_TYPE.USER_LOGIN_FAILED),
        details: UserLoginFailedDetailsSchema,
        targetId: z.string().optional(),
        targetType: z.enum(TARGET_TYPE_VALUES).optional(),
    }),

    // Действия, у которых теперь есть специфичные `details`.
    z.object({
        action: z.literal(ACTION_TYPE.USER_LOGIN),
        details: UserLoginDetailsSchema,
        targetId: z.string().optional(),
        targetType: z.enum(TARGET_TYPE_VALUES).optional(),
    }),
    z.object({
        action: z.literal(ACTION_TYPE.USER_LOGOUT),
        details: UserLogoutDetailsSchema,
        targetId: z.string().optional(),
        targetType: z.enum(TARGET_TYPE_VALUES).optional(),
    }),
    z.object({
        action: z.literal(ACTION_TYPE.USER_CREATED),
        details: UserCreatedDetailsSchema,
        targetId: z.string().optional(),
        targetType: z.enum(TARGET_TYPE_VALUES).optional(),
    }),
    z.object({
        action: z.literal(ACTION_TYPE.USER_DELETED),
        details: UserDeletedDetailsSchema,
        targetId: z.string().optional(),
        targetType: z.enum(TARGET_TYPE_VALUES).optional(),
    }),
    z.object({
        action: z.literal(ACTION_TYPE.USER_PASSWORD_CHANGED),
        details: UserPasswordChangedDetailsSchema,
        targetId: z.string().optional(),
        targetType: z.enum(TARGET_TYPE_VALUES).optional(),
    }),
    z.object({
        action: z.literal(ACTION_TYPE.PROFILE_UPDATED),
        details: ProfileUpdatedDetailsSchema,
        targetId: z.string().optional(),
        targetType: z.enum(TARGET_TYPE_VALUES).optional(),
    }),
    z.object({
        action: z.literal(ACTION_TYPE.DOCUMENT_CREATED),
        details: DocumentCreatedDetailsSchema,
        targetId: z.string().optional(),
        targetType: z.enum(TARGET_TYPE_VALUES).optional(),
    }),
    z.object({
        action: z.literal(ACTION_TYPE.DOCUMENT_UPDATED),
        details: DocumentUpdatedDetailsSchema,
        targetId: z.string().optional(),
        targetType: z.enum(TARGET_TYPE_VALUES).optional(),
    }),
    z.object({
        action: z.literal(ACTION_TYPE.DOCUMENT_VIEWED),
        details: DocumentViewedDetailsSchema,
        targetId: z.string().optional(),
        targetType: z.enum(TARGET_TYPE_VALUES).optional(),
    }),
    z.object({
        action: z.literal(ACTION_TYPE.DOCUMENT_DOWNLOADED),
        details: DocumentDownloadedDetailsSchema,
        targetId: z.string().optional(),
        targetType: z.enum(TARGET_TYPE_VALUES).optional(),
    }),
    z.object({
        action: z.literal(ACTION_TYPE.DOCUMENT_DELETED_SOFT),
        details: DocumentDeletedSoftDetailsSchema,
        targetId: z.string().optional(),
        targetType: z.enum(TARGET_TYPE_VALUES).optional(),
    }),
    z.object({
        action: z.literal(ACTION_TYPE.DOCUMENT_DELETED_HARD),
        details: DocumentDeletedHardDetailsSchema,
        targetId: z.string().optional(),
        targetType: z.enum(TARGET_TYPE_VALUES).optional(),
    }),
    z.object({
        action: z.literal(ACTION_TYPE.DOCUMENT_RESTORED),
        details: DocumentRestoredDetailsSchema,
        targetId: z.string().optional(),
        targetType: z.enum(TARGET_TYPE_VALUES).optional(),
    }),
    z.object({
        action: z.literal(ACTION_TYPE.CATEGORY_CREATED),
        details: CategoryCreatedDetailsSchema,
        targetId: z.string().optional(),
        targetType: z.enum(TARGET_TYPE_VALUES).optional(),
    }),
    z.object({
        action: z.literal(ACTION_TYPE.CATEGORY_UPDATED),
        details: CategoryUpdatedDetailsSchema,
        targetId: z.string().optional(),
        targetType: z.enum(TARGET_TYPE_VALUES).optional(),
    }),
    z.object({
        action: z.literal(ACTION_TYPE.CATEGORY_DELETED),
        details: CategoryDeletedDetailsSchema,
        targetId: z.string().optional(),
        targetType: z.enum(TARGET_TYPE_VALUES).optional(),
    }),
    z.object({
        action: z.literal(ACTION_TYPE.SYSTEM_SETTINGS_UPDATED),
        details: SystemSettingsUpdatedDetailsSchema,
        targetId: z.string().optional(),
        targetType: z.enum(TARGET_TYPE_VALUES).optional(),
    }),
])

// Схема для валидации параметров GET-запроса списка логов
export const auditLogsListParamsSchema = z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().optional().default(20),
    userIds: z.array(z.string()).optional(),
    actions: z.array(z.enum(ACTION_TYPE_VALUES)).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    sortBy: z.string().optional().default('timestamp'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
})

// Схема для ответа API (одна запись лога)
export const auditLogResponseSchema = z.object({
    id: z.string(),
    timestamp: z.date(),
    action: z.enum(ACTION_TYPE_VALUES),
    user: z.object({ id: z.string(), username: z.string() }),
    targetId: z.string().nullable(),
    targetType: z.enum(TARGET_TYPE_VALUES).nullable(),
    details: jsonSchema.nullable(), // Используем валидную JSON-схему, разрешая null
})
