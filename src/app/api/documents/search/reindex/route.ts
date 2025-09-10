import { NextRequest, NextResponse } from 'next/server';

import { SearchEngine } from '@/constants/document';
import { USER_ROLES } from '@/constants/user';
import { getCurrentUser } from '@/lib/actions/users';
import { handleApiError } from '@/lib/api/apiError';
import { prisma } from '@/lib/prisma';
import { SearchFactory } from '@/lib/search/factory';

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser(request);
        if (!user || user.role !== USER_ROLES.ADMIN) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const documents = await prisma.document.findMany({
            include: {
                author: { select: { id: true, username: true, role: true } },
                categories: { include: { category: true } },
            },
        });

        const engine =
            (process.env
                .SEARCH_ENGINE as (typeof SearchEngine)[keyof typeof SearchEngine]) ||
            SearchEngine.FLEXSEARCH;
        const indexer = SearchFactory.createIndexer(engine);
        await indexer.reindexAll(documents);

        return NextResponse.json({ message: 'Индексация завершена' });
    } catch (error) {
        return handleApiError(error);
    }
}
