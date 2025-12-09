import bcrypt from 'bcryptjs'
import { type NextRequest, NextResponse } from 'next/server'
import { ACTION_TYPE, TARGET_TYPE } from '@/constants/audit-log'
import { USER_ROLES, USER_STATUSES } from '@/constants/user'
import { getCurrentUser } from '@/lib/actions/users'
import { handleApiError } from '@/lib/api/apiError'
import { ApiError } from '@/lib/api/errors'
import { auditLogService } from '@/lib/container'
import { prisma } from '@/lib/prisma'
import { updateUserSchema } from '@/lib/schemas/user'
import type { UpdatedDetails } from '@/lib/types/audit-log'
import type { UpdateUserData } from '@/lib/types/user'

/**
 * @swagger
 * /users/{userId}:
 *   put:
 *     summary: Update a user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserSchema'
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: User not found
 *       409:
 *         description: Username already exists
 */
export async function PUT(
    req: NextRequest,
    { params }: { params: { userId: string } }
) {
    try {
        const { userId } = await params
        const body = await req.json()
        const actor = await getCurrentUser(req)

        if (!actor) {
            return handleApiError(new ApiError('Unauthorized', 401), {
                status: 401,
                message: 'Unauthorized',
            })
        }

        if (actor.id !== userId && actor.role !== USER_ROLES.ADMIN) {
            return handleApiError(new ApiError('Forbidden', 403), {
                status: 403,
                message: 'Forbidden',
            })
        }

        // Валидация входных данных
        const validation = updateUserSchema.safeParse(body)

        if (!validation.success) {
            return handleApiError(validation.error, {
                status: 400,
                message: 'Ошибка валидации данных',
            })
        }

        // Проверка существования пользователя
        const existingUser = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                role: true,
                enabled: true,
                status: true,
            },
        })

        if (!existingUser) {
            throw new ApiError('Пользователь не найден', 404)
        }

        const { username, newPassword, role, enabled, status } = validation.data

        // Использование транзакции для атомарности
        const result = await prisma.$transaction(async tx => {
            // Проверка уникальности username (если изменяется)
            if (username && username !== existingUser.username) {
                const userWithSameName = await tx.user.findUnique({
                    where: { username },
                    select: { id: true },
                })

                if (userWithSameName) {
                    throw new ApiError(
                        'Пользователь с таким именем уже существует',
                        409
                    )
                }
            }

            // Подготовка данных для обновления
            const updateData: Partial<UpdateUserData> & { password?: string } =
                {}

            if (username) updateData.username = username
            if (role) updateData.role = role
            if (status) updateData.status = status
            if (newPassword) {
                updateData.password = await bcrypt.hash(newPassword, 12)
            }
            if (typeof enabled === 'boolean') updateData.enabled = enabled

            // Обновление пользователя с возвратом расширенных данных
            const user = await tx.user.update({
                where: { id: userId },
                data: updateData,
                select: {
                    id: true,
                    username: true,
                    role: true,
                    enabled: true,
                    status: true,
                    createdAt: true,
                    _count: {
                        select: {
                            authoredDocuments: true,
                        },
                    },
                },
            })

            // Формируем массив изменений для лога
            const changes: UpdatedDetails[] = []

            if (
                updateData.username &&
                updateData.username !== existingUser.username
            ) {
                changes.push({
                    field: 'username',
                    oldValue: existingUser.username,
                    newValue: updateData.username,
                })
            }

            if (updateData.role && updateData.role !== existingUser.role) {
                changes.push({
                    field: 'role',
                    oldValue: existingUser.role,
                    newValue: updateData.role,
                })
            }

            if (updateData.password) {
                changes.push({
                    field: 'password',
                    oldValue: '[скрыто]',
                    newValue: '[скрыто]',
                })
            }

            if (
                updateData.status &&
                existingUser.status &&
                updateData.status !== existingUser.status
            ) {
                changes.push({
                    field: 'status',
                    oldValue: existingUser.status,
                    newValue: updateData.status,
                })
            }

            if (
                typeof updateData.enabled === 'boolean' &&
                updateData.enabled !== existingUser.enabled
            ) {
                changes.push({
                    field: 'enabled',
                    oldValue: existingUser.enabled,
                    newValue: updateData.enabled,
                })
            }

            if (changes.length > 0) {
                await auditLogService.log(
                    {
                        userId: actor.id,
                        action: ACTION_TYPE.USER_UPDATED,
                        targetId: userId,
                        targetType: TARGET_TYPE.USER,
                        details: { changes },
                    },
                    tx
                )
            }
            return user
        })

        return NextResponse.json({
            message: 'Пользователь успешно обновлен',
            user: result,
        })
    } catch (error) {
        return handleApiError(error, {
            message: 'Ошибка при обновлении пользователя',
        })
    }
}

