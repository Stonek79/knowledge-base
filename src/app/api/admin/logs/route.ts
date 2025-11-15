import { type NextRequest, NextResponse } from 'next/server'

import { handleApiError } from '@/lib/api/apiError'
import { auditLogRepository } from '@/lib/repositories/AuditLogRepository'
import { auditLogsListParamsSchema } from '@/lib/schemas/audit-log'

/**
 * @swagger
 * /api/admin/logs:
 *   get:
 *     summary: Get audit logs
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: userIds
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *       - in: query
 *         name: actions
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: timestamp
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: A list of audit logs
 *       400:
 *         description: Invalid query parameters
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)

        const startDateParam = searchParams.get('startDate')
        const endDateParam = searchParams.get('endDate')

        // Parse and validate query parameters
        const validationResult = auditLogsListParamsSchema.safeParse({
            page: searchParams.get('page')
                ? parseInt(searchParams.get('page') as string, 10)
                : 1,
            limit: searchParams.get('limit')
                ? parseInt(searchParams.get('limit') as string, 10)
                : 20,
            userIds: searchParams.getAll('userIds'),
            actions: searchParams.getAll('actions'),
            startDate: startDateParam || undefined,
            endDate: endDateParam || undefined,
            sortBy: searchParams.get('sortBy') || 'timestamp',
            sortOrder: searchParams.get('sortOrder') || 'desc',
        })

        if (!validationResult.success) {
            return handleApiError(validationResult.error)
        }

        const {
            page,
            limit,
            userIds,
            actions,
            startDate,
            endDate,
            sortBy,
            sortOrder,
        } = validationResult.data

        // Fetch logs and total count from repository
        const { logs, total } = await auditLogRepository.findManyWithCount({
            page,
            limit,
            userIds,
            actions,
            startDate,
            endDate,
            sortBy,
            sortOrder,
        })

        const totalPages = Math.ceil(total / limit)

        return NextResponse.json({
            logs,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        })
    } catch (error) {
        return handleApiError(error)
    }
}
