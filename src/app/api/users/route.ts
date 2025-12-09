import bcrypt from 'bcryptjs'
import { type NextRequest, NextResponse } from 'next/server'
import { ACTION_TYPE, TARGET_TYPE } from '@/constants/audit-log'
import { USER_ROLES, USER_STATUSES } from '@/constants/user'
import { getCurrentUser } from '@/lib/actions/users'
import { handleApiError } from '@/lib/api/apiError'
import { ApiError } from '@/lib/api/errors'
import { auditLogService } from '@/lib/container'
import { prisma } from '@/lib/prisma'
import { createUserSchema, usersListSchema } from '@/lib/schemas/user'
import type {
    CreateUserResponse,
    UsersListResponse,
    UserWhereInput,
} from '@/lib/types/user'

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get a list of users
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: The page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: The number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search query for username or id
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by user status (ACTIVE, PLACEHOLDER)
 *     responses:
 *       200:
 *         description: A list of users
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UsersListResponse'
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const page = parseInt(searchParams.get('page') || '1', 10)
        const limit = parseInt(searchParams.get('limit') || '10', 10)
        const search = searchParams.get('search') || ''
        const sortBy = searchParams.get('sortBy') || 'createdAt'
        const sortOrder = searchParams.get('sortOrder') || 'desc'
        const status = searchParams.get('status') || ''

        const user = await getCurrentUser(req)

        // Валидация параметров
        const validation = usersListSchema.safeParse({
            page,
            limit,
            search,
            sortBy,
            sortOrder,
            status,
        })

        if (!validation.success) {
            return handleApiError(validation.error, {
                status: 400,
                message: 'Ошибка валидации параметров',
            })
        }

        // Построение условий поиска с правильной типизацией
        const whereConditions: UserWhereInput[] = []

        if (user && user?.role !== USER_ROLES.ADMIN) {
            whereConditions.push({ role: { not: USER_ROLES.ADMIN } })
        }

        if (search) {
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
            })
        }

        // Добавляем фильтр по статусу, если он валидный
        if (status && USER_STATUSES[status]) {
            whereConditions.push({ status: USER_STATUSES[status] })
        }

        const where: UserWhereInput =
            whereConditions.length > 0 ? { AND: whereConditions } : {}

        // Параллельные запросы с использованием Promise.all
        const [users, total, stats] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    username: true,
                    role: true,
                    status: true,
                    enabled: true,
                    confidentialAccess: true,
                    createdAt: true,
                    _count: {
                        select: {
                            authoredDocuments: true,
                        },
                    },
                    authoredDocuments: {
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
        ])

        const totalPages = Math.ceil(total / limit)

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
        }

        return NextResponse.json(response)
    } catch (error) {
        return handleApiError(error, {
            message: 'Ошибка при получении списка пользователей',
        })
    }
}

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserSchema'
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateUserResponse'
 *       400:
 *         description: Validation error
 *       409:
 *         description: User with this name already exists
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const actor = await getCurrentUser(req)

        if (!actor) {
            return handleApiError(new ApiError('Unauthorized', 401), {
                status: 401,
                message: 'Unauthorized',
            })
        }

        const validation = createUserSchema.safeParse(body)

        if (!validation.success) {
            return handleApiError(validation.error, {
                status: 400,
                message: 'Ошибка валидации данных',
            })
        }

        const { username, password, role, enabled, status } = validation.data

        const result = await prisma.$transaction(async tx => {
            const existingUser = await tx.user.findUnique({
                where: { username },
                select: { id: true },
            })

            if (existingUser) {
                throw new ApiError(
                    'Пользователь с таким именем уже существует',
                    409
                )
            }

            const hashedPassword = password
                ? await bcrypt.hash(password, 12)
                : null

            const user = await tx.user.create({
                data: {
                    username,
                    password: hashedPassword ?? null,
                    role,
                    enabled,
                    status,
                    profile: {
                        create: {
                            fullName: username,
                        },
                    },
                },
                select: {
                    id: true,
                    username: true,
                    role: true,
                    enabled: true,
                    status: true,
                    confidentialAccess: true,
                    createdAt: true,
                    _count: {
                        select: {
                            authoredDocuments: true,
                        },
                    },
                },
            })

            await auditLogService.log(
                {
                    userId: actor.id,
                    targetId: result.id,
                    action: ACTION_TYPE.USER_CREATED,
                    targetType: TARGET_TYPE.USER,
                    details: {
                        createdUserId: user.id,
                        createdUsername: user.username,
                    },
                },
                tx
            )

            return user
        })

        const response: CreateUserResponse = {
            message: 'Пользователь успешно создан',
            user: result,
        }

        return NextResponse.json(response, { status: 201 })
    } catch (error) {
        return handleApiError(error, {
            message: 'Ошибка при создании пользователя',
        })
    }
}
