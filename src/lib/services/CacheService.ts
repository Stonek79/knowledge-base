import Redis from 'ioredis';

import { CacheOperationResult, CacheOptions, CacheStats } from '../types/cache';

/**
 * Сервис кэширования для улучшения производительности
 * Поддерживает Redis для распределенного кэширования
 */
export class CacheService {
    private client: Redis;
    private defaultTtl: number;
    private prefix: string;

    constructor() {
        this.client = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            db: parseInt(process.env.REDIS_DB || '0'),
            enableAutoPipelining: true,
            showFriendlyErrorStack: false,
            maxRetriesPerRequest: 3,
            retryStrategy: (times: number) => Math.min(times * 50, 1000),
        });

        this.defaultTtl = 300; // 5 минут по умолчанию
        this.prefix = process.env.REDIS_KEY_PREFIX || 'kb:';

        this.setupEventHandlers();
    }

    /**
     * Получает значение из кэша
     * @param key - Ключ кэша
     * @returns Значение или null если не найдено
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            const fullKey = this.buildKey(key);
            const value = await this.client.get(fullKey);

            if (!value) return null;

            return JSON.parse(value) as T;
        } catch (error) {
            console.error(`Ошибка получения из кэша: ${error}`);
            return null;
        }
    }

    /**
     * Сохраняет значение в кэш
     * @param key - Ключ кэша
     * @param value - Значение для сохранения
     * @param options - Опции кэширования
     */
    async set<T>(
        key: string,
        value: T,
        options: CacheOptions = {}
    ): Promise<CacheOperationResult> {
        try {
            const fullKey = this.buildKey(key);
            const ttl = options.ttl || this.defaultTtl;
            const serializedValue = JSON.stringify(value);

            if (ttl > 0) {
                await this.client.setex(fullKey, ttl, serializedValue);
            } else {
                await this.client.set(fullKey, serializedValue);
            }

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: `Ошибка сохранения в кэш: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
            };
        }
    }

    /**
     * Удаляет значение из кэша
     * @param key - Ключ для удаления
     */
    async delete(key: string): Promise<CacheOperationResult> {
        try {
            const fullKey = this.buildKey(key);
            await this.client.del(fullKey);
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: `Ошибка удаления из кэша: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
            };
        }
    }

    /**
     * Инвалидирует все результаты поиска
     * Вызывается при изменении документов
     */
    async invalidateSearchResults(): Promise<CacheOperationResult> {
        try {
            const pattern = this.buildKey('search:*');
            const keys = await this.client.keys(pattern);

            if (keys.length > 0) {
                await this.client.del(...keys);
            }

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: `Ошибка инвалидации результатов поиска: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
            };
        }
    }

    /**
     * Инвалидирует кэш по паттерну
     * @param pattern - Паттерн ключей для удаления
     */
    async invalidateByPattern(pattern: string): Promise<CacheOperationResult> {
        try {
            const fullPattern = this.buildKey(pattern);
            const keys = await this.client.keys(fullPattern);

            if (keys.length > 0) {
                await this.client.del(...keys);
            }

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: `Ошибка инвалидации по паттерну: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
            };
        }
    }

    /**
     * Получает статистику кэша
     * @returns Статистика использования кэша
     */
    async getStats(): Promise<CacheStats> {
        try {
            const info = await this.client.info('memory');
            const keys = await this.client.dbsize();

            // Простая эвристика для hit rate
            const hitRate = 0.8; // TODO: Реализовать реальный подсчет

            return {
                totalKeys: keys,
                memoryUsage: 0, // TODO: Извлечь из info
                hitRate,
                lastCleanup: new Date(),
            };
        } catch (error) {
            return {
                totalKeys: 0,
                memoryUsage: 0,
                hitRate: 0,
            };
        }
    }

    /**
     * Очищает весь кэш
     */
    async clear(): Promise<CacheOperationResult> {
        try {
            await this.client.flushdb();
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: `Ошибка очистки кэша: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
            };
        }
    }

    /**
     * Закрывает соединение с Redis
     */
    async disconnect(): Promise<void> {
        await this.client.quit();
    }

    /**
     * Строит полный ключ с префиксом
     * @param key - Базовый ключ
     * @returns Полный ключ с префиксом
     */
    private buildKey(key: string): string {
        return `${this.prefix}${key}`;
    }

    /**
     * Настраивает обработчики событий Redis
     */
    private setupEventHandlers(): void {
        this.client.on('connect', () => {
            console.log('✅ Redis подключен');
        });

        this.client.on('error', error => {
            console.error('❌ Redis ошибка:', error);
        });

        this.client.on('close', () => {
            console.log('🔌 Redis соединение закрыто');
        });
    }
}

// Экспорт экземпляра для использования в приложении
export const cacheService = new CacheService();
