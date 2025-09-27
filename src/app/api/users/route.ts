import bcrypt from 'bcryptjs';

import { NextRequest, NextResponse } from 'next/server';

import { USER_ROLES } from '@/constants/user';
import { getCurrentUser } from '@/lib/actions/users';
import { ApiError, handleApiError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { createUserSchema, usersListSchema } from '@/lib/schemas/user';
import type {
    CreateUserData,
    CreateUserResponse,
    UserWhereInput,
    UsersListResponse,
} from '@/lib/types/user';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || '';
        const sortBy = searchParams.get('sortBy') || 'createdAt';
        const sortOrder = searchParams.get('sortOrder') || 'desc';

        const user = await getCurrentUser(req);

        // Валидация параметров
        const validation = usersListSchema.safeParse({
            page,
            limit,
            search,
            sortBy,
            sortOrder,
        });

        if (!validation.success) {
            return handleApiError(validation.error, {
                status: 400,
                message: 'Ошибка валидации параметров',
            });
        }

        // Построение условий поиска с правильной типизацией
        const whereConditions: UserWhereInput[] = [];

        if (user && user?.role !== USER_ROLES.ADMIN) {
            whereConditions.push({ role: { not: USER_ROLES.ADMIN } });
        }

        if (search) {
            // Используем raw query для регистронезависимого поиска в SQLite

            whereConditions.push({
                OR: [
                    {
                        username: {
                            contains: search,
                        },
                    },
                    {
                        id: {
                            contains: search,
                        },
                    },
                ],
            });
        }

        const where: UserWhereInput =
            whereConditions.length > 0 ? { AND: whereConditions } : {};

        // Параллельные запросы с использованием Promise.all
        const [users, total, stats] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    username: true,
                    role: true,
                    enabled: true,
                    confidentialAccess: true,
                    createdAt: true,
                    _count: {
                        select: {
                            documents: true,
                        },
                    },
                    documents: {
                        take: 1,
                        orderBy: { createdAt: 'desc' },
                        select: {
                            id: true,
                            title: true,
                            createdAt: true,
                        },
                    },
                },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: {
                    [sortBy]: sortOrder,
                },
            }),

            prisma.user.count({ where }),

            prisma.user.aggregate({
                where,
                _count: {
                    id: true,
                },
                _min: {
                    createdAt: true,
                },
                _max: {
                    createdAt: true,
                },
            }),
        ]);

        const totalPages = Math.ceil(total / limit);

        const response: UsersListResponse = {
            users,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
            stats: {
                totalUsers: stats._count?.id || 0,
                oldestUser: stats._min?.createdAt || null,
                newestUser: stats._max?.createdAt || null,
            },
        };

        return NextResponse.json(response);
    } catch (error) {
        return handleApiError(error, {
            message: 'Ошибка при получении списка пользователей',
        });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const validation = createUserSchema.safeParse(body);

        if (!validation.success) {
            return handleApiError(validation.error, {
                status: 400,
                message: 'Ошибка валидации данных',
            });
        }

        const { username, password, role, enabled }: CreateUserData =
            validation.data;

        const result = await prisma.$transaction(async tx => {
            const existingUser = await tx.user.findUnique({
                where: { username },
                select: { id: true },
            });

            if (existingUser) {
                throw new ApiError(
                    'Пользователь с таким именем уже существует',
                    409
                );
            }

            const hashedPassword = await bcrypt.hash(password, 12);

            const user = await tx.user.create({
                data: {
                    username,
                    password: hashedPassword,
                    role,
                    enabled,
                },
                select: {
                    id: true,
                    username: true,
                    role: true,
                    enabled, 
                    confidentialAccess: true,
                    createdAt: true,
                    _count: {
                        select: {
                            documents: true,
                        },
                    },
                },
            });

            return user;
        });

        const response: CreateUserResponse = {
            message: 'Пользователь успешно создан',
            user: result,
        };

        return NextResponse.json(response, { status: 201 });
    } catch (error) {
        return handleApiError(error, {
            message: 'Ошибка при создании пользователя',
        });
    }
}
