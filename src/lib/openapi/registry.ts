import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'

// We create and export a single registry instance to be used across the application.
export const registry = new OpenAPIRegistry()
