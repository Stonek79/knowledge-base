// lib/database.ts
import { PrismaClient } from '@prisma/client';

class DatabaseService {
    private prisma: PrismaClient;
    private retryAttempts = 5;
    private retryDelay = 2000; // 2 секунды

    constructor() {
        this.prisma = new PrismaClient({
            log: ['error', 'warn'],
            datasources: {
                db: {
                    url: process.env.DATABASE_URL,
                },
            },
        });
    }

    async connect(): Promise<void> {
        let attempts = 0;

        while (attempts < this.retryAttempts) {
            try {
                console.log(
                    `🔄 Попытка подключения к БД (${attempts + 1}/${this.retryAttempts})`
                );
                await this.prisma.$connect();
                console.log('✅ Подключение к БД установлено');
                return;
            } catch (error) {
                attempts++;
                console.error(
                    `❌ Ошибка подключения (попытка ${attempts}):`,
                    error instanceof Error && error?.message
                );

                if (attempts < this.retryAttempts) {
                    console.log(
                        `⏳ Повторная попытка через ${this.retryDelay}ms...`
                    );
                    await this.delay(this.retryDelay);
                    this.retryDelay *= 1.5; // Экспоненциальная задержка
                } else {
                    console.error(
                        '💥 Не удалось подключиться к БД после всех попыток'
                    );
                    throw new Error('Database connection failed');
                }
            }
        }
    }

    async disconnect(): Promise<void> {
        await this.prisma.$disconnect();
    }

    getClient(): PrismaClient {
        return this.prisma;
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export const databaseService = new DatabaseService();
