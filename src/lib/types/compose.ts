import type { z } from 'zod'

import type { composeChangeSetSchema } from '../schemas/compose'

export type ComposeChangeSet = z.infer<typeof composeChangeSetSchema>
