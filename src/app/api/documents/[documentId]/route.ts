import { type NextRequest, NextResponse } from 'next/server'

import { USER_ROLES } from '@/constants/user'
import { getCurrentUser } from '@/lib/actions/users'
import { handleApiError } from '@/lib/api/apiError'
import { updateDocumentSchema } from '@/lib/schemas/document'
import { DocumentCommandService } from '@/lib/services/documents/DocumentCommandService'
import { DocumentQueryService } from '@/lib/services/documents/DocumentQueryService'
import { UserService } from '@/lib/services/UserService'

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
    const { documentId } = await params

    try {
        const user = await getCurrentUser(request)

        if (!user) {
            return NextResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            )
        }

        const document = await DocumentQueryService.getDocumentById(
            documentId,
            user
        )

        if (!document) {
            return NextResponse.json(
                { message: 'Документ не найден' },
                { status: 404 }
            )
        }

        return NextResponse.json({ document })
    } catch (error) {
        return handleApiError(error)
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
    const { documentId } = await params

    try {
        const user = await getCurrentUser(request)
        if (!user || user.role === USER_ROLES.GUEST) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const validation = updateDocumentSchema.safeParse(body)
        if (!validation.success) {
            return handleApiError(validation.error)
        }

        let authorId: string | undefined

        if (validation.data.authorId) {
            authorId = validation.data.authorId
        } else if (validation.data.username) {
            const author = await UserService.findOrCreateAuthor(
                validation.data.username
            )
            authorId = author.id
        }

        const updatedDocument = await DocumentCommandService.updateDocument(
            documentId,
            validation.data,
            user,
            authorId
        )

        return NextResponse.json({
            message: 'Документ успешно обновлен',
            document: updatedDocument,
        })
    } catch (error) {
        return handleApiError(error)
    }
}

/**
 * @swagger
 * /documents/{documentId}:
 *   delete:
 *     summary: Delete a document by ID
 *     description: >
 *       Performs a soft delete by default.
 *       Admins can perform a hard delete by adding the `?hard=true` query parameter.
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: The document ID
 *       - in: query
 *         name: hard
 *         schema:
 *           type: boolean
 *         description: If true, performs a hard delete (admins only).
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
    const { documentId } = params
    const { searchParams } = new URL(request.url)
    const hardDelete = searchParams.get('hard') === 'true'

    try {
        const user = await getCurrentUser(request)
        // Гости не могут удалять, а остальные пользователи должны существовать
        if (!user || user.role === USER_ROLES.GUEST) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
        }

        if (hardDelete) {
            // Безвозвратное удаление доступно только администраторам
            if (user.role !== USER_ROLES.ADMIN) {
                return NextResponse.json(
                    {
                        message:
                            'Только администраторы могут безвозвратно удалять документы',
                    },
                    { status: 403 }
                )
            }
            await DocumentCommandService.hardDeleteDocument(documentId, user)
            return NextResponse.json({
                message: 'Документ безвозвратно удален',
            })
        } else {
            // Мягкое удаление доступно авторизованным пользователям (с проверкой прав внутри сервиса)
            await DocumentCommandService.softDeleteDocument(documentId, user)
            return NextResponse.json({
                message: 'Документ успешно удален',
            })
        }
    } catch (error) {
        return handleApiError(error)
    }
}
