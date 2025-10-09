import { NextRequest, NextResponse } from 'next/server';

import { USER_ROLES } from '@/constants/user';
import { getCurrentUser } from '@/lib/actions/users';
import { handleApiError } from '@/lib/api/apiError';
import { DocumentCommandService } from '@/lib/services/documents/DocumentCommandService';

export async function POST(
    request: NextRequest,
    { params }: { params: { documentId: string } }
) {
    const { documentId } = params;

    try {
        const user = await getCurrentUser(request);

        // Только администраторы могут восстанавливать документы
        if (user?.role !== USER_ROLES.ADMIN) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        await DocumentCommandService.restoreDocument(documentId);

        return NextResponse.json({
            message: 'Документ успешно восстановлен',
        });
    } catch (error) {
        return handleApiError(error);
    }
}
