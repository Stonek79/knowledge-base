import type { z } from '@/lib/zod'

import type { loginSchema } from '../schemas/auth'

export type LoginData = z.infer<typeof loginSchema>
