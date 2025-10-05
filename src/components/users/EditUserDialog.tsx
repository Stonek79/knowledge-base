'use client';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    InputLabel,
    MenuItem,
    Select,
    Switch,
    TextField,
} from '@mui/material';
import { Controller, useForm } from 'react-hook-form';

import {
    USER_ROLES,
    USER_ROLES_LABELS,
    USER_STATUSES,
    USER_STATUSES_LABELS,
} from '@/constants/user';
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

    console.log('[EditUserDialog] user', user);

    const {
        register,
        handleSubmit,
        reset,
        control,
        formState: { errors, isLoading },
    } = useForm<UpdateUserData>({
        resolver: zodResolver(updateUserSchema),
        defaultValues: {
            username: user.username,
            role: user.role,
            status: user.status,
            enabled: user.enabled,
            newPassword: undefined,
            confirmNewPassword: undefined,
        },
    });

    const handleClose = () => {
        reset();
        setError(null);
        onClose();
    };

    const onSubmit = async (data: UpdateUserData) => {
        setError(null);

        console.log('[EditUserDialog] onSubmit', data);

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
                        {...register('newPassword')}
                        label='Новый пароль'
                        type='password'
                        fullWidth
                        margin='normal'
                        error={!!errors.newPassword}
                        helperText={errors.newPassword?.message}
                    />
                    <TextField
                        {...register('confirmNewPassword')}
                        label='Подтверждение пароля'
                        type='password'
                        fullWidth
                        margin='normal'
                        error={!!errors.confirmNewPassword}
                        helperText={errors.confirmNewPassword?.message}
                    />

                    <Controller
                        name='role'
                        control={control}
                        render={({ field }) => (
                            <FormControl fullWidth margin='normal'>
                                <InputLabel>Роль</InputLabel>
                                <Select {...field} label='Роль'>
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
                        )}
                    />

                    <Controller
                        name='status'
                        control={control}
                        render={({ field }) => (
                            <FormControl fullWidth margin='normal'>
                                <InputLabel>Статус</InputLabel>
                                <Select {...field} label='Статус'>
                                    <MenuItem value={USER_STATUSES.ACTIVE}>
                                        {USER_STATUSES_LABELS.ACTIVE}
                                    </MenuItem>
                                    <MenuItem value={USER_STATUSES.PLACEHOLDER}>
                                        {USER_STATUSES_LABELS.PLACEHOLDER}
                                    </MenuItem>
                                </Select>
                            </FormControl>
                        )}
                    />

                    <Controller
                        name='enabled'
                        control={control}
                        render={({ field }) => (
                            <FormControlLabel
                                control={
                                    <Switch {...field} checked={field.value} />
                                }
                                label='Доверенный пользователь'
                            />
                        )}
                    />
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
