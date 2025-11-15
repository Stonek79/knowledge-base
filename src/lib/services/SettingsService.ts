import { ALLOWED_UPLOAD_MIME } from '@/constants/mime'
import { prisma } from '@/lib/prisma'
import type { AppSettings } from '@/lib/types/settings'

import { systemSettingsSchema } from '../schemas/settings'

type Cached<T> = {
    value: T | null
    loadedAt: number
}

const DEFAULTS: AppSettings = {
    maxFileSize: 2 * 1024 * 1024, // 2MB
    maxFilesPerUpload: 10,
    allowedMimeTypes: [...ALLOWED_UPLOAD_MIME],
    enableOcr: true,
    ocrLanguages: ['rus', 'eng'],
    auditLogRetentionDays: 180, // Добавлено новое значение по умолчанию
}

const CACHE_TTL_MS = 60_000

/**
 * Сервис для работы с настройками системы
 *
 * @description
 * Кеширует настройки системы и предоставляет методы для работы с ними.
 * load() — загружает настройки из БД
 * get() — возвращает кешированные настройки
 * refresh() — обновляет кешированные настройки
 * getMaxFileSize() — возвращает максимальный размер файла
 * getAllowedMimeTypes() — возвращает разрешенные MIME-типы
 * isOcrEnabled() — возвращает, включен ли OCR
 * getOcrLanguages() — возвращает языки OCR
 * getAuditLogRetentionDays() — возвращает срок хранения логов аудита
 *
 * @example {ts}
 * const settings = await settingsService.get();
 * console.log(settings);
 *
 * const maxFileSize = await settingsService.getMaxFileSize();
 * console.log(maxFileSize);
 *
 * const allowedMimeTypes = await settingsService.getAllowedMimeTypes();
 * console.log(allowedMimeTypes);
 *
 */
class SettingsService {
    private cache: Cached<AppSettings> = { value: null, loadedAt: 0 }

    private isExpired(): boolean {
        return Date.now() - this.cache.loadedAt > CACHE_TTL_MS
    }

    private async load(): Promise<AppSettings> {
        const row = await prisma.systemSettings.findUnique({
            where: { id: 'singleton' },
        })

        const parsed = systemSettingsSchema.safeParse(row ?? {})
        const normalized = parsed.success
            ? parsed.data
            : systemSettingsSchema.parse({})
        // Приводим к AppSettings (отбрасываем служебные поля)
        const settings: AppSettings = {
            maxFileSize: normalized.maxFileSize ?? DEFAULTS.maxFileSize,
            maxFilesPerUpload:
                normalized.maxFilesPerUpload ?? DEFAULTS.maxFilesPerUpload,
            allowedMimeTypes:
                normalized.allowedMimeTypes &&
                normalized.allowedMimeTypes.length > 0
                    ? normalized.allowedMimeTypes
                    : DEFAULTS.allowedMimeTypes,
            enableOcr: normalized.enableOcr ?? DEFAULTS.enableOcr,
            ocrLanguages:
                normalized.ocrLanguages && normalized.ocrLanguages.length > 0
                    ? normalized.ocrLanguages
                    : DEFAULTS.ocrLanguages,
            auditLogRetentionDays:
                normalized.auditLogRetentionDays ??
                DEFAULTS.auditLogRetentionDays, // Добавлено новое поле
        }
        this.cache = { value: settings, loadedAt: Date.now() }
        return settings
    }

    async get(): Promise<AppSettings> {
        if (!this.cache.value || this.isExpired()) {
            return this.load()
        }
        return this.cache.value
    }

    async refresh(): Promise<AppSettings> {
        return this.load()
    }

    async getMaxFileSize(): Promise<number> {
        return (await this.get()).maxFileSize
    }

    async getAllowedMimeTypes(): Promise<string[]> {
        return (await this.get()).allowedMimeTypes
    }

    async isOcrEnabled(): Promise<boolean> {
        return (await this.get()).enableOcr
    }

    async getOcrLanguages(): Promise<string[]> {
        return (await this.get()).ocrLanguages
    }

    async getAuditLogRetentionDays(): Promise<number> {
        return (await this.get()).auditLogRetentionDays || 180
    }
}

// Импортируем всё в один экземпляре
export const settingsService = new SettingsService()
