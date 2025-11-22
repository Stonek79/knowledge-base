import {
    createCategorySchema,
    updateCategorySchema,
} from '@/lib/schemas/document'
import { z } from '@/lib/zod'
import { registry } from './registry'
import { DocumentWithAuthorSchema } from './schemas'

export const registerCategoryPaths = () => {
    // --- Helper Schemas ---
    const CategoryBaseSchema = registry.register(
        'CategoryBase',
        z.object({
            id: z.uuid(),
            name: z.string(),
            description: z.string().nullable().optional(),
            color: z.string().nullable().optional(),
            isDefault: z.boolean(),
            createdAt: z.date(),
            updatedAt: z.date(),
        })
    )

    const CategoryWithCountAndDocumentsSchema = registry.register(
        'CategoryWithCountAndDocuments',
        CategoryBaseSchema.extend({
            _count: z.object({
                documents: z.number().int(),
            }),
            documents: z.array(DocumentWithAuthorSchema).optional(),
        })
    )

    // --- Register Schemas ---
    registry.register('CreateCategory', createCategorySchema)
    registry.register('UpdateCategory', updateCategorySchema)

    // --- Register Paths ---
    registry.registerPath({
        method: 'get',
        path: '/categories',
        tags: ['Categories'],
        summary: 'Get all categories',
        responses: {
            '200': {
                description: 'A list of all categories with document counts',
                content: {
                    'application/json': {
                        schema: z.object({
                            categories: z.array(
                                CategoryWithCountAndDocumentsSchema
                            ),
                        }),
                    },
                },
            },
        },
    })

    registry.registerPath({
        method: 'post',
        path: '/categories',
        tags: ['Categories'],
        summary: 'Create a new category',
        request: {
            body: {
                content: {
                    'application/json': { schema: createCategorySchema },
                },
            },
        },
        responses: {
            '201': {
                description: 'Category created successfully',
                content: {
                    'application/json': {
                        schema: z.object({
                            message: z.string(),
                            category: CategoryBaseSchema,
                        }),
                    },
                },
            },
        },
    })

    registry.registerPath({
        method: 'get',
        path: '/categories/{categoryId}',
        tags: ['Categories'],
        summary: 'Get a single category by ID',
        request: {
            params: z.object({ categoryId: z.uuid() }),
        },
        responses: {
            '200': {
                description: 'The category object with document counts',
                content: {
                    'application/json': {
                        schema: z.object({
                            category: CategoryWithCountAndDocumentsSchema,
                        }),
                    },
                },
            },
        },
    })

    registry.registerPath({
        method: 'put',
        path: '/categories/{categoryId}',
        tags: ['Categories'],
        summary: 'Update a category',
        request: {
            params: z.object({ categoryId: z.uuid() }),
            body: {
                content: {
                    'application/json': { schema: updateCategorySchema },
                },
            },
        },
        responses: {
            '200': {
                description: 'Category updated successfully',
                content: {
                    'application/json': {
                        schema: z.object({
                            message: z.string(),
                            category: CategoryBaseSchema,
                        }),
                    },
                },
            },
        },
    })

    registry.registerPath({
        method: 'delete',
        path: '/categories/{categoryId}',
        tags: ['Categories'],
        summary: 'Delete a category',
        request: {
            params: z.object({ categoryId: z.uuid() }),
        },
        responses: {
            '200': {
                description: 'Category deleted successfully',
                content: {
                    'application/json': {
                        schema: z.object({ message: z.string() }),
                    },
                },
            },
        },
    })
}
