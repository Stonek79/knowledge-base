import { z } from 'zod';

import { systemSettingsSchema } from '@/lib/schemas/settings';

export type SystemSettings = z.infer<typeof systemSettingsSchema>;

// «Плоский» тип для приложения (без служебных полей)
export type AppSettings = Pick<
    SystemSettings,
    | 'maxFileSize'
    | 'maxFilesPerUpload'
    | 'allowedMimeTypes'
    | 'enableOcr'
    | 'ocrLanguages'
>;
