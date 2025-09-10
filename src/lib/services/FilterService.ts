import { SORT_FIELDS, SORT_ORDER } from '@/constants/document';

import { documentFiltersSchema } from '../schemas/filter';
import {
    DocumentCountArgs,
    DocumentFindManyArgs,
    DocumentOrderBy,
    WhereDocumentInput,
} from '../types/document';
import {
    DocumentFilters,
    PaginationOptions,
    SortOptions,
} from '../types/filter';

/**
 * Сервис для управления фильтрами, сортировкой и пагинацией
 * Построение Prisma запросов с применением фильтров
 */
export class FilterService {
    /**
     * Строит Prisma запрос с применением фильтров
     * @param filters - Объект с параметрами фильтрации
     * @returns Prisma запрос с WHERE условиями
     */
    buildFilterQuery(filters: DocumentFilters): WhereDocumentInput {
        const where: WhereDocumentInput = {};

        // Фильтр по категориям
        if (filters.categoryIds && filters.categoryIds.length > 0) {
            where.categories = {
                some: { categoryId: { in: filters.categoryIds } },
            };
        }

        // Фильтр по автору
        if (filters.authorId) {
            where.authorId = filters.authorId;
        }

        // Фильтр по диапазону дат
        if (filters.dateRange) {
            if (filters.dateRange.from || filters.dateRange.to) {
                where.createdAt = {};
                if (filters.dateRange.from) {
                    where.createdAt.gte = filters.dateRange.from;
                }
                if (filters.dateRange.to) {
                    where.createdAt.lte = filters.dateRange.to;
                }
            }
        }

        // Фильтр по типу документа
        if (filters.documentType) {
            where.documentType = filters.documentType;
        }

        // Фильтр по статусу публикации
        if (filters.isPublished !== undefined) {
            where.isPublished = filters.isPublished;
        }

        // Фильтр по тегам
        if (filters.tags && filters.tags.length > 0) {
            where.tags = { hasSome: filters.tags };
        }

        // Фильтр по размеру файла
        if (filters.fileSize) {
            where.fileSize = {};
            if (filters.fileSize.min !== undefined) {
                where.fileSize.gte = filters.fileSize.min;
            }
            if (filters.fileSize.max !== undefined) {
                where.fileSize.lte = filters.fileSize.max;
            }
        }

        // Фильтр по MIME типу
        if (filters.mimeType) {
            where.mimeType = filters.mimeType;
        }

        // Текстовый поиск по заголовку и описанию
        if (filters.searchQuery) {
            where.OR = [
                {
                    title: {
                        contains: filters.searchQuery,
                        mode: 'insensitive',
                    },
                },
                {
                    description: {
                        contains: filters.searchQuery,
                        mode: 'insensitive',
                    },
                },
            ];
        }

        return where;
    }

    /**
     * Применяет сортировку к Prisma запросу
     * @param sortBy - Поле для сортировки
     * @param sortOrder - Направление сортировки
     * @returns Prisma запрос с ORDER BY
     */
    applySorting(
        sortBy: SortOptions['field'],
        sortOrder: SortOptions['order'] = SORT_ORDER.DESC
    ): DocumentOrderBy {
        const orderBy: DocumentOrderBy = {};

        switch (sortBy) {
            case SORT_FIELDS.CREATED_AT:
                orderBy.createdAt = sortOrder;
                break;
            case SORT_FIELDS.UPDATED_AT:
                orderBy.updatedAt = sortOrder;
                break;
            case SORT_FIELDS.TITLE:
                orderBy.title = sortOrder;
                break;
            case SORT_FIELDS.FILE_SIZE:
                orderBy.fileSize = sortOrder;
                break;
            case SORT_FIELDS.VIEW_COUNT:
                orderBy.viewCount = sortOrder;
                break;
            case SORT_FIELDS.DOWNLOAD_COUNT:
                orderBy.downloadCount = sortOrder;
                break;
            default:
                orderBy.createdAt = SORT_ORDER.DESC;
        }

        return orderBy;
    }

    /**
     * Применяет пагинацию к Prisma запросу
     * @param page - Номер страницы (начиная с 1)
     * @param limit - Количество элементов на странице
     * @returns Объект с skip и take для Prisma
     */
    applyPagination(
        page: number,
        limit: number
    ): { skip: number; take: number } {
        const skip = (page - 1) * limit;
        return { skip, take: limit };
    }

    /**
     * Строит полный Prisma запрос с фильтрами, сортировкой и пагинацией
     * @param filters - Фильтры документов
     * @param sortOptions - Опции сортировки
     * @param paginationOptions - Опции пагинации
     * @returns Полный Prisma запрос
     */
    buildFullQuery(
        filters: DocumentFilters,
        sortOptions: SortOptions,
        paginationOptions: PaginationOptions
    ): DocumentFindManyArgs {
        return {
            where: this.buildFilterQuery(filters),
            orderBy: this.applySorting(sortOptions.field, sortOptions.order),
            ...this.applyPagination(
                paginationOptions.page,
                paginationOptions.limit
            ),
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                    },
                },
                categories: {
                    include: {
                        category: { select: { id: true, name: true } },
                    },
                },
                attachments: {
                    select: {
                        id: true,
                        fileName: true,
                        fileSize: true,
                        mimeType: true,
                    },
                },
            },
        };
    }

    /**
     * Строит запрос для подсчета общего количества документов
     * @param filters - Фильтры документов
     * @returns Prisma запрос для подсчета
     */
    buildCountQuery(filters: DocumentFilters): DocumentCountArgs {
        return {
            where: this.buildFilterQuery(filters),
        };
    }

    /**
     * Валидирует и нормализует фильтры
     * @param filters - Сырые фильтры
     * @returns Нормализованные фильтры
     */
    validateAndNormalizeFilters(filters: unknown): DocumentFilters {
        return documentFiltersSchema.parse(filters);
    }

    /**
     * Создает базовые фильтры для публичных документов
     * @returns Базовые фильтры
     */
    getPublicDocumentFilters(): DocumentFilters {
        return {
            isPublished: true,
        };
    }

    /**
     * Создает фильтры для пользователя
     * @param userId - ID пользователя
     * @param includePrivate - Включать ли приватные документы
     * @returns Фильтры для пользователя
     */
    getUserDocumentFilters(
        userId: string,
        includePrivate: boolean = false
    ): DocumentFilters {
        const filters: DocumentFilters = {
            authorId: userId,
        };

        if (!includePrivate) {
            filters.isPublished = true;
        }

        return filters;
    }
}

// Экспорт экземпляр для использования в приложении
export const filterService = new FilterService();
