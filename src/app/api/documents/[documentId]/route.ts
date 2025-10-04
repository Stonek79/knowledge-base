import { NextRequest, NextResponse } from 'next/server';

import { USER_ROLES } from '@/constants/user';
import { getCurrentUser } from '@/lib/actions/users';
import { handleApiError } from '@/lib/api/apiError';
import { updateDocumentSchema } from '@/lib/schemas/document';
import { DocumentCommandService } from '@/lib/services/documents/DocumentCommandService';
import { DocumentQueryService } from '@/lib/services/documents/DocumentQueryService';
import { UserService } from '@/lib/services/UserService';

/**
 * @swagger
 * /documents/{documentId}:
 *   get:
 *     summary: Get a single document by ID
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: The document ID
 *     responses:
 *       200:
 *         description: The document object
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Document not found
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { documentId: string } }
) {
    const { documentId } = await params;

    try {
        const user = await getCurrentUser(request);

        if (!user) {
            return NextResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const document = await DocumentQueryService.getDocumentById(
            documentId,
            user
        );

        if (!document) {
            return NextResponse.json(
                { message: 'Документ не найден' },
                { status: 404 }
            );
        }

        return NextResponse.json({ document });
    } catch (error) {
        return handleApiError(error);
    }
}

/**
 * @swagger
 * /documents/{documentId}:
 *   put:
 *     summary: Update a document
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: The document ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateDocumentSchema'
 *     responses:
 *       200:
 *         description: Document updated successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Document not found
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: { documentId: string } }
) {
    const { documentId } = await params;

    try {
        const user = await getCurrentUser(request);
        if (!user || user.role === USER_ROLES.GUEST) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const validation = updateDocumentSchema.safeParse(body);
        if (!validation.success) {
            return handleApiError(validation.error);
        }

        let authorId: string | undefined = undefined;

        if (validation.data.authorId) {
            authorId = validation.data.authorId;
        } else if (validation.data.username) {
            const author = await UserService.findOrCreateAuthor(
                validation.data.username
            );
            authorId = author.id;
        }

        const updatedDocument = await DocumentCommandService.updateDocument(
            documentId,
            validation.data,
            user,
            authorId
        );

        return NextResponse.json({
            message: 'Документ успешно обновлен',
            document: updatedDocument,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

/**
 * @swagger
 * /documents/{documentId}:
 *   delete:
 *     summary: Delete a document by ID
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: The document ID
 *     responses:
 *       200:
 *         description: Document deleted successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Document not found
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: { documentId: string } }
) {
    const { documentId } = await params;

    try {
        const user = await getCurrentUser(request);
        if (!user || user.role !== USER_ROLES.ADMIN) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        await DocumentCommandService.deleteDocument(documentId, user);

        return NextResponse.json({
            message: 'Документ успешно удален',
        });
    } catch (error) {
        return handleApiError(error);
    }
}
