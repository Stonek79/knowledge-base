import type { Profile as ProfilePrisma } from '@prisma/client'
import type z from 'zod'
import type {
    changePasswordSchema,
    profileSchema,
    profileUpdateSchema,
} from '@/lib/schemas/profile'

export type Profile = z.infer<typeof profileSchema>
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>

export type PrismaProfile = ProfilePrisma
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>
