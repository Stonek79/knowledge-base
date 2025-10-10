import { Prisma } from '@prisma/client';

/**
 * Prisma Client Extension для реализации "мягкого удаления".
 *
 * Это расширение автоматически и типобезопасно фильтрует запросы к модели `Document`,
 * чтобы исключить записи, у которых установлено поле `deletedAt`.
 *
 * Оно перехватывает следующие операции чтения:
 * - findUnique
 * - findFirst
 * - findMany
 * - count
 *
 * Операции записи (`create`, `update`, `delete`) не затрагиваются,
 * их обработка остается в сервисном слое.
 */
export const softDeleteExtension = Prisma.defineExtension({
    name: 'softDeleteFiltering',
    query: {
        document: {
            async findUnique({ args, query }) {
                const modifiedArgs = {
                    ...args,
                    where: { ...args.where, deletedAt: null },
                };
                return query(modifiedArgs);
            },
            async findFirst({ args, query }) {
                const modifiedArgs = {
                    ...args,
                    where: { ...args.where, deletedAt: null },
                };
                return query(modifiedArgs);
            },
            async findMany({ args, query }) { 
                const modifiedArgs = {
                    ...args,
                    where: { ...args.where, deletedAt: null },
                };
                return query(modifiedArgs);
            },
            async count({ args, query }) {
                const modifiedArgs = {
                    ...args,
                    where: { ...args.where, deletedAt: null },
                };
                return query(modifiedArgs);
            },
        },
    },
});
