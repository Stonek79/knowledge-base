import { loginSchema } from '@/lib/schemas/auth'
import { userResponseSchema } from '@/lib/schemas/user'
import { z } from '@/lib/zod'
import { registry } from './registry'

// This function now uses the imported registry
export const registerAuthPaths = () => {
    registry.register(
        'Login',
        loginSchema.meta({ description: 'Schema for user login' })
    )
    registry.register(
        'User',
        userResponseSchema.meta({ description: 'Schema for user response' })
    )

    registry.registerPath({
        method: 'post',
        path: '/auth/login',
        tags: ['Auth'],
        summary: 'Log in a user',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: loginSchema,
                    },
                },
            },
        },
        responses: {
            '200': {
                description: 'Login successful',
                content: {
                    'application/json': {
                        schema: z.object({
                            message: z.string(),
                            user: userResponseSchema,
                        }),
                    },
                },
            },
            '400': {
                description: 'Validation Error',
            },
            '401': {
                description: 'Invalid credentials',
            },
        },
    })
}
