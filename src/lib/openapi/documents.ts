import { composeChangeSetSchema } from '@/lib/schemas/compose'
import {
    createDocumentSchema,
    documentListSchema,
    updateDocumentSchema,
    uploadFormSchema,
} from '@/lib/schemas/document'
import { z } from '@/lib/zod'
import { registry } from './registry'
import { DocumentWithAuthorSchema, PaginationSchema } from './schemas'

export const registerDocumentPaths = () => {
    // --- Register Schemas used in this module ---
    const AttachmentStagingResponseSchema = registry.register(
        'AttachmentStagingResponse',
        z.object({
            tempKey: z.string(),
            originalName: z.string(),
            mimeType: z.string(),
            size: z.number().int(),
        })
    )

    registry.register('CreateDocument', createDocumentSchema)
    registry.register('UpdateDocument', updateDocumentSchema)
    registry.register('UploadForm', uploadFormSchema)
    registry.register('ComposeChangeSet', composeChangeSetSchema)

    // --- Register Paths ---

    registry.registerPath({
        method: 'get',
        path: '/documents',
        tags: ['Documents'],
        summary: 'Get a list of documents',
        request: {
            query: documentListSchema,
        },
        responses: {
            '200': {
                description: 'A list of documents with pagination',
                content: {
                    'application/json': {
                        schema: z.object({
                            documents: z.array(DocumentWithAuthorSchema),
                            pagination: PaginationSchema,
                        }),
                    },
                },
            },
        },
    })

    registry.registerPath({
        method: 'post',
        path: '/documents',
        tags: ['Documents'],
        summary: 'Create a new document',
        request: {
            body: {
                content: {
                    'multipart/form-data': {
                        schema: uploadFormSchema,
                    },
                },
            },
        },
        responses: {
            '201': {
                description: 'Document created successfully',
                content: {
                    'application/json': {
                        schema: z.object({
                            message: z.string(),
                            document: DocumentWithAuthorSchema,
                        }),
                    },
                },
            },
        },
    })

    registry.registerPath({
        method: 'get',
        path: '/documents/{documentId}',
        tags: ['Documents'],
        summary: 'Get a single document by ID',
        request: {
            params: z.object({ documentId: z.uuid() }),
        },
        responses: {
            '200': {
                description: 'The document object',
                content: {
                    'application/json': {
                        schema: z.object({
                            document: DocumentWithAuthorSchema,
                        }),
                    },
                },
            },
        },
    })

    registry.registerPath({
        method: 'put',
        path: '/documents/{documentId}',
        tags: ['Documents'],
        summary: 'Update a document',
        request: {
            params: z.object({ documentId: z.uuid() }),
            body: {
                content: {
                    'application/json': { schema: updateDocumentSchema },
                },
            },
        },
        responses: {
            '200': {
                description: 'Document updated successfully',
                content: {
                    'application/json': {
                        schema: z.object({
                            message: z.string(),
                            document: DocumentWithAuthorSchema,
                        }),
                    },
                },
            },
        },
    })

    registry.registerPath({
        method: 'delete',
        path: '/documents/{documentId}',
        tags: ['Documents'],
        summary: 'Delete a document by ID',
        request: {
            params: z.object({ documentId: z.uuid() }),
            query: z.object({ hard: z.boolean().optional() }),
        },
        responses: {
            '200': {
                description: 'Document deleted successfully',
                content: {
                    'application/json': {
                        schema: z.object({ message: z.string() }),
                    },
                },
            },
        },
    })

    registry.registerPath({
        method: 'get',
        path: '/documents/{documentId}/download',
        tags: ['Documents'],
        summary: 'Download a document file',
        request: {
            params: z.object({ documentId: z.uuid() }),
            query: z.object({
                type: z.enum(['original', 'pdf', 'converted']).optional(),
                disposition: z.enum(['inline', 'attachment']).optional(),
            }),
        },
        responses: {
            '200': {
                description: 'The document file stream',
                content: {
                    'application/octet-stream': {
                        schema: z
                            .string()
                            .meta({ type: 'string', format: 'binary' }),
                    },
                },
            },
        },
    })

    registry.registerPath({
        method: 'post',
        path: '/documents/{documentId}/restore',
        tags: ['Documents'],
        summary: 'Restore a soft-deleted document',
        request: {
            params: z.object({ documentId: z.uuid() }),
        },
        responses: {
            '200': {
                description: 'Document restored successfully',
                content: {
                    'application/json': {
                        schema: z.object({ message: z.string() }),
                    },
                },
            },
        },
    })

    registry.registerPath({
        method: 'get',
        path: '/documents/{documentId}/attachments/archive',
        tags: ['Attachments'],
        summary: 'Download all document attachments as a zip archive',
        request: {
            params: z.object({ documentId: z.uuid() }),
        },
        responses: {
            '200': {
                description: 'A zip archive',
                content: {
                    'application/zip': {
                        schema: z
                            .string()
                            .meta({ type: 'string', format: 'binary' }),
                    },
                },
            },
        },
    })

    registry.registerPath({
        method: 'post',
        path: '/documents/attachments/stage',
        tags: ['Attachments'],
        summary: 'Stage a file for attachment',
        request: {
            body: {
                content: {
                    'multipart/form-data': {
                        schema: z.object({
                            file: z
                                .string()
                                .meta({ type: 'string', format: 'binary' }),
                        }),
                    },
                },
            },
        },
        responses: {
            '200': {
                description: 'File staged successfully',
                content: {
                    'application/json': {
                        schema: AttachmentStagingResponseSchema,
                    },
                },
            },
        },
    })

    registry.registerPath({
        method: 'post',
        path: '/documents/compose/commit',
        tags: ['Documents'],
        summary: 'Atomically creates a new document with attachments',
        request: {
            body: {
                content: {
                    'application/json': { schema: composeChangeSetSchema },
                },
            },
        },
        responses: {
            '200': {
                description: 'Document created successfully',
                content: {
                    'application/json': {
                        schema: z.object({
                            status: z.literal('ok'),
                            document: DocumentWithAuthorSchema,
                        }),
                    },
                },
            },
        },
    })
}
