export const DEFAULT_CATEGORIES = [
    { name: 'Допуслуги', color: '#2196F3', isDefault: true },
    {
        name: 'Кадры и персонал',
        color: '#4CAF50',
        isDefault: true,
    },
    { name: 'Бухгалтерия', color: '#FF9800', isDefault: true },
    { name: 'Прочее', color: '#FF9800', isDefault: true },
];

export const SYSTEM_SETTINGS = {
    MAX_FILE_SIZE: 'max_file_size', // 2097152 байт (2MB)
    ALLOWED_MIME_TYPES: 'allowed_mime_types',
    SEARCH_INDEX_VERSION: 'search_index_version',
} as const;

export const SearchEngine = {
    JSON: 'json',
    ELASTICSEARCH: 'elasticsearch',
    FLEXSEARCH: 'flexsearch',
} as const;

export const DOCUMENT_TYPE = {
    MAIN: 'MAIN',
    ATTACHMENT: 'ATTACHMENT',
    REFERENCE: 'REFERENCE',
} as const; // { CONTRACT, INVOICE, OTHER }

export const DOCUMENT_FORMAT = {
    DOCX: 'DOCX',
    DOC: 'DOC',
    PDF: 'PDF',
} as const; // { DOCX, DOC, PDF }

export const ATTACHMENT_TYPE = {
    ATTACHMENT: 'ATTACHMENT',
    REFERENCE: 'REFERENCE',
} as const; // { ATTACHMENT, SIGNATURE }

export const SORT_FIELDS = {
    CREATED_AT: 'createdAt',
    UPDATED_AT: 'updatedAt',
    TITLE: 'title',
    FILE_SIZE: 'fileSize',
    VIEW_COUNT: 'viewCount',
    DOWNLOAD_COUNT: 'downloadCount',
} as const;

export const SORT_ORDER = {
    ASC: 'asc',
    DESC: 'desc',
} as const;

export const GROUP_BY_FIELDS = {
    AUTHOR_ID: 'authorId',
    DOCUMENT_TYPE: 'documentType',
    MIME_TYPE: 'mimeType',
    CREATED_AT: 'createdAt',
} as const;
