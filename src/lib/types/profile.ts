import z from 'zod';

import {
    changePasswordSchema,
    profileSchema,
    profileUpdateSchema,
} from '@/lib/schemas/profile';

import type { Profile as ProfilePrisma } from '@prisma/client';

export type Profile = z.infer<typeof profileSchema>;
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;

export type PrismaProfile = ProfilePrisma;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
