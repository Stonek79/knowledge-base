import {
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    Typography,
} from '@mui/material';

import { UserWithProfile } from '@/lib/types/user';

interface ProfileViewProps {
    profile: UserWithProfile;
    onEdit: () => void;
    onChangePassword: () => void;
}

/**
 * Компонент для отображения данных профиля в режиме просмотра.
 */
export function ProfileView({ profile, onEdit, onChangePassword }: ProfileViewProps) {
    const visibility = profile.profile?.visibilitySettings;

    return (
        <Card>
            <CardHeader
                title={`Профиль пользователя: ${profile.username}`}
                action={
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button onClick={onChangePassword} variant='outlined'>
                            Сменить пароль
                        </Button>
                        <Button onClick={onEdit} variant='contained'>
                            Редактировать
                        </Button>
                    </Box>
                }
            />
            <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {visibility?.fullName !== false && (
                        <Typography>
                            <b>Полное имя:</b>{' '}
                            {profile.profile?.fullName || <i>не заполнено</i>}
                        </Typography>
                    )}
                    {visibility?.jobTitle !== false && (
                        <Typography>
                            <b>Должность:</b>{' '}
                            {profile.profile?.jobTitle || <i>не заполнено</i>}
                        </Typography>
                    )}
                    {visibility?.email !== false && (
                        <Typography>
                            <b>Email:</b>{' '}
                            {profile.profile?.email || <i>не заполнено</i>}
                        </Typography>
                    )}
                    {visibility?.birthday !== false && (
                        <Typography>
                            <b>Дата рождения:</b>{' '}
                            {profile.profile?.birthday ? (
                                new Date(
                                    profile.profile.birthday
                                ).toLocaleDateString('ru-RU')
                            ) : (
                                <i>не заполнено</i>
                            )}
                        </Typography>
                    )}
                    {visibility?.phoneMobile !== false && (
                        <Typography>
                            <b>Мобильный телефон:</b>{' '}
                            {profile.profile?.phoneMobile || <i>не заполнено</i>}
                        </Typography>
                    )}
                    {visibility?.phoneCity !== false && (
                        <Typography>
                            <b>Городской телефон:</b>{' '}
                            {profile.profile?.phoneCity || <i>не заполнено</i>}
                        </Typography>
                    )}
                    {visibility?.phoneInternal !== false && (
                        <Typography>
                            <b>Внутренний телефон:</b>{' '}
                            {profile.profile?.phoneInternal || <i>не заполнено</i>}
                        </Typography>
                    )}
                    {visibility?.manager !== false && (
                        <Typography>
                            <b>Руководитель:</b>{' '}
                            {profile.profile?.manager || <i>не заполнено</i>}
                        </Typography>
                    )}
                    {visibility?.aboutMe !== false && (
                        <Typography>
                            <b>О себе:</b>{' '}
                            {profile.profile?.aboutMe || <i>не заполнено</i>}
                        </Typography>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
}
