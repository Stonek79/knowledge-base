import { useState } from 'react';

import {
    API_DOCUMENTS_COMPOSE_COMMIT_PATH,
    API_DOCUMENTS_PATH,
    API_DOCUMENTS_STAGE_PATH,
} from '@/constants/api';
import { api } from '@/lib/api/apiHelper';
import type { ComposeChangeSet } from '@/lib/types/compose';
import { SupportedMime } from '@/lib/types/mime';

export const useDocumentMutation = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Фаза 1: Загружает файл во временное хранилище.
     * @param file - Файл для загрузки.
     * @returns Объект с временным ключом и метаданными.
     */
    const stageFile = async (file: File) => {
        const fd = new FormData();
        fd.append('file', file);
        return api.post<{
            tempKey: string;
            originalName: string;
            mimeType: SupportedMime;
            size: number;
        }>(API_DOCUMENTS_STAGE_PATH, fd);
    };

    /**
     * Фаза 2: Отправляет "пакет" изменений для создания или обновления документа.
     * @param documentId - ID документа для обновления. Если null, создаётся новый документ.
     * @param changeSet - JSON-объект с инструкциями по изменениям.
     * @returns Результат операции.
     */
    const commit = async (
        documentId: string | null,
        changeSet: ComposeChangeSet
    ) => {
        setIsLoading(true);
        setError(null);
        try {
            const url = documentId
                ? `${API_DOCUMENTS_PATH}/${documentId}/compose/commit`
                : API_DOCUMENTS_COMPOSE_COMMIT_PATH;

            return await api.post<{ status: 'ok'; docId: string }>(
                url,
                changeSet
            );
        } catch (err) {
            const message =
                err instanceof Error ? err.message : 'Неизвестная ошибка';
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Удаляет документ.
     * @param documentId - ID документа для удаления.
     */
    const deleteDocument = async (documentId: string) => {
        setIsLoading(true);
        setError(null);
        try {
            return await api.del(`${API_DOCUMENTS_PATH}/${documentId}`);
        } catch (err) {
            const message =
                err instanceof Error ? err.message : 'Неизвестная ошибка';
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        stageFile,
        commit,
        deleteDocument,
        isLoading,
        error,
        clearError: () => setError(null),
    };
};
