// src/lib/zod.ts
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'

// This is the single entry point for Zod in the application.
// By extending it here, we ensure that every import of `z` gets the patched version.
extendZodWithOpenApi(z)

export { z }
