import {
    changePasswordSchema,
    profileSchema,
    profileUpdateApiScheme,
} from '@/lib/schemas/profile'
import { z } from '@/lib/zod'
import { registry } from './registry'

export const registerProfilePaths = () => {
    // --- Register Schemas ---
    registry.register('Profile', profileSchema)
    registry.register('ProfileUpdate', profileUpdateApiScheme)
    registry.register('ChangePassword', changePasswordSchema)

    // --- Register Paths ---
    registry.registerPath({
        method: 'get',
        path: '/profile',
        tags: ['Profile'],
        summary: "Get current user's profile",
        responses: {
            '200': {
                description: 'User profile data',
                content: { 'application/json': { schema: profileSchema } },
            },
            '401': { description: 'Unauthorized' },
        },
    })

    registry.registerPath({
        method: 'put',
        path: '/profile',
        tags: ['Profile'],
        summary: "Update current user's profile",
        request: {
            body: {
                content: {
                    'application/json': { schema: profileUpdateApiScheme },
                },
            },
        },
        responses: {
            '200': {
                description: 'Profile updated successfully',
                content: { 'application/json': { schema: profileSchema } },
            },
            '400': { description: 'Validation error' },
            '401': { description: 'Unauthorized' },
        },
    })

    registry.registerPath({
        method: 'post',
        path: '/profile/change-password',
        tags: ['Profile'],
        summary: "Change current user's password",
        request: {
            body: {
                content: {
                    'application/json': { schema: changePasswordSchema },
                },
            },
        },
        responses: {
            '200': {
                description: 'Password changed successfully',
                content: {
                    'application/json': {
                        schema: z.object({ message: z.string() }),
                    },
                },
            },
            '400': { description: 'Validation error' },
            '401': { description: 'Unauthorized' },
        },
    })
}
