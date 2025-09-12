import { ALLOWED_UPLOAD_MIME, DOCUMENT_FORMAT, MIME } from '@/constants/mime';
import { SupportedMime, MimeType } from '@/lib/types/mime';

/**
 * Узкий guard для строкового MIME → SupportedMime.
 */
export function isSupportedMime(mime: string): mime is SupportedMime {
    return ALLOWED_UPLOAD_MIME.includes(mime);
}

export function mimeMapper(type: SupportedMime): MimeType {
    switch (type) {
        case MIME.DOCX:
            return DOCUMENT_FORMAT.DOCX;
        case MIME.DOC:
            return DOCUMENT_FORMAT.DOC;
        case MIME.PDF:
            return DOCUMENT_FORMAT.PDF;
    }
}
