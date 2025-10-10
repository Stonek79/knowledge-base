import { Job, Worker } from 'bullmq';
import Redis from 'ioredis';

import { SearchEngine } from '../src/constants/document.js';
import { documentContentService } from '../src/core/documents/DocumentContentService.js';
import { prisma } from '../src/lib/prisma/prisma.js';
import {
    INDEXING_QUEUE_NAME,
    indexingQueue,
} from '../src/lib/queues/indexing.js';
import { SearchFactory } from '../src/lib/search/factory.js';

// Используем тот же URL, что и в основном приложении
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Создаем отдельное соединение для воркера
const redisConnection = new Redis(redisUrl, { maxRetriesPerRequest: null });

/**
 * Процессор задачи индексации.
 * Эта асинхронная функция будет вызываться для каждой задачи в очереди.
 * @param job - Объект задачи из BullMQ, содержит данные (например, documentId).
 */
const indexingJobProcessor = async (job: Job) => {
    const { documentId } = job.data;

    console.log('documentId', documentId);

    if (!documentId) {
        console.error(`Job ${job.id} received without documentId`, job.data);
        return;
    }

    console.log(
        `[Worker] Processing job '${job.name}' (${job.id}) for document ${documentId}`
    );

    const engine =
        (process.env
            .SEARCH_ENGINE as (typeof SearchEngine)[keyof typeof SearchEngine]) ||
        SearchEngine.FLEXSEARCH;
    const indexer = SearchFactory.createIndexer(engine);

    try {
        switch (job.name) {
            case 'index-document': {
                const document = await prisma.document.findUnique({
                    where: { id: documentId },
                    include: {
                        author: {
                            select: { id: true, username: true, role: true },
                        },
                        categories: { include: { category: true } },
                        confidentialAccessUsers: true,
                    },
                });

                if (!document) {
                    throw new Error(
                        `Document with ID ${documentId} not found for indexing.`
                    );
                }
                await indexer.indexDocument(document);
                console.log(
                    `[Worker] Successfully indexed document ${documentId}`
                );
                break;
            }
            case 'remove-from-index': {
                await indexer.removeFromIndex(documentId);
                console.log(
                    `[Worker] Successfully removed document ${documentId} from index`
                );
                break;
            }
            case 'update-content-and-reindex': {
                // 1. Делегируем извлечение и обновление контента сервису
                await documentContentService.updateContent(documentId);

                // 2. Ставим в очередь задачу для финальной индексации
                console.log(
                    `[Worker] Enqueuing job: 'index-document' for documentId: ${documentId}`
                );
                await indexingQueue.add('index-document', { documentId });
                console.log(
                    `[Worker] Enqueued 'index-document' job for document ${documentId} after content update.`
                );
                break;
            }

            default:
                throw new Error(`Unknown job name: ${job.name}`);
        }
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Worker] Job '${job.name}' (${job.id}) for document ${documentId} failed. Error: 
        ${errorMessage}`);
        throw error;
    }
};

// --- Инициализация воркера ---

console.log('[Worker] Starting up...');

const worker = new Worker(INDEXING_QUEUE_NAME, indexingJobProcessor, {
    connection: redisConnection,
    concurrency: 5, // Обрабатывать до 5 задач одновременно
    removeOnComplete: { count: 1000 }, // Хранить 1000 последних успешных задач
    removeOnFail: { count: 5000 }, // Хранить 5000 последних проваленных задач
});

// --- Обработчики событий для логирования ---

worker.on('completed', (job: Job, returnValue: any) => {
    console.log(`[Worker] Job ${job.id} completed successfully.`);
});

worker.on('failed', (job: Job | undefined, error: Error) => {
    if (job) {
        console.error(
            `[Worker] Job ${job.id} failed with error: ${error.message}`
        );
    } else {
        console.error(
            `[Worker] An unknown job failed with error: ${error.message}`
        );
    }
});

worker.on('error', err => {
    console.error('[Worker] Worker encountered an error:', err);
});
console.log('[Worker] Worker started and is listening for jobs.');

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('[Worker] Shutting down...');
    await worker.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('[Worker] Shutting down...');
    await worker.close();
    process.exit(0);
});
