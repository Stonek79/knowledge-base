import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

import { USER_STATUSES } from '@/constants/user';
import { ApiError, handleApiError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { updateUserSchema } from '@/lib/schemas/user';
import { UpdateUserData } from '@/lib/types/user';

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
        const { userId } = await params;
        const body = await req.json();

        // Валидация входных данных
        const validation = updateUserSchema.safeParse(body);

        if (!validation.success) {
            return handleApiError(validation.error, {
                status: 400,
                message: 'Ошибка валидации данных',
            });
        }

        const { username, newPassword, role, enabled, status } =
            validation.data;

        // Использование транзакции для атомарности
        const result = await prisma.$transaction(async tx => {
            // Проверка существования пользователя
            const existingUser = await tx.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    username: true,
                    role: true,
                    enabled: true,
                },
            });

            if (!existingUser) {
                throw new ApiError('Пользователь не найден', 404);
            }

            // Проверка уникальности username (если изменяется)
            if (username && username !== existingUser.username) {
                const userWithSameName = await tx.user.findUnique({
                    where: { username },
                    select: { id: true },
                });

                if (userWithSameName) {
                    throw new ApiError(
                        'Пользователь с таким именем уже существует',
                        409
                    );
                }
            }

            // Подготовка данных для обновления
            const updateData: Partial<UpdateUserData> & { password?: string } =
                {};

            if (username) updateData.username = username;
            if (role) updateData.role = role;
            if (status) updateData.status = status;
            if (newPassword) {
                updateData.password = await bcrypt.hash(newPassword, 12);
            }
            if (typeof enabled === 'boolean') updateData.enabled = enabled;

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
            });

            return user;
        });

        return NextResponse.json({
            message: 'Пользователь успешно обновлен',
            user: result,
        });
    } catch (error) {
        return handleApiError(error, {
            message: 'Ошибка при обновлении пользователя',
        });
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
        const { userId } = await params;

        const result = await prisma.$transaction(async tx => {
            const userWithStats = await tx.user.findUnique({
                where: { id: userId },
                select: {
                    username: true,
                    _count: {
                        select: {
                            authoredDocuments: true,
                            createdDocuments: true,
                        },
                    },
                },
            });

            if (!userWithStats) {
                throw new ApiError('Пользователь не найден', 404);
            }

            const hasAuthoredDocs = userWithStats._count.authoredDocuments > 0;
            const hasCreatedDocs = userWithStats._count.createdDocuments > 0;

            if (hasAuthoredDocs || hasCreatedDocs) {
                await tx.user.update({
                    where: { id: userId },
                    data: {
                        enabled: false,
                        status: USER_STATUSES.PLACEHOLDER,
                    },
                });
                return {
                    action: 'deactivated',
                    username: userWithStats.username,
                    message: `Пользователь "${userWithStats.username}" не может быть удален, так как связан с документами. Учетная запись была деактивирована.`,
                };
            } else {
                await tx.user.delete({ where: { id: userId } });
                return {
                    action: 'deleted',
                    message: 'Пользователь успешно удален',
                };
            }
        });

        return NextResponse.json(result);
    } catch (error) {
        return handleApiError(error, {
            message: 'Ошибка при удалении пользователя',
        });
    }
}
