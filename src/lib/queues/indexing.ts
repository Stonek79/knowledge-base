import { Queue } from 'bullmq';
import Redis from 'ioredis';

/**
 * Имя очереди для задач индексации.
 */
export const INDEXING_QUEUE_NAME = 'indexing-queue';

/**
 * URL для подключения к Redis.
 * В Docker-окружении `redis` - это имя сервиса.
 * @default 'redis://localhost:6379'
 */
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

/**
 * Создаем переиспользуемое соединение с Redis.
 * `maxRetriesPerRequest: null` важно для корректной работы BullMQ.
 */
const redisConnection = new Redis(redisUrl, { maxRetriesPerRequest: null });

/**
 * Синглтон очереди для задач индексации документов.
 *
 * Экспортируем этот экземпляр для добавления задач в очередь из API.
 * @example
 * await indexingQueue.add('index-document', { documentId: 'some-id' });
 */
export const indexingQueue = new Queue(INDEXING_QUEUE_NAME, {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3, // 3 попытки в случае ошибки
        backoff: {
            type: 'exponential', // экспоненциальная задержка между попытками
            delay: 1000, // 1с, 2с, 4с
        },
        removeOnComplete: true, // автоматически удалять успешные задачи
        removeOnFail: 1000, // хранить 1000 последних упавших задач
    },
});

// Обработчик ошибок на уровне соединения, чтобы логировать проблемы с Redis
redisConnection.on('error', err => {
    console.error('[Redis Connection Error]', err);
});
