import { subDays } from 'date-fns'

import { auditLogRepository } from '@/lib/repositories/AuditLogRepository'
import { settingsService } from '@/lib/services/SettingsService'

export class CleanupService {
    public static async pruneOldAuditLogs(): Promise<number> {
        const retentionDays = await settingsService.getAuditLogRetentionDays()

        if (retentionDays <= 0) {
            console.log(
                'Audit log pruning is disabled (retentionDays <= 0).'
            )
            return 0
        }

        const cutoffDate = subDays(new Date(), retentionDays)

        const { count } = await auditLogRepository.deleteOlderThan(cutoffDate)

        console.log(`Pruned ${count} audit logs older than ${cutoffDate.toISOString()}.`)

        return count
    }
}
