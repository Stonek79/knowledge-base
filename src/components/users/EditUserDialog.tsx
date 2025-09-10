'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { useState } from 'react';

import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    TextField,
} from '@mui/material';

import { USER_ROLES, USER_ROLES_LABELS } from '@/constants/user';
import { updateUser } from '@/lib/actions/users';
import { updateUserSchema } from '@/lib/schemas/user';
import { UpdateUserData, UserWithDocuments } from '@/lib/types/user';

interface EditUserDialogProps {
    open: boolean;
    user: UserWithDocuments;
    onClose: () => void;
    onSuccess: () => void;
}

export function EditUserDialog({
    open,
    user,
    onClose,
    onSuccess,
}: EditUserDialogProps) {
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isLoading },
    } = useForm({
        resolver: zodResolver(updateUserSchema),
        defaultValues: {
            username: user.username,
            role: user.role,
            newpassword: '',
        },
    });

    const handleClose = () => {
        reset();
        setError(null);
        onClose();
    };

    const onSubmit = async (data: UpdateUserData) => {
        setError(null);

        try {
            await updateUser(user.id, data);

            onSuccess();
            handleClose();
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Произошла неизвестная ошибка');
            }
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
            <DialogTitle>Редактировать пользователя</DialogTitle>
            <form onSubmit={handleSubmit(onSubmit)}>
                <DialogContent>
                    {error && (
                        <Alert severity='error' sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    <TextField
                        {...register('username')}
                        label='Имя пользователя'
                        fullWidth
                        margin='normal'
                        error={!!errors.username}
                        helperText={errors.username?.message}
                    />
                    <TextField
                        {...register('newpassword')}
                        label='Новый пароль'
                        fullWidth
                        margin='normal'
                        error={!!errors.newpassword}
                        helperText={errors.newpassword?.message}
                    />

                    <FormControl fullWidth margin='normal'>
                        <InputLabel>Роль</InputLabel>
                        <Select
                            {...register('role')}
                            label='Роль'
                            defaultValue={USER_ROLES.GUEST}
                        >
                            <MenuItem value={USER_ROLES.GUEST}>
                                {USER_ROLES_LABELS.GUEST}
                            </MenuItem>
                            <MenuItem value={USER_ROLES.USER}>
                                {USER_ROLES_LABELS.USER}
                            </MenuItem>
                            <MenuItem value={USER_ROLES.ADMIN}>
                                {USER_ROLES_LABELS.ADMIN}
                            </MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>

                <DialogActions>
                    <Button onClick={handleClose} disabled={isLoading}>
                        Отмена
                    </Button>
                    <Button
                        type='submit'
                        variant='contained'
                        disabled={isLoading}
                    >
                        {isLoading ? 'Сохранение...' : 'Сохранить'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
