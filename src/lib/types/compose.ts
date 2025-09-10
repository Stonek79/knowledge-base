import { z } from 'zod';

import { composeChangeSetSchema } from '../schemas/compose';

export type ComposeChangeSet = z.infer<typeof composeChangeSetSchema>;
