'use client';

import { useState } from 'react';

import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography,
} from '@mui/material';

import { DocumentStatus } from '@/lib/types/document';

interface DeleteDocumentDialogProps {
    open: boolean;
    document: { id: string; title: string; deletedAt: boolean } | null;
    view: DocumentStatus;
    onClose: () => void;
    onSoftDelete?: (documentId: string) => Promise<void>;
    onHardDelete?: (documentId: string) => Promise<void>;
    onRestore?: (documentId: string) => Promise<void>;
    isAdmin?: boolean;
}

export function DeleteDocumentDialog({
    open,
    document,
    view,
    onClose,
    onSoftDelete,
    onHardDelete,
    onRestore,
    isAdmin = false,
}: DeleteDocumentDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAction = async (
        action: 'softDelete' | 'hardDelete' | 'restore'
    ) => {
        if (!document) return;

        const actionMap = {
            softDelete: onSoftDelete,
            hardDelete: onHardDelete,
            restore: onRestore,
        };

        const actionToRun = actionMap[action];
        if (!actionToRun) return;

        setIsLoading(true);
        setError(null);

        try {
            await actionToRun(document.id);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : `Ошибка выполнения действия`
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setError(null);
        onClose();
    };

    const isDeletedView = view === 'deleted';

    return (
        <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
            <DialogTitle>
                {isDeletedView ? 'Действия с документом' : 'Удаление документа'}
            </DialogTitle>
            <DialogContent>
                {error && (
                    <Alert severity='error' sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {document && (
                    <Typography>
                        {isDeletedView
                            ? 'Документ находится в корзине. Вы можете восстановить его или удалить навсегда.'
                            : `Вы уверены, что хотите переместить документ в корзину?`}
                    </Typography>
                )}
                <Typography variant='h6' sx={{ mt: 2 }}>
                    <strong>{document?.title}</strong>
                </Typography>
            </DialogContent>

            <DialogActions sx={{ p: '16px 24px' }}>
                <Button onClick={handleClose} disabled={isLoading}>
                    Отмена
                </Button>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {isDeletedView ? (
                        // Кнопки для документа в корзине
                        <Button
                            onClick={() => handleAction('restore')}
                            variant='outlined'
                            color='primary'
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <CircularProgress size={24} />
                            ) : (
                                'Восстановить'
                            )}
                        </Button>
                    ) : (
                        // Кнопка для активного документа
                        <Button
                            onClick={() => handleAction('softDelete')}
                            variant='outlined'
                            color='primary'
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <CircularProgress size={24} />
                            ) : (
                                'В корзину'
                            )}
                        </Button>
                    )}
                    {/* Кнопка безвозвратного удаления */}
                    {isAdmin && (
                        <Button
                            onClick={() => handleAction('hardDelete')}
                            variant='contained'
                            color='error'
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <CircularProgress size={24} />
                            ) : (
                                'Удалить навсегда'
                            )}
                        </Button>
                    )}
                </Box>
            </DialogActions>
        </Dialog>
    );
}
