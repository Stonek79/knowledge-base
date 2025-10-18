import Redis from 'ioredis'

import type {
    CacheOperationResult,
    CacheOptions,
    CacheStats,
} from '../types/cache'

class CacheService {
    private client: Redis | null = null
    private defaultTtl: number
    private prefix: string

    constructor() {
        this.defaultTtl = 300 // 5 минут по умолчанию
        this.prefix = process.env.REDIS_KEY_PREFIX || 'kb:'
    }

    private getClient(): Redis {
        if (this.client) {
            return this.client
        }

        const redisUrl = process.env.REDIS_URL

        if (!redisUrl) {
            console.warn(
                '>>> Build environment detected or REDIS_URL is not set. Using MOCK Redis client.'
            )
            const mockClient = {
                get: async () => null,
                setex: async () => 'OK',
                set: async () => 'OK',
                del: async () => 1,
                keys: async () => [],
                info: async () => '',
                dbsize: async () => 0,
                flushdb: async () => 'OK',
                quit: async () => 'OK',
                on: () => mockClient,
            } as unknown as Redis
            return mockClient
        }

        this.client = new Redis(redisUrl, {
            enableAutoPipelining: true,
            showFriendlyErrorStack: false,
            maxRetriesPerRequest: 3,
            retryStrategy: (times: number) => Math.min(times * 50, 1000),
        })

        this.setupEventHandlers(this.client)
        return this.client
    }

    async get<T>(key: string): Promise<T | null> {
        try {
            const client = this.getClient()
            const fullKey = this.buildKey(key)
            const value = await client.get(fullKey)

            if (!value) return null

            return JSON.parse(value) as T
        } catch (error) {
            console.error(`Ошибка получения из кэша: ${error}`)
            return null
        }
    }

    async set<T>(
        key: string,
        value: T,
        options: CacheOptions = {}
    ): Promise<CacheOperationResult> {
        try {
            const client = this.getClient()
            const fullKey = this.buildKey(key)
            const ttl = options.ttl || this.defaultTtl
            const serializedValue = JSON.stringify(value)

            if (ttl > 0) {
                await client.setex(fullKey, ttl, serializedValue)
            } else {
                await client.set(fullKey, serializedValue)
            }

            return { success: true }
        } catch (error) {
            return {
                success: false,
                error: `Ошибка сохранения в кэш: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
            }
        }
    }

    async delete(key: string): Promise<CacheOperationResult> {
        try {
            const client = this.getClient()
            const fullKey = this.buildKey(key)
            await client.del(fullKey)
            return { success: true }
        } catch (error) {
            return {
                success: false,
                error: `Ошибка удаления из кэша: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
            }
        }
    }

    async invalidateSearchResults(): Promise<CacheOperationResult> {
        try {
            const client = this.getClient()
            const pattern = this.buildKey('search:*')
            const keys = await client.keys(pattern)

            if (keys.length > 0) {
                await client.del(...keys)
            }

            return { success: true }
        } catch (error) {
            return {
                success: false,
                error: `Ошибка инвалидации результатов поиска: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
            }
        }
    }

    async invalidateByPattern(pattern: string): Promise<CacheOperationResult> {
        try {
            const client = this.getClient()
            const fullPattern = this.buildKey(pattern)
            const keys = await client.keys(fullPattern)

            if (keys.length > 0) {
                await client.del(...keys)
            }

            return { success: true }
        } catch (error) {
            return {
                success: false,
                error: `Ошибка инвалидации по паттерну: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
            }
        }
    }

    async getStats(): Promise<CacheStats> {
        try {
            const client = this.getClient()
            const [memoryInfo, statsInfo] = await Promise.all([
                client.info('memory'),
                client.info('stats'),
            ])
            const keys = await client.dbsize()

            // Парсинг всех метрик одним регулярным выражением
            const parseInfo = (info: string, key: string): number => {
                const match = info.match(new RegExp(`${key}:(\\d+)`))
                return match?.[1] ? parseInt(match[1], 10) : 0
            }

            const memoryUsage = parseInfo(memoryInfo, 'used_memory')
            const hits = parseInfo(statsInfo, 'keyspace_hits')
            const misses = parseInfo(statsInfo, 'keyspace_misses')
            const total = hits + misses

            return {
                totalKeys: keys,
                memoryUsage,
                hitRate: total > 0 ? hits / total : 0,
                lastCleanup: new Date(),
            }
        } catch (error) {
            console.error(`Ошибка получения статистики кэша: ${error}`)
            return {
                totalKeys: 0,
                memoryUsage: 0,
                hitRate: 0,
            }
        }
    }

    async clear(): Promise<CacheOperationResult> {
        try {
            const client = this.getClient()
            await client.flushdb()
            return { success: true }
        } catch (error) {
            return {
                success: false,
                error: `Ошибка очистки кэша: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
            }
        }
    }

    async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.quit()
            this.client = null
        }
    }

    private buildKey(key: string): string {
        return `${this.prefix}${key}`
    }

    private setupEventHandlers(client: Redis): void {
        client.on('connect', () => {
            console.log('✅ Redis подключен')
        })

        client.on('error', error => {
            console.error('❌ Redis ошибка:', error)
        })

        client.on('close', () => {
            console.log('🔌 Redis соединение закрыто')
        })
    }
}

let cacheServiceInstance: CacheService | null = null

export const getCacheService = (): CacheService => {
    if (!cacheServiceInstance) {
        cacheServiceInstance = new CacheService()
    }
    return cacheServiceInstance
}
