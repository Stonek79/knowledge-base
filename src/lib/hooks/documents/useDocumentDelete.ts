import { useState } from 'react'

import { API_DOCUMENTS_PATH } from '@/constants/api'
import { api } from '@/lib/api/apiHelper'

export const useDocumentDelete = () => {
    const [isDeleting, setIsDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)

    const deleteDocument = async (
        documentId: string,
        options?: { hard?: boolean }
    ) => {
        setIsDeleting(true)
        setDeleteError(null)

        const url = options?.hard
            ? `${API_DOCUMENTS_PATH}/${documentId}?hard=true`
            : `${API_DOCUMENTS_PATH}/${documentId}`

        try {
            return await api.del(url)
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'Неизвестная ошибка'
            setDeleteError(message)
            throw error
        } finally {
            setIsDeleting(false)
        }
    }

    return {
        deleteDocument,
        isDeleting,
        deleteError,
        clearError: () => setDeleteError(null),
    }
}
