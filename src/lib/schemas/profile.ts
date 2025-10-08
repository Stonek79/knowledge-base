import { z } from 'zod';

import { profileVisibilityDefaults } from '@/constants/user';

export const profileVisibilitySettingsSchema = z.object({
    fullName: z.boolean(),
    jobTitle: z.boolean(),
    email: z.boolean(),
    phoneCity: z.boolean(),
    phoneInternal: z.boolean(),
    phoneMobile: z.boolean(),
    manager: z.boolean(),
    birthday: z.boolean(),
    aboutMe: z.boolean(),
});

export const profileSchema = z.object({
    id: z.string().optional(),
    userId: z.string().optional(),
    fullName: z.string().nullable().optional(),
    jobTitle: z.string().nullable().optional(),
    email: z
        .email({ message: 'Неверный формат email' })
        .nullable()
        .optional()
        .or(z.literal('')),
    phoneCity: z.string().nullable().optional(),
    phoneInternal: z.string().nullable().optional(),
    phoneMobile: z.string().nullable().optional(),
    manager: z.string().nullable().optional(),
    birthday: z.date().nullable().optional(),
    aboutMe: z.string().nullable().optional(),
    updatedAt: z.date().optional(),
    visibilitySettings: profileVisibilitySettingsSchema.default(
        profileVisibilityDefaults
    ),
});

/**
 * Схема для валидации данных при обновлении профиля пользователя.
 */
export const profileUpdateSchema = z.object({
    fullName: z.string().nullable().optional(),
    jobTitle: z.string().nullable().optional(),
    email: z
        .email({ message: 'Неверный формат email' })
        .nullable()
        .optional()
        .or(z.literal('')),
    phoneCity: z.string().nullable().optional(),
    phoneInternal: z.string().nullable().optional(),
    phoneMobile: z.string().nullable().optional(),
    manager: z.string().nullable().optional(),
    birthday: z.date().nullable().optional(),
    aboutMe: z.string().nullable().optional(),
    visibilitySettings: profileVisibilitySettingsSchema.partial().optional(),
});

export const profileUpdateApiScheme = profileUpdateSchema.extend({
    birthday: z.coerce.date().nullable().optional(),
});

/**
 * Схема для валидации формы смены пароля.
 */
export const changePasswordSchema = z
    .object({
        oldPassword: z
            .string()
            .min(6, 'Текущий пароль должен быть минимум 6 символов')
            .max(25, 'Текущий пароль должен быть максимум 25 символов'),
        newPassword: z
            .string()
            .min(6, 'Новый пароль должен быть минимум 6 символов')
            .max(25, 'Новый пароль должен быть максимум 25 символов'),
        confirmPassword: z
            .string()
            .min(6, 'Подтверждение пароля должно быть минимум 6 символов')
            .max(25, 'Подтверждение пароля должно быть максимум 25 символов'),
    })
    .refine(data => data.newPassword === data.confirmPassword, {
        message: 'Пароли не совпадают',
        path: ['confirmPassword'], // Указываем, к какому полю относится ошибка
    });
