import { subDays } from 'date-fns'

import { auditLogService } from '@/lib/container'
import { settingsService } from '@/lib/services/SettingsService'

export class CleanupService {
    public static async pruneOldAuditLogs(): Promise<number> {
        const retentionDays = await settingsService.getAuditLogRetentionDays()

        if (retentionDays <= 0) {
            console.log('Audit log pruning is disabled (retentionDays <= 0).')
            return 0
        }

        const cutoffDate = subDays(new Date(), retentionDays)

        const count = await auditLogService.pruneOldLogs(cutoffDate)

        console.log(
            `Pruned ${count} audit logs older than ${cutoffDate.toISOString()}.`
        )

        return count
    }
}
