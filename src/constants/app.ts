export const COOKIE_NAME = 'token';

export const GOTENBERG_URL = 'http://gotenberg:3000';

export const GOTENBERG_ENDPOINTS = {
    libreofficeConvert: '/forms/libreoffice/convert',
    chromiumDocument: '/forms/chromium/convert/document',
    pdfMerge: '/forms/pdfengines/merge',
} as const;

export const MINIO_CONFIG = {
    bucket: process.env.MINIO_BUCKET || 'knowledge-base',
    region: process.env.MINIO_REGION || 'us-east-1',
    useSSL: process.env.MINIO_USE_SSL === 'true',
} as const;

export const STORAGE_PATHS = {
    documents: 'documents',
    original: 'documents/original',
    converted: 'documents/converted',
    thumbnails: 'documents/thumbnails',
    temp: 'documents/temp',
    attachments: 'documents/attachments',
    combined: 'documents/combined',
} as const;

export const STORAGE_BASE_PATHS = {
    ORIGINAL: 'original',
    CONVERTED: 'converted',
    THUMBNAILS: 'thumbnails',
    TEMP: 'temp',
    ATTACHMENTS: 'attachments',
    COMBINED: 'combined',
} as const;
