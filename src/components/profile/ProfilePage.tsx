'use client';

import { useState } from 'react';

import { Alert, Button, CircularProgress, Container } from '@mui/material';
import { useRouter } from 'next/navigation';


import { ApiHttpError } from '@/lib/api/apiHelper';
import { useProfile } from '@/lib/hooks/useProfile';
import { ProfileUpdate } from '@/lib/types/profile';

import { ProfileEditForm } from './ProfileEdit';
import { ProfileView } from './ProfileView';

/**
 * Контейнер для страницы профиля.
 * Управляет состоянием (просмотр/редактирование) и данными.
 */
export function ProfilePage() {
    const router = useRouter();
    const { profile, isLoading, error, updateProfile, mutate } = useProfile();
    const [isEditing, setIsEditing] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);

    const onSubmit = async (data: ProfileUpdate) => {
        console.log('[profilePage] onSubmit: ', data);
        try {
            setServerError(null);
            await updateProfile(data);
            setIsEditing(false);
            mutate();
        } catch (e) {
            if (e instanceof ApiHttpError) {
                setServerError(e.payload.message);
            } else if (e instanceof Error) {
                setServerError(e.message);
            } else {
                setServerError('Произошла неизвестная ошибка');
            }
        }
    };

    if (isLoading) {
        return <CircularProgress />;
    }

    if (error) {
        return <Alert severity='error'>{error.message}</Alert>;
    }

    if (!profile) {
        return <Alert severity='warning'>Профиль не найден.</Alert>;
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
                />
            )}
            <Button onClick={() => router.back()} sx={{ mt: 2 }}>
                Назад
            </Button>
        </Container>
    );
}
