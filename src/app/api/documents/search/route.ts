import { NextRequest, NextResponse } from 'next/server';

import { SearchEngine } from '@/constants/document';
import { getCurrentUser } from '@/lib/actions/users';
import { handleApiError } from '@/lib/api/apiError';
import { prisma } from '@/lib/prisma';
import { searchSchema } from '@/lib/schemas/document';
import { SearchFactory } from '@/lib/search/factory';
import { SearchFilters } from '@/lib/types/document';

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser(request);
        if (!user) {
            return NextResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);

        const validation = searchSchema.safeParse({
            q: searchParams.get('q'),
            categoryIds: searchParams.get('categoryIds'),
            authorId: searchParams.get('authorId'),
            dateFrom: searchParams.get('dateFrom'),
            dateTo: searchParams.get('dateTo'),
            sortBy: searchParams.get('sortBy'),
            sortOrder: searchParams.get('sortOrder'),
        });

        if (!validation.success) {
            return handleApiError(validation.error);
        }

        const {
            q,
            categoryIds,
            authorId,
            dateFrom,
            dateTo,
            sortBy,
            sortOrder,
        } = validation.data;

        // Создаем поисковый движок
        const searchEngine =
            (process.env
                .SEARCH_ENGINE as (typeof SearchEngine)[keyof typeof SearchEngine]) ||
            SearchEngine.FLEXSEARCH;

        const indexer = SearchFactory.createIndexer(searchEngine);

        // Подготавливаем фильтры
        const filters: SearchFilters = {
            ...(categoryIds && { categoryIds: categoryIds.split(',') }),
            ...(authorId && { authorId }),
            ...(dateFrom && { dateFrom: new Date(dateFrom) }),
            ...(dateTo && { dateTo: new Date(dateTo) }),
            ...(sortBy && { sortBy }),
            ...(sortOrder && { sortOrder }),
        };

        if ((indexer as any).isEmpty()) {
            const documents = await prisma.document.findMany({
                include: {
                    author: {
                        select: { id: true, username: true, role: true },
                    },
                    categories: { include: { category: true } },
                },
            });

            await indexer.reindexAll(documents);
        }

        // Выполняем поиск
        let results;
        if (!q || q.trim() === '') {
            // Пустой поиск - возвращаем все документы с фильтрами
            results = await indexer.search('', filters);
        } else {
            // Поиск по тексту + фильтры
            results = await indexer.search(q, filters);
        }

        return Response.json({ results });
    } catch (error) {
        return handleApiError(error);
    }
}
