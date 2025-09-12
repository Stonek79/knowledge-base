import { z } from 'zod';

import { USER_ROLES } from '@/constants/user';

export const createUserSchema = z.object({
    username: z
        .string()
        .min(3)
        .max(50)
        .regex(/^[a-zA-Z0-9_-]+$/, {
            message:
                'Имя пользователя может содержать только буквы, цифры, дефис и подчеркивание',
        }),
    password: z.string().min(6).max(25),
    role: z.enum(USER_ROLES).default(USER_ROLES.USER),
});

export const userResponseSchema = z.object({
    id: z.string(),
    username: z.string(),
    role: z.enum(USER_ROLES),
    createdAt: z.union([z.iso.datetime(), z.date()]),
});

export const usersListSchema = z.object({
    page: z.number().min(1),
    limit: z.number().min(1).max(100),
    search: z.string().optional(),
    sortBy: z.enum(['username', 'createdAt']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const updateUserSchema = z.object({
    username: z
        .string()
        .min(3)
        .max(50)
        .regex(/^[a-zA-Z0-9_-]+$/, {
            message:
                'Имя пользователя может содержать только буквы, цифры, дефис и подчеркивание',
        }),
    role: z.enum(USER_ROLES),
    newpassword: z
        .string()
        .optional()
        .superRefine((val, ctx) => {
            // Если поле пустое - не валидируем
            if (!val || val.trim() === '') {
                return;
            }

            // Если есть значение - валидируем
            if (val.length < 6) {
                ctx.addIssue({
                    code: 'too_small',
                    minimum: 6,
                    origin: 'string',
                    type: 'string',
                    inclusive: true,
                    message: 'Пароль должен содержать минимум 6 символов',
                    input: val,
                });
            }

            if (val.length > 25) {
                ctx.addIssue({
                    code: 'too_big',
                    maximum: 25,
                    origin: 'string',
                    type: 'string',
                    inclusive: true,
                    message: 'Пароль должен содержать максимум 25 символов',
                    input: val,
                });
            }
        }),
});
