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
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : 'Неизвестная ошибка';
                setError(errorMessage);
                throw err;
            } finally {
                setIsLoading(false);
                setCurrentOperation(null);
            }
        },
        []
    );

    const onCreateCategory = useCallback(
        async (data: CreateCategoryData) => {
            return executeOperation(
                'create',
                () => api.createCategoryApi(data),
                'Категория успешно создана'
            );
        },
        [api, executeOperation]
    );

    const onUpdateCategory = useCallback(
        async (data: UpdateCategoryData) => {
            return executeOperation(
                'update',
                () => api.updateCategoryApi(data),
                'Категория успешно обновлена'
            );
        },
        [api, executeOperation]
    );

    const onDeleteCategory = useCallback(
        async (categoryId: string) => {
            return executeOperation(
                'delete',
                () => api.deleteCategoryApi(categoryId),
                'Категория успешно удалена'
            );
        },
        [api, executeOperation]
    );

    const createCategory = useCallback(
        (data: CreateCategoryData) => onCreateCategory(data),
        [onCreateCategory]
    );

    const updateCategory = useCallback(
        (data: UpdateCategoryData) => onUpdateCategory(data),
        [onUpdateCategory]
    );

    const deleteCategory = useCallback(
        (categoryId: string) => onDeleteCategory(categoryId),
        [onDeleteCategory]
    );

    const clearMessages = useCallback(() => {
        setError(null);
        setSuccess(null);
    }, []);

    const getCategoryById = useCallback(
        (categoryId: string): CategoryBase | undefined => {
            return api.categories.find(
                (cat: CategoryBase) => cat.id === categoryId
            );
        },
        [api.categories]
    );

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
