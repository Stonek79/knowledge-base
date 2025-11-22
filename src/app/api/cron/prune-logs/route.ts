import { type NextRequest, NextResponse } from 'next/server'

import { CleanupService } from '@/lib/services/CleanupService'

export async function GET(request: NextRequest) {
    // Защита роута: проверяем секретный ключ
    const authHeader = request.headers.get('Authorization')
    const CRON_SECRET = process.env.CRON_SECRET

    if (!CRON_SECRET) {
        console.error('CRON_SECRET environment variable is not set.')
        return NextResponse.json(
            { message: 'Server configuration error.' },
            { status: 500 }
        )
    }

    if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    try {
        const prunedCount = await CleanupService.pruneOldAuditLogs()
        return NextResponse.json({
            success: true,
            message: `Successfully pruned ${prunedCount} old audit logs.`,
            prunedCount,
        })
    } catch (error) {
        console.error('Error during audit log pruning:', error)
        return NextResponse.json(
            { message: 'Error pruning audit logs.' },
            { status: 500 }
        )
    }
}
