'use client';

import { useState } from 'react';

import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography,
} from '@mui/material';

import { DocumentWithAuthor } from '@/lib/types/document';

interface DeleteDocumentDialogProps {
    open: boolean;
    document: DocumentWithAuthor | null;
    onClose: () => void;
    onConfirm: (documentId: string) => Promise<void>;
}

/**
 * Диалог подтверждения удаления документа
 *
 * @description Запрашивает подтверждение удаления документа:
 * - Отображает информацию о документе
 * - Предупреждает о необратимости действия
 * - Обрабатывает ошибки удаления
 */
export function DeleteDocumentDialog({
    open,
    document,
    onClose,
    onConfirm,
}: DeleteDocumentDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDelete = async () => {
        if (!document) return;

        setIsLoading(true);
        setError(null);

        try {
            await onConfirm(document.id);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Ошибка удаления документа'
            );
        } finally {
            setIsLoading(false);
        }
    };

    // Очищаем ошибку при открытии/закрытии диалога
    const handleClose = () => {
        setError(null);
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
            <DialogTitle>Удалить документ</DialogTitle>
            <DialogContent>
                {error && (
                    <Alert severity='error' sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {document && (
                    <Typography>
                        Вы уверены, что хотите удалить документ{' '}
                        <strong>{document.title}</strong>?
                    </Typography>
                )}

                <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ mt: 1 }}
                >
                    Это действие нельзя отменить. Документ будет удален
                    навсегда.
                </Typography>
            </DialogContent>

            <DialogActions>
                <Button onClick={handleClose} disabled={isLoading}>
                    Отмена
                </Button>
                <Button
                    onClick={handleDelete}
                    variant='contained'
                    color='error'
                    disabled={isLoading}
                >
                    {isLoading ? 'Удаление...' : 'Удалить'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
