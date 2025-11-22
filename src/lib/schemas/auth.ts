import { z } from '@/lib/zod'

export const loginSchema = z.object({
    username: z.string().min(1),
    password: z.string().min(1),
})
