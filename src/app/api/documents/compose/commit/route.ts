import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/actions/users';
import { handleApiError } from '@/lib/api/apiError';
import { composeChangeSetSchema } from '@/lib/schemas/compose';
import { DocumentComposeService } from '@/lib/services/documents/DocumentComposeService';
import { UserService } from '@/lib/services/UserService';

/**
 * @swagger
 * /documents/compose/commit:
 *   post:
 *     summary: Atomically creates a new document with attachments
 *     tags: [Documents]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ComposeChangeSet'
 *     responses:
 *       200:
 *         description: Document created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser(request);
        if (!user)
            return NextResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            );

        const body = await request.json();
        const validation = composeChangeSetSchema.safeParse(body);

        if (!validation.success) {
            return handleApiError(validation.error);
        }

        let authorId: string;
        const metadata = validation.data.metadata;

        if (metadata?.authorId) {
            authorId = metadata.authorId;
        } else if (metadata?.username) {
            // Если пришло имя, идем в UserService
            const author = await UserService.findOrCreateAuthor(
                metadata.username
            );
            authorId = author.id;
        } else {
            // Если не пришло ни то, ни другое - это ошибка
            authorId = user.id;
        }

        const result = await DocumentComposeService.composeCreateDocument(
            validation.data,
            user,
            authorId
        );
        return NextResponse.json({ status: 'ok', ...result });
    } catch (error) {
        return handleApiError(error);
    }
}
