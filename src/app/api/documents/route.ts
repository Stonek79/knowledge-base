import { type NextRequest, NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/actions/users'
import { handleApiError } from '@/lib/api/apiError'
import { documentQueryService, documentService } from '@/lib/container'
import { documentListSchema, uploadFormSchema } from '@/lib/schemas/document'
import { UserService } from '@/lib/services/UserService'

/**
 * @swagger
 * /documents:
 *   get:
 *     summary: Get a list of documents with filtering, sorting, and searching
 *     tags: [Documents]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: categoryIds
 *         schema: { type: string }
 *         description: Comma-separated category IDs
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, default: 'createdAt' }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, default: 'desc' }
 *       - in: query
 *         name: authorId
 *         schema: { type: string }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Full-text search query
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: 'date' }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: 'date' }
 *     responses:
 *       200:
 *         description: A list of documents
 *       401:
 *         description: Unauthorized
 */
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser(request)

        if (!user) {
            return NextResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { searchParams } = new URL(request.url)

        const validation = documentListSchema.safeParse({
            page: parseInt(searchParams.get('page') || '1', 10),
            limit: parseInt(searchParams.get('limit') || '10', 10),
            categoryIds: searchParams.get('categoryIds')?.split(','),
            sortBy: searchParams.get('sortBy') || 'createdAt',
            sortOrder: searchParams.get('sortOrder') || 'desc',
            authorId: searchParams.get('authorId') || '',
            q: searchParams.get('q') || '',
            dateFrom: searchParams.get('dateFrom') || '',
            dateTo: searchParams.get('dateTo') || '',
            status: searchParams.get('status')
                ? searchParams.get('status')
                : undefined,
        })

        if (!validation.success) {
            return handleApiError(validation.error)
        }

        const result = await documentQueryService.searchDocuments(
            validation?.data,
            user
        )

        return NextResponse.json(result)
    } catch (error) {
        return handleApiError(error)
    }
}

/**
 * @swagger
 * /documents:
 *   post:
 *     summary: Create a new document
 *     tags: [Documents]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: {
 *                 type: string,
 *                 format: binary
 *               }
 *               title: { type: string }
 *               description: { type: string }
 *               authorId: { type: string }
 *               username: { type: string }
 *               categoryIds: { type: string, description: "JSON array of strings" }
 *               keywords: { type: string, description: "Comma-separated string" }
 *     responses:
 *       201:
 *         description: Document created successfully
 *       403:
 *         description: Forbidden
 */
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser(request)
        if (!user) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
        }

        const formData = await request.formData()

        const rawData = Object.fromEntries(formData.entries())
        if (typeof rawData.categoryIds === 'string') {
            rawData.categoryIds = JSON.parse(rawData.categoryIds)
        }

        const validation = uploadFormSchema.safeParse(rawData)

        if (!validation.success) {
            return handleApiError(validation.error)
        }

        let authorId: string
        if (validation.data.authorId) {
            authorId = validation.data.authorId
        } else if (validation.data.username) {
            const author = await UserService.findOrCreateAuthor(
                validation.data.username
            )
            authorId = author.id
        } else {
            authorId = user.id
        }

        const documentData = {
            ...validation.data,
            file: formData.get('file') as File,
            creatorId: user.id, // Текущий юзер - это создатель
            authorId: authorId, // Автор - тот, кого нашли или создали
        }

        const document = await documentService.createDocument(
            documentData,
            user
        )

        return NextResponse.json(
            {
                message: 'Документ успешно создан',
                document,
            },
            { status: 201 }
        )
    } catch (error) {
        return handleApiError(error)
    }
}
