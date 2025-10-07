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
