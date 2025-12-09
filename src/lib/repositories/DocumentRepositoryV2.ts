import type { Prisma, PrismaClient } from '@/lib/types/prisma'

/**
 * DocumentRepositoryV2 инкапсулирует доступ к данным документов.
 * Использует внедрение зависимостей (DI) для PrismaClient.
 */
export class DocumentRepositoryV2 {
    constructor(private prisma: PrismaClient) {}

    /**
     * Находит множество документов по заданным условиям.
     */
    async findMany(options: Prisma.DocumentFindManyArgs) {
        return this.prisma.document.findMany(options)
    }

    /**
     * Находит один документ по уникальному идентификатору или другим условиям.
     */
    async findUnique<T extends Prisma.DocumentFindUniqueArgs>(
        options: T
    ): Promise<Prisma.DocumentGetPayload<T> | null> {
        return this.prisma.document.findUnique(
            options
        ) as unknown as Promise<Prisma.DocumentGetPayload<T> | null>
    }

    /**
     * Считает количество документов по заданным условиям.
     */
    async count(options: Prisma.DocumentCountArgs) {
        return this.prisma.document.count(options)
    }

    /**
     * Проверяет, есть ли у пользователя доступ к конфиденциальному документу.
     */
    async hasConfidentialAccess(userId: string, documentId: string) {
        return this.prisma.confidentialDocumentAccess.findUnique({
            where: {
                userId_documentId: {
                    userId: userId,
                    documentId: documentId,
                },
            },
        })
    }

    /**
     * Создает новый документ.
     */
    async create<T extends Prisma.DocumentCreateArgs>(
        options: T
    ): Promise<Prisma.DocumentGetPayload<T>> {
        return this.prisma.document.create(options) as unknown as Promise<
            Prisma.DocumentGetPayload<T>
        >
    }

    /**
     * Обновляет существующий документ.
     */
    async update<T extends Prisma.DocumentUpdateArgs>(
        options: T
    ): Promise<Prisma.DocumentGetPayload<T>> {
        return this.prisma.document.update(options) as unknown as Promise<
            Prisma.DocumentGetPayload<T>
        >
    }

    // --- ConvertedDocument Methods ---

    /**
     * Создает запись о конвертированном документе.
     */
    async createConvertedDocument(options: Prisma.ConvertedDocumentCreateArgs) {
        return this.prisma.convertedDocument.create(options)
    }

    // --- Transaction Methods ---
    // Примечание: В V2 мы стараемся избегать передачи транзакций через статические методы.
    // Вместо этого мы будем использовать интерактивные транзакции, где сервис получает
    // новый экземпляр репозитория, привязанный к транзакции, или передает tx клиент.
    // Для совместимости пока оставим метод, принимающий txClient, но лучше переделать архитектуру.

    /**
     * Выполняет операции в транзакции.
     * В идеале, сервис должен управлять транзакцией и передавать txClient в методы репозитория,
     * либо использовать UnitOfWork.
     * Для простоты миграции, сделаем метод, который принимает callback.
     */
    async interactiveTransaction<T>(
        callback: (
            txRepo: DocumentRepositoryV2,
            txClient: PrismaClient
        ) => Promise<T>,
        options?: {
            maxWait?: number
            timeout?: number
            isolationLevel?: Prisma.TransactionIsolationLevel
        }
    ) {
        return this.prisma.$transaction(async txClient => {
            // Создаем временный репозиторий, привязанный к транзакции
            const txRepo = new DocumentRepositoryV2(txClient as PrismaClient)
            return callback(txRepo, txClient as PrismaClient)
        }, options)
    }
}
