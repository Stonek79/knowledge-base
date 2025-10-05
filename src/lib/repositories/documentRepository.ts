import { prisma } from '@/lib/prisma';

import type { Prisma } from '@prisma/client';


/**
 * DocumentRepository инкапсулирует прямой доступ к данным документов и связанных сущностей в БД.
 */
export class DocumentRepository {
    // --- Document Methods ---

    /**
     * Находит множество документов по заданным условиям.
     * @param options - Опции для findMany (where, include, orderBy, etc.).
     * @returns - Массив документов.
     */
    public static findMany(options: Prisma.DocumentFindManyArgs) {
        return prisma.document.findMany(options);
    }

    /**
     * Находит один документ по уникальному идентификатору или другим условиям.
     * @param options - Опции для findUnique.
     * @returns - Найденный документ или null.
     */
    public static findUnique(options: Prisma.DocumentFindUniqueArgs) {
        return prisma.document.findUnique(options);
    }

    /**
     * Считает количество документов по заданным условиям.
     * @param options - Опции для count (where).
     * @returns - Количество документов.
     */
    public static count(options: Prisma.DocumentCountArgs) {
        return prisma.document.count(options);
    }

    /**
     * Проверяет, есть ли у пользователя доступ к конфиденциальному документу.
     * @param userId - ID пользователя.
     * @param documentId - ID документа.
     * @returns - true, если доступ есть, false - если нет.
     */
    public static hasConfidentialAccess(userId: string, documentId: string) {
        return prisma.confidentialDocumentAccess.findUnique({
            where: {
                userId_documentId: {
                    userId: userId,
                    documentId: documentId,
                },
            },
        });
    }

    /**
     * Создает новый документ.
     * @param options - Опции для create.
     * @returns - Созданный документ.
     */
    public static create(options: Prisma.DocumentCreateArgs) {
        return prisma.document.create(options);
    }

    /**
     * Обновляет существующий документ.
     * @param options - Опции для update.
     * @returns - Обновленный документ.
     */
    public static update(options: Prisma.DocumentUpdateArgs) {
        return prisma.document.update(options);
    }

    // --- ConvertedDocument Methods ---

    /**
     * Создает запись о конвертированном документе.
     * @param options - Опции для create.
     * @returns - Созданная запись о конвертации.
     */
    public static createConvertedDocument(
        options: Prisma.ConvertedDocumentCreateArgs
    ) {
        return prisma.convertedDocument.create(options);
    }

    // --- Transaction Methods ---

    /**
     * Выполняет несколько операций в рамках пакетной транзакции.
     * @param operations - Массив операций Prisma.
     * @returns - Результат выполнения транзакции.
     */
    public static transaction(
        operations: Prisma.PrismaPromise<unknown>[],
        options?: {
            maxWait?: number;
            timeout?: number;
            isolationLevel?: Prisma.TransactionIsolationLevel;
        }
    ) {
        return prisma.$transaction(operations, options);
    }

    /**
     * Выполняет несколько операций в рамках интерактивной транзакции.
     * @param callback - Функция, получающая клиент транзакции.
     * @returns - Результат выполнения колбэка.
     */
    public static interactiveTransaction<T>(
        callback: (tx: Prisma.TransactionClient) => Promise<T>,
        options?: {
            maxWait?: number;
            timeout?: number;
            isolationLevel?: Prisma.TransactionIsolationLevel;
        }
    ) {
        return prisma.$transaction(callback, options);
    }
}
