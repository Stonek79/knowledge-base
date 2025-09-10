import { z } from 'zod';

export const systemSettingsSchema = z.object({
  id: z.string().default('singleton'),
  maxFileSize: z.number().int().min(1).default(2 * 1024 * 1024), // 2MB
  maxFilesPerUpload: z.number().int().min(1).default(10),
  allowedMimeTypes: z.array(z.string()).default([]),
  enableOcr: z.boolean().default(true),
  ocrLanguages: z.array(z.string()).default(['rus', 'eng']),
  updatedAt: z.date().optional(),
  updatedBy: z.string().nullable().optional(),
});