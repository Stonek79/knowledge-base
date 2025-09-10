import { DocumentFormat } from '@prisma/client';
export { DocumentFormat };

export const MIME = {
    DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    DOC: 'application/msword',
    PDF: 'application/pdf',
} as const;

// Разрешённые для загрузки типы (строгий readonly)
export const ALLOWED_UPLOAD_MIME: ReadonlyArray<string> = [
    MIME.DOCX,
    MIME.DOC,
    MIME.PDF,
];

// Сигнатуры (магические байты) для первичной проверки
export const MAGIC_SIGNATURES = {
    ZIP_PDF_DOC_CF: {
        ZIP_PREFIX_HEX: '504b', // DOCX/ZIP
        PDF_PREFIX_STR: '%PDF', // PDF
        DOC_PREFIX_HEX: 'd0cf11e0', // legacy DOC (CFB)
    },
} as const;
