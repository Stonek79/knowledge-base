'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { MouseEvent, useState } from 'react';

import { VisibilityOff } from '@mui/icons-material';
import { Visibility } from '@mui/icons-material';
import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    IconButton,
    InputAdornment,
    InputLabel,
    MenuItem,
    Select,
    TextField,
} from '@mui/material';

import { USER_ROLES, USER_ROLES_LABELS } from '@/constants/user';
import { createUser } from '@/lib/actions/users';
import { createUserSchema } from '@/lib/schemas/user';
import { CreateUserData } from '@/lib/types/user';

interface CreateUserDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function CreateUserDialog({
    open,
    onClose,
    onSuccess,
}: CreateUserDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const handleClickShowPassword = () => setShowPassword(show => !show);
    const handleMouseDownPassword = (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
    };

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(createUserSchema),
    });

    const onSubmit = async (data: CreateUserData) => {
        setIsLoading(true);
        setError(null);

        try {
            await createUser(data);
            reset();
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

    const handleClose = () => {
        reset();
        setError(null);
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
            <DialogTitle>Создать пользователя</DialogTitle>
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
                        {...register('password')}
                        label='Пароль'
                        type={showPassword ? 'text' : 'password'}
                        fullWidth
                        margin='normal'
                        error={!!errors.password}
                        helperText={errors.password?.message}
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <InputAdornment position='end'>
                                        <IconButton
                                            aria-label='Показать/скрыть пароль'
                                            onClick={handleClickShowPassword}
                                            onMouseDown={
                                                handleMouseDownPassword
                                            }
                                            edge='end'
                                        >
                                            {showPassword ? (
                                                <VisibilityOff />
                                            ) : (
                                                <Visibility />
                                            )}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            },
                        }}
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
                        {isLoading ? 'Создание...' : 'Создать'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
