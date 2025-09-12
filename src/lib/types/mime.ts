import { DOCUMENT_FORMAT, MIME } from '@/constants/mime';

export type SupportedMime = (typeof MIME)[keyof typeof MIME];
export type MimeType = (typeof DOCUMENT_FORMAT)[keyof typeof DOCUMENT_FORMAT];
