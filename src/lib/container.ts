import { GOTENBERG_URL } from '@/constants/app'
import { DocumentProcessor } from '@/core/documents/DocumentProcessor'
import { GotenbergAdapter } from '@/core/documents/GotenbergAdapter'
// Global Prisma Client
// В реальном приложении лучше использовать глобальный инстанс, чтобы не плодить подключения при HMR
// Но для контейнера создадим новый или используем существующий из @/lib/prisma если нужно
// Для чистоты DI создадим здесь, но в Next.js это может быть проблемой.
// Лучше импортировать существующий.
import { prisma as globalPrisma } from '@/lib/prisma'
import { AuditLogRepositoryV2 } from '@/lib/repositories/AuditLogRepositoryV2'
import { DocumentRepositoryV2 } from '@/lib/repositories/DocumentRepositoryV2'
import { AuditLogServiceV2 } from '@/lib/services/AuditLogServiceV2'
import { DocumentQueryServiceV2 } from '@/lib/services/documents/DocumentQueryServiceV2'
import { DocumentServiceV2 } from '@/lib/services/documents/DocumentServiceV2'
import { getFileStorageService } from '@/lib/services/FileStorageService'
import { settingsService } from '@/lib/services/SettingsService'

// Repositories
export const documentRepository = new DocumentRepositoryV2(globalPrisma)
export const auditLogRepository = new AuditLogRepositoryV2(globalPrisma)

// Services
export const auditLogService = new AuditLogServiceV2(auditLogRepository)

// Core Dependencies
const gotenbergUrl = process.env.GOTENBERG_URL || GOTENBERG_URL
const conversionService = new GotenbergAdapter(gotenbergUrl)
const documentProcessor = new DocumentProcessor(conversionService)

// Main Service
export const documentService = new DocumentServiceV2(
    documentRepository,
    auditLogService,
    getFileStorageService(),
    settingsService,
    documentProcessor
)

export const documentQueryService = new DocumentQueryServiceV2(
    documentRepository,
    auditLogService
)
