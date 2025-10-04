import { NextResponse } from 'next/server';

import swaggerJsdoc from 'swagger-jsdoc';

export async function GET() {
    const options = {
        definition: {
            openapi: '3.0.0',
            info: {
                title: 'Knowledge Base API',
                version: '1.0.0',
                description: 'API for the Knowledge Base application',
            },
            servers: [
                {
                    url: '/api',
                },
            ],
            components: {
                schemas: {
                    User: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            username: { type: 'string' },
                            role: { type: 'string', enum: ['ADMIN', 'USER', 'GUEST'] },
                            status: { type: 'string', enum: ['ACTIVE', 'PLACEHOLDER'] },
                            enabled: { type: 'boolean' },
                            createdAt: { type: 'string', format: 'date-time' },
                        },
                    },
                    Pagination: {
                        type: 'object',
                        properties: {
                            page: { type: 'integer' },
                            limit: { type: 'integer' },
                            total: { type: 'integer' },
                            totalPages: { type: 'integer' },
                        },
                    },
                    UsersListResponse: {
                        type: 'object',
                        properties: {
                            users: {
                                type: 'array',
                                items: {
                                    $ref: '#/components/schemas/User',
                                },
                            },
                            pagination: {
                                $ref: '#/components/schemas/Pagination',
                            },
                        },
                    },
                    CreateUserSchema: {
                        type: 'object',
                        required: ['username', 'password', 'confirmPassword'],
                        properties: {
                            username: { type: 'string', minLength: 3 },
                            password: { type: 'string', minLength: 6 },
                            confirmPassword: { type: 'string', minLength: 6 },
                            role: { type: 'string', enum: ['ADMIN', 'USER', 'GUEST'] },
                            status: { type: 'string', enum: ['ACTIVE', 'PLACEHOLDER'] },
                            enabled: { type: 'boolean' },
                        },
                    },
                    CreateUserResponse: {
                        type: 'object',
                        properties: {
                            message: { type: 'string' },
                            user: {
                                $ref: '#/components/schemas/User',
                            },
                        },
                    },
                    UpdateUserSchema: {
                        type: 'object',
                        properties: {
                            username: { type: 'string', minLength: 3 },
                            newPassword: { type: 'string', minLength: 6 },
                            confirmNewPassword: { type: 'string', minLength: 6 },
                            role: { type: 'string', enum: ['ADMIN', 'USER', 'GUEST'] },
                            status: { type: 'string', enum: ['ACTIVE', 'PLACEHOLDER'] },
                            enabled: { type: 'boolean' },
                        },
                    },
                    UpdateDocumentSchema: {
                        type: 'object',
                        properties: {
                            title: { type: 'string' },
                            description: { type: 'string' },
                            categoryIds: { type: 'array', items: { type: 'string' } },
                            keywords: { type: 'string' },
                            authorId: { type: 'string' },
                            username: { type: 'string' },
                        },
                    },
                    ComposeChangeSet: {
                        type: 'object',
                        properties: {
                            operationId: { type: 'string', format: 'uuid' },
                            metadata: { 
                                type: 'object',
                                properties: {
                                    title: { type: 'string' },
                                    description: { type: 'string' },
                                    authorId: { type: 'string' },
                                    username: { type: 'string' },
                                    categoryIds: { type: 'array', items: { type: 'string' } },
                                    keywords: { type: 'string' },
                                    isConfidential: { type: 'boolean' },
                                    isSecret: { type: 'boolean' },
                                    accessCode: { type: 'string' },
                                    confidentialAccessUserIds: { type: 'array', items: { type: 'string' } },
                                }
                            },
                            replaceMain: { type: 'object' },
                            addAttachments: { type: 'array', items: { type: 'object' } },
                            deleteAttachmentIds: { type: 'array', items: { type: 'string' } },
                            reorder: { type: 'array', items: { type: 'object' } },
                        }
                    },
                    UpdateCategorySchema: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            description: { type: 'string' },
                            color: { type: 'string', format: 'hex' },
                            isDefault: { type: 'boolean' },
                        },
                    },
                    CreateCategorySchema: {
                        type: 'object',
                        required: ['name'],
                        properties: {
                            name: { type: 'string' },
                            description: { type: 'string' },
                            color: { type: 'string', format: 'hex' },
                            isDefault: { type: 'boolean' },
                        },
                    },
                },
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT',
                    },
                },
            },
            security: [
                {
                    bearerAuth: [],
                },
            ],
        },
        apis: ['./src/app/api/**/*.ts'], // Path to the API routes
    };

    const openapiSpecification = swaggerJsdoc(options);

    return NextResponse.json(openapiSpecification);
}
