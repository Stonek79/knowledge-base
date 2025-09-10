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

import { deleteUser } from '@/lib/actions/users';
import { UserWithDocuments } from '@/lib/types/user';

interface DeleteUserDialogProps {
    open: boolean;
    user: UserWithDocuments;
    onClose: () => void;
    onSuccess: () => void;
}

export function DeleteUserDialog({
    open,
    user,
    onClose,
    onSuccess,
}: DeleteUserDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDelete = async () => {
        setIsLoading(true);
        setError(null);

        try {
            await deleteUser(user.id);
            onSuccess();
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Произошла неизвестная ошибка');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
            <DialogTitle>Удалить пользователя</DialogTitle>
            <DialogContent>
                {error && (
                    <Alert severity='error' sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                <Typography>
                    Вы уверены, что хотите удалить пользователя{' '}
                    <strong>{user.username}</strong>?
                </Typography>
                <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ mt: 1 }}
                >
                    Это действие нельзя отменить.
                </Typography>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} disabled={isLoading}>
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
