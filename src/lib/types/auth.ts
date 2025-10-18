import type { z } from 'zod'

import type { loginSchema } from '../schemas/auth'

export type LoginData = z.infer<typeof loginSchema>
