import { ALLOWED_UPLOAD_MIME, DocumentFormat, MIME } from '@/constants/mime';
import { SupportedMime } from '@/lib/types/mime';

/**
 * Узкий guard для строкового MIME → SupportedMime.
 */
export function isSupportedMime(mime: string): mime is SupportedMime {
    return ALLOWED_UPLOAD_MIME.includes(mime);
}

export function mimeMapper(type: SupportedMime): DocumentFormat {
    switch (type) {
        case MIME.DOCX:
            return DocumentFormat.DOCX;
        case MIME.DOC:
            return DocumentFormat.DOC;
        case MIME.PDF:
            return DocumentFormat.PDF;
    }
}
