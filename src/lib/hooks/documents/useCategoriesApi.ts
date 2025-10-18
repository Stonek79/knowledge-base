import useSWR from 'swr'

import { API_CATEGORIES_PATH } from '@/constants/api'
import { api, makeSWRFetcher } from '@/lib/api/apiHelper'
import type {
    CategoryBase,
    CategoryResponse,
    CreateCategoryData,
    CreateCategoryResult,
    DeleteCategoryResult,
    UpdateCategoryData,
    UpdateCategoryResult,
} from '@/lib/types/document'

const fetcher = makeSWRFetcher({ returnNullOn401: false })

/**
 * Хук для работы с API категорий документов
 *
 * @description Предоставляет базовые CRUD операции для категорий:
 * - Загрузка списка категорий с кэшированием через SWR
 * - Создание новых категорий
 * - Обновление существующих категорий
 * - Удаление категорий
 * - Оптимистичные обновления кэша
 *
 * @returns {Object} Объект с методами API и состоянием
 * @returns {CategoryBase[]} returns.categories - Список категорий
 * @returns {Error | null} returns.error - Ошибка загрузки данных
 * @returns {boolean} returns.isLoading - Состояние загрузки
 * @returns {Function} returns.createCategoryApi - Функция создания категории
 * @returns {Function} returns.updateCategoryApi - Функция обновления категории
 * @returns {Function} returns.deleteCategoryApi - Функция удаления категории
 * @returns {Function} returns.refetch - Функция принудительного обновления
 * @returns {Function} returns.mutate - Функция мутации кэша SWR
 *
 * @example
 * ```tsx
 * const { categories, createCategoryApi, isLoading } = useCategoriesApi();
 *
 * const handleCreate = async () => {
 *   await createCategoryApi({ name: 'Новая категория', description: 'Описание' });
 * };
 * ```
 */
export const useCategoriesApi = () => {
    const { data, error, isLoading, mutate } = useSWR<CategoryResponse>(
        API_CATEGORIES_PATH,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateIfStale: false,
            revalidateOnReconnect: false,
            dedupingInterval: 12 * 60 * 60 * 1000,
        }
    )

    const categories = data?.categories || []

    /**
     * Создает новую категорию
     *
     * @param {CreateCategoryData} data - Данные для создания категории
     * @param {string} data.name - Название категории (обязательно)
     * @param {string} [data.description] - Описание категории (опционально)
     * @param {string} [data.color] - Цвет категории в HEX формате (опционально)
     *
     * @returns {Promise<CreateCategoryResult>} Результат создания с сообщением и данными категории
     * @throws {Error} Ошибка при создании категории
     *
     * @example
     * ```tsx
     * const result = await createCategoryApi({
     *   name: 'Документы',
     *   description: 'Общие документы',
     *   color: '#FF5733'
     * });
     * console.log(result.message); // "Категория успешно создана"
     * ```
     */
    const createCategoryApi = async (
        data: CreateCategoryData
    ): Promise<CreateCategoryResult> => {
        const result = await api.post<CreateCategoryResult>(
            API_CATEGORIES_PATH,
            data
        )

        // Оптимистично обновляем кэш
        await mutate((currentData: CategoryResponse | undefined) => {
            if (!currentData) return currentData
            return {
                ...currentData,
                categories: [...currentData.categories, result.category].sort(
                    (a: CategoryBase, b: CategoryBase) =>
                        a.name.localeCompare(b.name)
                ),
            }
        }, false)

        return result
    }

    /**
     * Обновляет существующую категорию
     *
     * @param {UpdateCategoryData} data - Данные для обновления
     * @param {string} data.id - ID категории для обновления
     * @param {string} data.name - Новое название категории
     * @param {string} [data.description] - Новое описание категории
     * @param {string} [data.color] - Новый цвет категории
     *
     * @returns {Promise<UpdateCategoryResult>} Результат обновления
     * @throws {Error} Ошибка при обновлении категории
     *
     * @example
     * ```tsx
     * const result = await updateCategoryApi({
     *   id: 'cat-123',
     *   name: 'Обновленное название',
     *   description: 'Новое описание'
     * });
     * ```
     */
    const updateCategoryApi = async (
        data: UpdateCategoryData
    ): Promise<UpdateCategoryResult> => {
        const result = await api.put<UpdateCategoryResult>(
            `${API_CATEGORIES_PATH}/${data.id}`,
            {
                name: data.name,
                description: data.description,
                color: data.color,
            }
        )

        await mutate((currentData: CategoryResponse | undefined) => {
            if (!currentData) return currentData
            return {
                ...currentData,
                categories: currentData.categories
                    .map((cat: CategoryBase) =>
                        cat.id === data.id
                            ? { ...cat, ...result.category }
                            : cat
                    )
                    .sort((a: CategoryBase, b: CategoryBase) =>
                        a.name.localeCompare(b.name)
                    ),
            }
        }, false)

        return result
    }

    /**
     * Удаляет категорию по ID
     *
     * @param {string} categoryId - ID категории для удаления
     *
     * @returns {Promise<DeleteCategoryResult>} Результат удаления
     * @throws {Error} Ошибка при удалении категории
     *
     * @example
     * ```tsx
     * const result = await deleteCategoryApi('cat-123');
     * console.log(result.message); // "Категория успешно удалена"
     * ```
     */
    const deleteCategoryApi = async (
        categoryId: string
    ): Promise<DeleteCategoryResult> => {
        const result = await api.del<DeleteCategoryResult>(
            `${API_CATEGORIES_PATH}/${categoryId}`
        )

        await mutate((currentData: CategoryResponse | undefined) => {
            if (!currentData) return currentData
            return {
                ...currentData,
                categories: currentData.categories.filter(
                    (cat: CategoryBase) => cat.id !== categoryId
                ),
            }
        }, false)

        return result
    }

    return {
        categories,
        error,
        isLoading,
        createCategoryApi,
        updateCategoryApi,
        deleteCategoryApi,
        refetch: () => mutate(),
        mutate,
    }
}
