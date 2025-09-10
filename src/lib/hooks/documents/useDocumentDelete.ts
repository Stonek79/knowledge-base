import { useState } from 'react';

import { API_DOCUMENTS_PATH } from '@/constants/api';
import { api } from '@/lib/api/apiHelper';

export const useDocumentDelete = () => {
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const deleteDocument = async (documentId: string) => {
        setIsDeleting(true);
        setDeleteError(null);

        try {
            return await api.del(`${API_DOCUMENTS_PATH}/${documentId}`);
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'Неизвестная ошибка';
            setDeleteError(message);
            throw error;
        } finally {
            setIsDeleting(false);
        }
    };

    return {
        deleteDocument,
        isDeleting,
        deleteError,
        clearError: () => setDeleteError(null),
    };
};
