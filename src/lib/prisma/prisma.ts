import { PrismaClient } from '@prisma/client';

import { softDeleteExtension } from './softDeleteExtension';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

const createPrismaClient = () => {
    const client = new PrismaClient();
    // Применяем middleware для "мягкого" удаления
    client.$extends(softDeleteExtension);
    return client;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
