import { Queue } from 'bullmq';
import Redis from 'ioredis';

/**
 * Имя очереди для задач индексации.
 */
export const INDEXING_QUEUE_NAME = 'indexing-queue';


/**
 * Создает Redis подключение или Mock для сборки
 */
function createRedisConnection(): Redis {
    const redisUrl = process.env.REDIS_URL;
    
    // Если нет REDIS_URL (во время сборки) - возвращаем mock
    if (!redisUrl) {
        console.warn('>>> Build environment detected or REDIS_URL is not set. Using MOCK Redis for indexing queue.');
        
        const mockRedis = {
            options: { keyPrefix: '' },  // 👈 ВАЖНО! BullMQ читает это свойство
            on: () => mockRedis,
            connect: async () => 'OK',
            disconnect: async () => {},
            duplicate: () => mockRedis,
            ping: async () => 'PONG',
            quit: async () => 'OK',
        } as unknown as Redis;
        
        return mockRedis;
    }
    
    // Production подключение - maxRetriesPerRequest: null важно для BullMQ!
    return new Redis(redisUrl, { maxRetriesPerRequest: null });
}

/**
 * Создаем переиспользуемое соединение с Redis.
 */
const redisConnection = createRedisConnection();

// Обработчик ошибок только если реальный Redis
if (process.env.REDIS_URL) {
    redisConnection.on('error', err => {
        console.error('[Redis Connection Error]', err);
    });
}
// 
// /**
//  * URL для подключения к Redis.
//  * В Docker-окружении `redis` - это имя сервиса.
//  * @default 'redis://localhost:6379'
//  */
// const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// /**
//  * Создаем переиспользуемое соединение с Redis.
//  * `maxRetriesPerRequest: null` важно для корректной работы BullMQ.
//  */
// const redisConnection = new Redis(redisUrl, { maxRetriesPerRequest: null });

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
// redisConnection.on('error', err => {
//     console.error('[Redis Connection Error]', err);
// });
