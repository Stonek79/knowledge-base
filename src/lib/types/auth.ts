import { z } from 'zod';

import { loginSchema } from '../schemas/auth';

export type LoginData = z.infer<typeof loginSchema>;