/**
 * @swagger
 * /users/{userId}:
 *   delete:
 *     summary: Delete or deactivate a user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID
 *     responses:
 *       200:
 *         description: User deleted or deactivated successfully
 *       404:
 *         description: User not found
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: { userId: string } }
) {
    try {
        const { userId } = await params
        const actor = await getCurrentUser(req)

        if (!actor) {
            return handleApiError(new ApiError('Unauthorized', 401), {
                status: 401,
                message: 'Unauthorized',
            })
        }

        if (actor.role !== USER_ROLES.ADMIN) {
            return handleApiError(new ApiError('Forbidden', 403), {
                status: 403,
                message: 'Forbidden',
            })
        }

        if (actor.id === userId) {
            return handleApiError(new ApiError('Forbidden', 400), {
                status: 400,
                message: 'Администратор не может удалить сам себя',
            })
        }

        const result = await prisma.$transaction(async tx => {
            const userWithStats = await tx.user.findUnique({
                where: { id: userId },
                select: {
                    username: true,
                    status: true,
                    enabled: true,
                    _count: {
                        select: {
                            authoredDocuments: true,
                            createdDocuments: true,
                        },
                    },
                },
            })

            if (!userWithStats) {
                throw new ApiError('Пользователь не найден', 404)
            }

            const hasAuthoredDocs = userWithStats._count.authoredDocuments > 0
            const hasCreatedDocs = userWithStats._count.createdDocuments > 0

            if (hasAuthoredDocs || hasCreatedDocs) {
                await tx.user.update({
                    where: { id: userId },
                    data: {
                        enabled: false,
                        status: USER_STATUSES.PLACEHOLDER,
                    },
                })

                await auditLogService.log(
                    {
                        userId: actor.id,
                        action: ACTION_TYPE.USER_UPDATED,
                        targetId: userId,
                        targetType: TARGET_TYPE.USER,
                        details: {
                            changes: [
                                {
                                    field: 'enabled',
                                    oldValue: userWithStats.enabled,
                                    newValue: false,
                                },
                                {
                                    field: 'status',
                                    oldValue: userWithStats.status,
                                    newValue: USER_STATUSES.PLACEHOLDER,
                                },
                            ],
                        },
                    },
                    tx
                )
                return {
                    action: 'deactivated',
                    username: userWithStats.username,
                    message: `Пользователь "${userWithStats.username}" не может быть удален, так как связан с документами. Учетная запись была деактивирована.`,
                }
            } else {
                await auditLogService.log(
                    {
                        userId: actor.id,
                        action: ACTION_TYPE.USER_DELETED,
                        targetId: userId,
                        targetType: TARGET_TYPE.USER,
                        details: {
                            deletedUserId: userId,
                            deletedUsername: userWithStats.username,
                        },
                    },
                    tx
                )
                await tx.user.delete({ where: { id: userId } })

                return {
                    action: 'deleted',
                    message: 'Пользователь успешно удален',
                }
            }
        })

        return NextResponse.json(result)
    } catch (error) {
        return handleApiError(error, {
            message: 'Ошибка при удалении пользователя',
        })
    }
}
