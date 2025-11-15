import { type NextRequest, NextResponse } from 'next/server'
import { ACTION_TYPE, TARGET_TYPE } from '@/constants/audit-log'
import { USER_ROLES } from '@/constants/user'
import { getCurrentUser } from '@/lib/actions/users'
import { handleApiError } from '@/lib/api/apiError'
import { prisma } from '@/lib/prisma'
import { createCategorySchema } from '@/lib/schemas/document'
import { auditLogService } from '@/lib/services/AuditLogService'

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: A list of all categories
 */
export async function GET() {
    try {
        const categories = await prisma.category.findMany({
            orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
            include: {
                _count: {
                    select: {
                        documents: true,
                    },
                },
                documents: true,
            },
        })

        return NextResponse.json({ categories })
    } catch (error) {
        return handleApiError(error)
    }
}

/**
 * @swagger
 * /categories:
 *   post:
 *     summary: Create a new category
 *     tags: [Categories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCategorySchema'
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Category with this name already exists
 *       403:
 *         description: Forbidden
 */
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser(request)
        if (!user || user.role !== USER_ROLES.ADMIN) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const validation = createCategorySchema.safeParse(body)

        if (!validation.success) {
            return handleApiError(validation.error)
        }

        const existingCategory = await prisma.category.findFirst({
            where: { name: validation.data.name },
        })

        if (existingCategory) {
            return NextResponse.json(
                { message: 'Категория с таким названием уже существует' },
                { status: 400 }
            )
        }

        const category = await prisma.$transaction(async tx => {
            const newCategory = await tx.category.create({
                data: validation.data,
            })

            await auditLogService.log(
                {
                    userId: user.id,
                    action: ACTION_TYPE.CATEGORY_CREATED,
                    targetId: newCategory.id,
                    targetType: TARGET_TYPE.CATEGORY,
                    details: {
                        categoryId: newCategory.id,
                        categoryName: newCategory.name,
                    },
                },
                tx
            )

            return newCategory
        })

        return NextResponse.json(
            {
                message: 'Категория успешно создана',
                category,
            },
            { status: 201 }
        )
    } catch (error) {
        return handleApiError(error)
    }
}
