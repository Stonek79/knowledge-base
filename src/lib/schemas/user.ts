import {
    USER_ROLES,
    USER_SORTABLE_FIELDS,
    USER_STATUSES,
} from '@/constants/user'
import { z } from '@/lib/zod'

import { profileSchema } from './profile'

export const createUserSchema = z
    .object({
        username: z
            .string()
            .min(3, {
                message: 'Имя пользователя должно быть минимум 3 символа',
            })
            .max(50, {
                message: 'Имя пользователя должно быть максимум 50 символов',
            })
            .regex(/^[a-zA-Zа-яА-Я0-9_@!?-]+$/, {
                message:
                    'Имя пользователя может содержать русские и латинские буквы, цифры и символы _@!?-',
            }),

        role: z.enum(USER_ROLES).default(USER_ROLES.USER),
        status: z.enum(USER_STATUSES).default(USER_STATUSES.ACTIVE),
        enabled: z.boolean().default(false),
        password: z.string().optional(),
        confirmPassword: z.string().optional(),
    })
    .refine(
        data => {
            if (data.status === USER_STATUSES.PLACEHOLDER || !data.password) {
                return true
            }
            return data?.password?.length >= 6
        },
        {
            message: 'Пароль должен быть минимум 6 символов',
            path: ['password'],
        }
    )
    .refine(
        data => {
            if (data.status === USER_STATUSES.PLACEHOLDER || !data.password) {
                return true
            }
            return data?.password?.length <= 25
        },
        {
            message: 'Пароль должен быть максимум 25 символов',
            path: ['password'],
        }
    )
    .refine(
        data => {
            if (data.status === USER_STATUSES.PLACEHOLDER || !data.password) {
                return true
            }
            return data.password === data.confirmPassword
        },
        {
            message: 'Пароли не совпадают',
            path: ['confirmPassword'],
        }
    )

export const userResponseSchema = z.object({
    id: z.string(),
    username: z.string(),
    role: z.enum(USER_ROLES),
    createdAt: z.union([z.iso.datetime(), z.date()]),
    enabled: z.boolean(),
    status: z.enum(USER_STATUSES).optional(),
    profile: profileSchema.optional(),
    password: z.string().nullable().optional(),
})

export const jwtPayloadSchema = z.object({
    id: z.string(),
    username: z.string(),
    role: z.enum(USER_ROLES),
    createdAt: z.union([z.string(), z.date()]), // или приведите к строке
    enabled: z.boolean(),
})

export const usersListSchema = z.object({
    page: z.number().min(1),
    limit: z.number().min(1).max(100),
    search: z.string().optional(),
    sortBy: z
        .enum(Object.values(USER_SORTABLE_FIELDS))
        .optional()
        .default(USER_SORTABLE_FIELDS.CREATED_AT),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    status: z.string().optional(),
})

export const updateUserSchema = z
    .object({
        username: z
            .string()
            .min(3, {
                message: 'Имя пользователя должно быть минимум 3 символа',
            })
            .max(50, {
                message: 'Имя пользователя должно быть максимум 50 символов',
            })
            .regex(/^[a-zA-Z0-9_-]+$/, {
                message:
                    'Имя пользователя может содержать только буквы, цифры, дефис и подчеркивание',
            }),
        role: z.enum(USER_ROLES),
        status: z.enum(USER_STATUSES).optional(),
        enabled: z.boolean().optional(),
        newPassword: z.string().optional(),
        confirmNewPassword: z.string().optional(),
    })
    .refine(
        data => {
            if (!data.newPassword) {
                return true // Если пароль не меняется, пропускаем проверку
            }
            return data.newPassword.length >= 6
        },
        {
            message: 'Пароль должен быть минимум 6 символов',
            path: ['newPassword'],
        }
    )
    .refine(
        data => {
            if (!data.newPassword) {
                return true // Если пароль не меняется, пропускаем проверку
            }
            return data.newPassword.length <= 25
        },
        {
            message: 'Пароль должен быть максимум 25 символов',
            path: ['newPassword'],
        }
    )
    .refine(
        data => {
            // Если пароль меняется, он должен совпадать с подтверждением
            if (data.newPassword) {
                return data.newPassword === data.confirmNewPassword
            }
            // Если не меняется, пропускаем
            return true
        },
        {
            message: 'Пароли не совпадают',
            path: ['confirmNewPassword'],
        }
    )
