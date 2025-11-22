import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi'
import type { OpenAPIObject } from 'openapi3-ts/oas31'
// Import all registration functions
import { registerAuthPaths } from '@/lib/openapi/auth'
import { registerCategoryPaths } from '@/lib/openapi/categories'
import { registerDocumentPaths } from '@/lib/openapi/documents'
import { registerProfilePaths } from '@/lib/openapi/profile'
import { registry } from '@/lib/openapi/registry'
// Shared schemas that are used across different modules
import {
    DocumentWithAuthorSchema,
    PaginationSchema,
} from '@/lib/openapi/schemas'
import { registerUserPaths } from '@/lib/openapi/users'

class OpenAPIService {
    private static instance: OpenAPIService
    private spec: OpenAPIObject | null = null

    // Singleton pattern to ensure this only runs once.
    public static getInstance(): OpenAPIService {
        if (!OpenAPIService.instance) {
            OpenAPIService.instance = new OpenAPIService()
        }
        return OpenAPIService.instance
    }

    public generateSpec(): OpenAPIObject {
        // Only generate once
        if (this.spec) {
            return this.spec
        }

        // Register shared schemas
        registry.register('DocumentWithAuthor', DocumentWithAuthorSchema)
        registry.register('Pagination', PaginationSchema)

        // Register all paths from the different modules
        registerAuthPaths()
        registerUserPaths()
        registerDocumentPaths()
        registerCategoryPaths()
        registerProfilePaths()

        // Register security scheme
        registry.registerComponent('securitySchemes', 'bearerAuth', {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
        })

        const generator = new OpenApiGeneratorV31(registry.definitions)

        const document = generator.generateDocument({
            openapi: '3.1.0',
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
            security: [
                {
                    bearerAuth: [],
                },
            ],
        })

        this.spec = document
        return document
    }
}

export const openApiService = OpenAPIService.getInstance()
