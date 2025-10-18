'use client'

import {
    Alert,
    type AlertColor,
    Button,
    CircularProgress,
    Container,
    Snackbar,
} from '@mui/material'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { ApiHttpError } from '@/lib/api/apiHelper'
import { useProfile } from '@/lib/hooks/useProfile'
import type { ProfileUpdate } from '@/lib/types/profile'

import { ChangePasswordDialog } from './ChangePasswordDialog'
import { ProfileEditForm } from './ProfileEdit'
import { ProfileView } from './ProfileView'

/**
 * Контейнер для страницы профиля.
 * Управляет состоянием (просмотр/редактирование) и данными.
 */
export function ProfilePage() {
    const router = useRouter()
    const { profile, isLoading, error, updateProfile, mutate } = useProfile()
    const [isEditing, setIsEditing] = useState(false)
    const [isChangePasswordOpen, setChangePasswordOpen] = useState(false)
    const [serverError, setServerError] = useState<string | null>(null)
    const [snackbarOpen, setSnackbarOpen] = useState(false)
    const [snackbarSeverity, setSnackbarSeverity] =
        useState<AlertColor>('success')
    const [snackbarMessage, setSnackbarMessage] = useState('')

    const handleSnackbarClose = () => {
        setSnackbarOpen(false)
    }

    const onSubmit = async (data: ProfileUpdate) => {
        try {
            setServerError(null)
            await updateProfile(data)
            setIsEditing(false)
            mutate()
            setSnackbarOpen(true)
            setSnackbarSeverity('success')
            setSnackbarMessage('Профиль успешно обновлен')
        } catch (e) {
            if (e instanceof ApiHttpError) {
                setServerError(e.payload.message)
            } else if (e instanceof Error) {
                setServerError(e.message)
            } else {
                setServerError('Произошла неизвестная ошибка')
            }
        }
    }

    if (isLoading) {
        return <CircularProgress />
    }

    if (error) {
        return <Alert severity='error'>{error.message}</Alert>
    }

    if (!profile) {
        return <Alert severity='warning'>Профиль не найден.</Alert>
    }

    const successChangePassword = () => {
        setChangePasswordOpen(false)
        setSnackbarOpen(true)
        setSnackbarSeverity('success')
        setSnackbarMessage('Пароль успешно изменен')
    }

    return (
        <Container maxWidth='md' sx={{ py: 4 }}>
            {isEditing ? (
                <ProfileEditForm
                    profile={profile}
                    onSubmit={onSubmit}
                    onCancel={() => setIsEditing(false)}
                    serverError={serverError}
                />
            ) : (
                <ProfileView
                    profile={profile}
                    onEdit={() => setIsEditing(true)}
                    onChangePassword={() => setChangePasswordOpen(true)}
                />
            )}

            <ChangePasswordDialog
                open={isChangePasswordOpen}
                onClose={() => setChangePasswordOpen(false)}
                onSuccess={successChangePassword}
            />

            <Button onClick={() => router.back()} sx={{ mt: 2 }}>
                Назад
            </Button>
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={4000} // Автоматически скрывать через 4 секунд
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }} // Позиция
            >
                <Alert
                    onClose={handleSnackbarClose}
                    severity={snackbarSeverity}
                    sx={{ width: '100%' }}
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Container>
    )
}
