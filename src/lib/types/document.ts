import {
    Category,
    ConfidentialDocumentAccess,
    Document,
    Prisma,
    Role,
} from '@prisma/client';
import { z } from 'zod';

import { DOCUMENT_STATUS } from '@/constants/document';

import {
    createCategorySchema,
    createDocumentSchema,
    documentListSchema,
    updateCategorySchema,
    updateDocumentSchema,
    uploadFormSchema,
} from '../schemas/document';

export type CreateDocumentData = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentData = z.infer<typeof updateDocumentSchema>;
export type DocumentFilters = z.infer<typeof documentListSchema>;
export type WhereDocumentInput = Prisma.DocumentWhereInput;
export type CreateCategoryData = z.infer<typeof createCategorySchema>;
export type UpdateCategoryData = z.infer<typeof updateCategorySchema>;

export type DocumentOrderBy = Prisma.DocumentOrderByWithRelationInput;
export type DocumentFindManyArgs = Prisma.DocumentFindManyArgs;
export type DocumentCountArgs = Prisma.DocumentCountArgs;
export type DocumentGroupByArgs = Prisma.DocumentGroupByArgs;

export type CategoryBase = Category & {
    _count: {
        documents: number;
    };
};

export type Pagination = {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
};

export type DocumentCategory = Prisma.DocumentCategoryGetPayload<{
    include: {
        category: true;
    };
}>;

export type CreateDocumentServiceData = Omit<UploadFormData, 'username'> & {
    file: File;
    creatorId: string;
    authorId: string;
};

export type DocumentWithAuthor = Document & {
    author: {
        id: string;
        username: string;
        role: Role;
    };
    categories: DocumentCategory[];
    description?: string | null;
    keywords: string[];
    confidentialAccessUsers: ConfidentialDocumentAccess[];
};

export type DocumentListResponse = {
    documents: DocumentWithAuthor[];
    pagination: Pagination;
};

export type SearchedDocument = DocumentWithAuthor & {
    relevance?: number;
    highlights?: string[];
    isSearchResult?: boolean;
};

export type ViewableDocument = DocumentWithAuthor & {
    relevance?: number;
    highlights?: string[];
};

export type SearchResult = {
    id: string;
    title: string;
    content: string;
    description?: string | null;
    keywords: string[];
    author: string;
    createdAt: Date;
    relevance: number;
    highlights: string[];
    deletedAt?: Date | null;
};

export type SearchDocument = {
    id: string;
    title: string;
    content: string;
    description?: string | null;
    keywords: string[];
    categories: string[];
    categoryIds: string[];
    author: string;
    authorId: string;
    createdAt: Date;
    deletedAt?: Date | null;
};

export type SearchFilters = {
    categoryIds?: string[];
    authorId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    sortBy?: string;
    sortOrder?: string;
};

export type UploadFormData = z.infer<typeof uploadFormSchema>;
export type UploadFormInput = z.input<typeof uploadFormSchema>;

export type CreateCategoryResult = {
    message: string;
    category: CategoryBase;
};

export type UpdateCategoryResult = {
    message: string;
    category: CategoryBase;
};

export type DeleteCategoryResult = {
    message: string;
};

export type CategoryResponse = {
    categories: CategoryBase[];
};

export type DocumentStatus =
    (typeof DOCUMENT_STATUS)[keyof typeof DOCUMENT_STATUS];
