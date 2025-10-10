'use client';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
} from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';



import { useChangePassword } from '@/lib/hooks/useChangePassword';
import { changePasswordSchema } from '@/lib/schemas/profile';
import { ChangePasswordFormData } from '@/lib/types/profile';


interface ChangePasswordDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function ChangePasswordDialog({
    open,
    onClose,
    onSuccess,
}: ChangePasswordDialogProps) {
    const { isLoading, error, changePassword } = useChangePassword();


    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ChangePasswordFormData>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: {
            oldPassword: '',
            newPassword: '',
            confirmPassword: '',
        },
    });

    const handleClose = () => {
        reset();
        onClose();
    };

    const onSubmit = async (data: ChangePasswordFormData) => {
        const success = await changePassword(data);

        if (success) {
            handleClose();
            onSuccess();
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth='sm'>
            <form onSubmit={handleSubmit(onSubmit)}>
                <DialogTitle>Смена пароля</DialogTitle>
                <DialogContent>
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                            pt: 1,
                        }}
                    >
                        {error && <Alert severity='error'>{error}</Alert>}
                        <Controller
                            name='oldPassword'
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    type='password'
                                    label='Текущий пароль'
                                    error={!!errors.oldPassword}
                                    helperText={errors.oldPassword?.message}
                                    fullWidth
                                />
                            )}
                        />
                        <Controller
                            name='newPassword'
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    type='password'
                                    label='Новый пароль'
                                    error={!!errors.newPassword}
                                    helperText={errors.newPassword?.message}
                                    fullWidth
                                />
                            )}
                        />
                        <Controller
                            name='confirmPassword'
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    type='password'
                                    label='Повторите новый пароль'
                                    error={!!errors.confirmPassword}
                                    helperText={errors.confirmPassword?.message}
                                    fullWidth
                                />
                            )}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Отмена</Button>
                    <Button
                        type='submit'
                        variant='contained'
                        loading={isLoading}
                    >
                        Сохранить
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
