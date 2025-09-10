import { DocumentFormat } from '@prisma/client';

import { MIME } from '@/constants/mime';

export type SupportedMime = (typeof MIME)[keyof typeof MIME];
export type MimeType = DocumentFormat;
