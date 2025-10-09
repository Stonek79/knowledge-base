import { z } from 'zod';

import { DOCUMENT_STATUS } from '@/constants/document';

import { attachmentMetadataSchema, baseAttachmentSchema } from './attachment';

export const createDocumentSchema = z.object({
    title: z
        .string()
        .min(1, 'Название обязательно')
        .max(200, 'Название не более 200 символов'),
    description: z
        .string()
        .max(1000, 'Описание не более 1000 символов')
        .optional(),
    categoryIds: z.array(z.string()).min(1, 'Выберите хотя бы одну категорию'),
    keywords: z
        .string()
        .max(500, 'Ключевые слова не более 500 символов')
        .optional(),
    authorId: z.string(),
});

export const updateDocumentSchema = z
    .object({
        title: z.string().min(1).max(200).optional(),
        description: z.string().max(1000).optional(),
        categoryIds: z.array(z.string()).optional(),
        keywords: z.string().max(500).optional(),
        attachments: z.array(attachmentMetadataSchema).optional(),
        authorId: z.string().optional(),
        username: z.string().optional(),
    })
    .refine(data => !!data.authorId || !!data.username, {
        message:
            'Необходимо указать автора (либо выбрать существующего, либо ввести имя нового)',
        path: ['authorId'], // Путь для отображения ошибки
    });

export const documentListSchema = z.object({
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(10),
    categoryIds: z.array(z.string()).optional(),
    authorId: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    sortBy: z
        .enum(['title', 'createdAt', 'updatedAt', 'viewCount', 'downloadCount'])
        .default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    q: z.string().optional(),
    status: z.enum(DOCUMENT_STATUS).optional(),
});

export const createCategorySchema = z.object({
    name: z
        .string()
        .min(1, 'Название категории обязательно')
        .max(100, 'Название не более 100 символов'),
    description: z
        .string()
        .max(500, 'Описание не более 500 символов')
        .optional(),
    color: z
        .string()
        .regex(/^#[0-9A-F]{6}$/i, 'Неверный формат цвета')
        .optional(),
    isDefault: z.boolean().optional(),
});

export const updateCategorySchema = createCategorySchema
    .extend({
        id: z.string(),
    })
    .partial();

export const searchSchema = z.object({
    q: z.string().nullable().optional(),
    categoryIds: z.string().nullable().optional(),
    authorId: z.string().nullable().optional(),
    dateFrom: z.string().nullable().optional(),
    dateTo: z.string().nullable().optional(),
    sortBy: z.string().nullable().optional(),
    sortOrder: z.string().nullable().optional(),
    status: z.enum(DOCUMENT_STATUS).optional(),
});

export const uploadFormSchema = z
    .object({
        file: z.any().optional(),
        title: z.string().min(1, 'Введите название документа'),
        description: z.string().optional(),
        categoryIds: z
            .array(z.string())
            .min(1, 'Выберите хотя бы одну категорию'),
        keywords: z.string().optional(),
        isConfidential: z.boolean().default(true).optional(),
        isSecret: z.boolean().default(false).optional(),
        accessCode: z.string().optional(),
        attachments: z.array(baseAttachmentSchema).optional(),
        confidentialAccessUserIds: z.array(z.string()).optional(),
        authorId: z.string().optional(),
        username: z.string().optional(),
    })
    .refine(data => !!data.authorId || !!data.username, {
        message:
            'Необходимо указать автора (либо выбрать существующего, либо ввести имя нового)',
        path: ['authorId'], // Путь для отображения ошибки
    });
