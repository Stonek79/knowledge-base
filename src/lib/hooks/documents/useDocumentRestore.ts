import { useState } from 'react';

import { API_DOCUMENTS_PATH } from '@/constants/api';
import { api } from '@/lib/api/apiHelper';

export const useDocumentRestore = () => {
    const [isRestoring, setIsRestoring] = useState(false);
    const [restoreError, setRestoreError] = useState<string | null>(null);

    const restoreDocument = async (documentId: string) => {
        setIsRestoring(true);
        setRestoreError(null);

        try {
            return await api.post(
                `${API_DOCUMENTS_PATH}/${documentId}/restore`
            );
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'Неизвестная ошибка';
            setRestoreError(message);
            throw error;
        } finally {
            setIsRestoring(false);
        }
    };

    return {
        restoreDocument,
        isRestoring,
        restoreError,
        clearError: () => setRestoreError(null),
    };
};
