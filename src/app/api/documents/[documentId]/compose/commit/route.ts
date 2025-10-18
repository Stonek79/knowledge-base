import { type NextRequest, NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/actions/users'
import { handleApiError } from '@/lib/api/apiError'
import { composeChangeSetSchema } from '@/lib/schemas/compose'
import { DocumentComposeService } from '@/lib/services/documents/DocumentComposeService'
import { UserService } from '@/lib/services/UserService'

/**
 * @swagger
 * /documents/{documentId}/compose/commit:
 *   post:
 *     summary: Atomically updates an existing document with attachments
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: The document ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ComposeChangeSet'
 *     responses:
 *       200:
 *         description: Document updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Document not found
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { documentId: string } }
) {
    try {
        const user = await getCurrentUser(request)
        if (!user)
            return NextResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            )

        const { documentId } = await params
        const body = await request.json()
        const validation = composeChangeSetSchema.safeParse(body)

        if (!validation.success) {
            return handleApiError(validation.error)
        }

        let authorId: string | undefined
        const metadata = validation.data.metadata

        if (metadata?.authorId) {
            authorId = metadata.authorId
        } else if (metadata?.username) {
            const author = await UserService.findOrCreateAuthor(
                metadata.username
            )
            authorId = author.id
        }

        const result = await DocumentComposeService.composeUpdateDocument(
            documentId,
            validation.data,
            user,
            authorId
        )

        return NextResponse.json({ status: 'ok', ...result })
    } catch (error) {
        console.warn(
            '[compose/update] rolling back promoted files due to error'
        )

        return handleApiError(error)
    }
}
