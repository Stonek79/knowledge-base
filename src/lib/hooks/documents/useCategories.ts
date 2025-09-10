import { useCallback, useEffect, useState } from 'react';

import {
    CategoryBase,
    CreateCategoryData,
    UpdateCategoryData,
} from '@/lib/types/document';

import { useCategoriesApi } from './useCategoriesApi';

/**
 * Основной хук для работы с категориями документов
 *
 * @description Предоставляет полный CRUD функционал для категорий с UI логикой:
 * - Загрузка и кэширование категорий
 * - Создание, обновление, удаление категорий
 * - Управление состоянием операций (загрузка, ошибки, успех)
 * - Автоматические уведомления пользователя
 * - Утилиты для поиска и фильтрации
 *
 * @returns {Object} Объект с методами и состоянием
 * @returns {CategoryBase[]} returns.categories - Список всех категорий
 * @returns {Error | null} returns.error - Ошибка загрузки данных
 * @returns {boolean} returns.isLoading - Состояние загрузки данных
 * @returns {Function} returns.createCategory - Функция создания категории с UI логикой
 * @returns {Function} returns.updateCategory - Функция обновления категории с UI логикой
 * @returns {Function} returns.deleteCategory - Функция удаления категории с UI логикой
 * @returns {string | null} returns.operationError - Ошибка текущей операции
 * @returns {string | null} returns.operationSuccess - Сообщение об успехе операции
 * @returns {boolean} returns.operationLoading - Состояние загрузки операции
 * @returns {'create' | 'update' | 'delete' | null} returns.currentOperation - Тип текущей операции
 * @returns {Function} returns.getCategoryById - Поиск категории по ID
 * @returns {Function} returns.searchCategories - Поиск категорий по тексту
 * @returns {Function} returns.clearMessages - Очистка сообщений об ошибках/успехе
 * @returns {Function} returns.refetch - Принудительное обновление данных
 *
 * @example
 * ```tsx
 * const {
 *   categories,
 *   createCategory,
 *   operationLoading,
 *   operationError
 * } = useCategories();
 *
 * const handleCreate = async () => {
 *   try {
 *     await createCategory({ name: 'Новая категория' });
 *     // Успех покажется автоматически
 *   } catch (error) {
 *     // Ошибка покажется автоматически
 *   }
 * };
 * ```
 */
export const useCategories = () => {
    const api = useCategoriesApi();

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [currentOperation, setCurrentOperation] = useState<
        'create' | 'update' | 'delete' | null
    >(null);

    /**
     * Общая функция для выполнения CRUD операций
     *
     * @template T - Тип возвращаемого результата
     * @param {'create' | 'update' | 'delete'} operation - Тип операции
     * @param {() => Promise<T>} operationFn - Функция для выполнения операции
     * @param {string} successMessage - Сообщение об успехе
     *
     * @returns {Promise<T>} Результат операции
     *
     * @private
     */
    const executeOperation = useCallback(
        async <T>(
            operation: 'create' | 'update' | 'delete',
            operationFn: () => Promise<T>,
            successMessage: string
        ): Promise<T> => {
            setIsLoading(true);
            setCurrentOperation(operation);
            setError(null);
            setSuccess(null);

            try {
                const result = await operationFn();
                setSuccess(successMessage);
                setTimeout(() => setSuccess(null), 3000);
                return result;
            } catch (error) {
                const errorMessage =
                    error instanceof Error
                        ? error.message
                        : 'Неизвестная ошибка';
                setError(errorMessage);
                throw error;
            } finally {
                setIsLoading(false);
                setCurrentOperation(null);
            }
        },
        []
    );

    /**
     * Создает новую категорию с UI логикой
     *
     * @param {CreateCategoryData} data - Данные для создания категории
     * @returns {Promise<CreateCategoryResult>} Результат создания
     *
     * @example
     * ```tsx
     * await createCategory({
     *   name: 'Документы',
     *   description: 'Общие документы',
     *   color: '#FF5733'
     * });
     * ```
     */
    const createCategory = useCallback(
        async (data: CreateCategoryData) => {
            return executeOperation(
                'create',
                () => api.createCategoryApi(data),
                'Категория успешно создана'
            );
        },
        [api.createCategoryApi, executeOperation]
    );

    /**
     * Обновляет существующую категорию с UI логикой
     *
     * @param {UpdateCategoryData} data - Данные для обновления
     * @returns {Promise<UpdateCategoryResult>} Результат обновления
     *
     * @example
     * ```tsx
     * await updateCategory({
     *   id: 'cat-123',
     *   name: 'Обновленное название'
     * });
     * ```
     */
    const updateCategory = useCallback(
        async (data: UpdateCategoryData) => {
            return executeOperation(
                'update',
                () => api.updateCategoryApi(data),
                'Категория успешно обновлена'
            );
        },
        [api.updateCategoryApi, executeOperation]
    );

    /**
     * Удаляет категорию с UI логикой
     *
     * @param {string} categoryId - ID категории для удаления
     * @returns {Promise<DeleteCategoryResult>} Результат удаления
     *
     * @example
     * ```tsx
     * await deleteCategory('cat-123');
     * ```
     */
    const deleteCategory = useCallback(
        async (categoryId: string) => {
            return executeOperation(
                'delete',
                () => api.deleteCategoryApi(categoryId),
                'Категория успешно удалена'
            );
        },
        [api.deleteCategoryApi, executeOperation]
    );

    /**
     * Очищает сообщения об ошибках и успехе
     */
    const clearMessages = useCallback(() => {
        setError(null);
        setSuccess(null);
    }, []);

    /**
     * Находит категорию по ID
     *
     * @param {string} categoryId - ID категории
     * @returns {CategoryBase | undefined} Найденная категория или undefined
     *
     * @example
     * ```tsx
     * const category = getCategoryById('cat-123');
     * if (category) {
     *   console.log(category.name);
     * }
     * ```
     */
    const getCategoryById = useCallback(
        (categoryId: string): CategoryBase | undefined => {
            return api.categories.find(
                (cat: CategoryBase) => cat.id === categoryId
            );
        },
        [api.categories]
    );

    /**
     * Ищет категории по названию или описанию
     *
     * @param {string} query - Поисковый запрос
     * @returns {CategoryBase[]} Массив найденных категорий
     *
     * @example
     * ```tsx
     * const results = searchCategories('документ');
     * console.log(`Найдено ${results.length} категорий`);
     * ```
     */
    const searchCategories = useCallback(
        (query: string): CategoryBase[] => {
            if (!query.trim()) return api.categories;

            const lowerQuery = query.toLowerCase();
            return api.categories.filter(
                (cat: CategoryBase) =>
                    cat.name.toLowerCase().includes(lowerQuery) ||
                    (cat.description &&
                        cat.description.toLowerCase().includes(lowerQuery))
            );
        },
        [api.categories]
    );

    // Автоматическая очистка при размонтировании
    useEffect(() => {
        return () => {
            setError(null);
            setSuccess(null);
            setCurrentOperation(null);
        };
    }, []);

    return {
        categories: api.categories,
        error: api.error,
        isLoading: api.isLoading,
        createCategory,
        updateCategory,
        deleteCategory,
        operationError: error,
        operationSuccess: success,
        operationLoading: isLoading,
        currentOperation,
        getCategoryById,
        searchCategories,
        clearMessages,
        refetch: api.refetch,
    };
};
