import {
    createUserSchema,
    updateUserSchema,
    userResponseSchema,
    usersListSchema,
} from '@/lib/schemas/user'
import { z } from '@/lib/zod'
import { registry } from './registry'

export const registerUserPaths = () => {
    const UserDeletionResponseSchema = registry.register(
        'UserDeletionResponse',
        z.object({
            action: z.enum(['deactivated', 'deleted']),
            message: z.string(),
            username: z.string().optional(),
        })
    )

    registry.register('CreateUser', createUserSchema)
    registry.register('UpdateUser', updateUserSchema)
    registry.register('UserResponse', userResponseSchema)

    registry.registerPath({
        method: 'get',
        path: '/users',
        tags: ['Users'],
        summary: 'Get a list of users',
        request: {
            query: usersListSchema,
        },
        responses: {
            '200': {
                description: 'A list of users with pagination',
                content: {
                    'application/json': {
                        schema: z.object({
                            users: userResponseSchema.array(),
                            pagination: z.object({
                                page: z.number(),
                                limit: z.number(),
                                total: z.number(),
                                totalPages: z.number(),
                                hasNext: z.boolean(),
                                hasPrev: z.boolean(),
                            }),
                            stats: z.object({
                                totalUsers: z.number(),
                                oldestUser: z.date().nullable(),
                                newestUser: z.date().nullable(),
                            }),
                        }),
                    },
                },
            },
        },
    })

    registry.registerPath({
        method: 'post',
        path: '/users',
        tags: ['Users'],
        summary: 'Create a new user',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: createUserSchema,
                    },
                },
            },
        },
        responses: {
            '201': {
                description: 'User created successfully',
                content: {
                    'application/json': {
                        schema: z.object({
                            message: z.string(),
                            user: userResponseSchema,
                        }),
                    },
                },
            },
            '400': { description: 'Validation error' },
            '409': { description: 'User with this name already exists' },
        },
    })

    registry.registerPath({
        method: 'put',
        path: '/users/{userId}',
        tags: ['Users'],
        summary: 'Update a user',
        request: {
            params: z.object({
                userId: z.uuid({ message: 'Invalid user ID' }),
            }),
            body: {
                content: {
                    'application/json': {
                        schema: updateUserSchema,
                    },
                },
            },
        },
        responses: {
            '200': {
                description: 'User updated successfully',
                content: {
                    'application/json': {
                        schema: z.object({
                            message: z.string(),
                            user: userResponseSchema,
                        }),
                    },
                },
            },
            '400': { description: 'Validation error' },
            '404': { description: 'User not found' },
            '409': { description: 'Username already exists' },
        },
    })

    registry.registerPath({
        method: 'delete',
        path: '/users/{userId}',
        tags: ['Users'],
        summary: 'Delete or deactivate a user',
        request: {
            params: z.object({
                userId: z.uuid({ message: 'Invalid user ID' }),
            }),
        },
        responses: {
            '200': {
                description: 'User deleted or deactivated successfully',
                content: {
                    'application/json': {
                        schema: UserDeletionResponseSchema,
                    },
                },
            },
            '400': { description: 'Cannot delete self' },
            '404': { description: 'User not found' },
        },
    })
}
