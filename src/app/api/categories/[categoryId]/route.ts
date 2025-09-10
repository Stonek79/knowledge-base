import { NextRequest, NextResponse } from 'next/server';

import { USER_ROLES } from '@/constants/user';
import { getCurrentUser } from '@/lib/actions/users';
import { handleApiError } from '@/lib/api/apiError';
import { prisma } from '@/lib/prisma';
import { updateCategorySchema } from '@/lib/schemas/document';

export async function GET(
    request: NextRequest,
    { params }: { params: { categoryId: string } }
) {
    try {
        const category = await prisma.category.findUnique({
            where: { id: params.categoryId },
            include: {
                _count: { select: { documents: true } },
                documents: true,
            },
        });

        if (!category) {
            return NextResponse.json(
                { message: 'Категория не найдена' },
                { status: 404 }
            );
        }

        return NextResponse.json({ category });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { categoryId: string } }
) {
    try {
        const user = await getCurrentUser(request);
        if (!user || user.role !== USER_ROLES.ADMIN) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const validation = updateCategorySchema.safeParse(body);

        if (!validation.success) {
            return handleApiError(validation.error);
        }

        const category = await prisma.category.update({
            where: { id: params.categoryId },
            data: validation.data,
        });

        return NextResponse.json({
            message: 'Категория успешно обновлена',
            category,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { categoryId: string } }
) {
    try {
        const user = await getCurrentUser(request);
        if (!user || user.role !== USER_ROLES.ADMIN) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const documentsCount = await prisma.documentCategory.count({
            where: { categoryId: params.categoryId },
        });

        if (documentsCount > 0) {
            return NextResponse.json(
                {
                    message: `Нельзя удалить категорию с ${documentsCount} документами. Сначала переместите или удалите документы.`,
                },
                { status: 400 }
            );
        }

        const category = await prisma.category.findUnique({
            where: { id: params.categoryId },
            select: { isDefault: true },
        });

        if (category?.isDefault) {
            return NextResponse.json(
                { message: 'Нельзя удалить системную категорию по умолчанию' },
                { status: 400 }
            );
        }

        await prisma.category.delete({
            where: { id: params.categoryId },
        });

        return NextResponse.json({ message: 'Категория успешно удалена' });
    } catch (error) {
        return handleApiError(error);
    }
}
