import bcrypt from 'bcryptjs';

import { NextRequest, NextResponse } from 'next/server';

import { ApiError, handleApiError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { updateUserSchema } from '@/lib/schemas/user';
import { UserRole } from '@/lib/types/user';

export async function PUT(
    req: NextRequest,
    { params }: { params: { userId: string } }
) {
    try {
        const { userId } = await params;
        const body = await req.json();

        // Валидация входных данных
        const validation = updateUserSchema.safeParse({
            id: userId,
            ...body,
        });

        if (!validation.success) {
            return handleApiError(validation.error, {
                status: 400,
                message: 'Ошибка валидации данных',
            });
        }

        const { username, newpassword, role, enabled } = validation.data;

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
            const updateData: {
                username?: string;
                role?: UserRole;
                password?: string;
                enabled?: boolean;
            } = {};

            if (username) updateData.username = username;
            if (role) updateData.role = role;
            if (newpassword) {
                updateData.password = await bcrypt.hash(newpassword, 12);
            }
            if (enabled) updateData.enabled = enabled;
            // Обновление пользователя с возвратом расширенных данных
            const user = await tx.user.update({
                where: { id: userId },
                data: updateData,
                select: {
                    id: true,
                    username: true,
                    role: true,
                    enabled: true,
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

export async function DELETE(
    req: NextRequest,
    { params }: { params: { userId: string } }
) {
    try {
        const { userId } = await params;

        // Использование транзакции для атомарности
        await prisma.$transaction(async tx => {
            // Проверка существования пользователя с агрегацией
            const userWithStats = await tx.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    username: true,
                    role: true,
                    _count: {
                        select: {
                            authoredDocuments: true,
                        },
                    },
                },
            });

            if (!userWithStats) {
                throw new ApiError('Пользователь не найден', 404);
            }

            // Проверка, что у пользователя нет документов
            if (userWithStats._count.authoredDocuments > 0) {
                throw new ApiError(
                    `Нельзя удалить пользователя "${userWithStats.username}", у которого есть ${userWithStats._count.authoredDocuments} документов`,
                    400
                );
            }

            // Удаление пользователя
            await tx.user.delete({
                where: { id: userId },
            });
        });

        return NextResponse.json({
            message: 'Пользователь успешно удален',
        });
    } catch (error) {
        return handleApiError(error, {
            message: 'Ошибка при удалении пользователя',
        });
    }
}
