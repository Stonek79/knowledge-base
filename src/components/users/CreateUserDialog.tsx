'use client'

import { zodResolver } from '@hookform/resolvers/zod'
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
} from '@mui/material'
import { useId, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { PasswordField } from '@/components/auth/PasswordField'
import {
    USER_ROLES,
    USER_ROLES_LABELS,
    USER_STATUSES,
    USER_STATUSES_LABELS,
} from '@/constants/user'
import { createUser } from '@/lib/actions/users'
import { createUserSchema } from '@/lib/schemas/user'
import type { CreateUserData } from '@/lib/types/user'

interface CreateUserDialogProps {
    open: boolean
    onClose: () => void
    onSuccess: () => void
}

export function CreateUserDialog({
    open,
    onClose,
    onSuccess,
}: CreateUserDialogProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const passId = useId()
    const confirmPassId = useId()

    const {
        control,
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(createUserSchema),
    })

    const onSubmit = async (data: CreateUserData) => {
        setIsLoading(true)
        setError(null)

        try {
            await createUser(data)
            reset()
            onSuccess()
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message)
            } else {
                setError('Произошла неизвестная ошибка')
            }
        } finally {
            setIsLoading(false)
        }
    }

    const handleClose = () => {
        reset()
        setError(null)
        onClose()
    }

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

                    <Controller
                        name='password'
                        control={control}
                        defaultValue=''
                        render={({ field }) => (
                            <PasswordField
                                {...field}
                                id={passId}
                                name='password'
                                label='Пароль'
                                autoCompletePolicy='new-password'
                                error={!!errors.password}
                                helperText={errors.password?.message}
                            />
                        )}
                    />
                    <Controller
                        name='confirmPassword'
                        control={control}
                        defaultValue=''
                        render={({ field }) => (
                            <PasswordField
                                {...field}
                                id={confirmPassId}
                                name='confirmPassword'
                                label='Подтверждение пароля'
                                autoCompletePolicy='new-password'
                                error={!!errors.confirmPassword}
                                helperText={errors.confirmPassword?.message}
                            />
                        )}
                    />

                    <FormControl fullWidth margin='normal'>
                        <InputLabel>Роль</InputLabel>
                        <Select
                            {...register('role')}
                            label='Роль'
                            defaultValue={USER_ROLES.USER}
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
                    <FormControl fullWidth margin='normal'>
                        <InputLabel>Статус</InputLabel>
                        <Select
                            {...register('status')}
                            label='Статус'
                            defaultValue={USER_STATUSES.ACTIVE}
                        >
                            <MenuItem value={USER_STATUSES.ACTIVE}>
                                {USER_STATUSES_LABELS.ACTIVE}
                            </MenuItem>
                            <MenuItem value={USER_STATUSES.PLACEHOLDER}>
                                {USER_STATUSES_LABELS.PLACEHOLDER}
                            </MenuItem>
                        </Select>
                    </FormControl>
                    <FormControlLabel
                        control={<Switch {...register('enabled')} />}
                        label='Доверенный пользователь'
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
                        {isLoading ? 'Создание...' : 'Создать'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    )
}
