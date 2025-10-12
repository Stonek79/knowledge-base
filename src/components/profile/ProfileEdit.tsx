import { zodResolver } from '@hookform/resolvers/zod';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    FormControlLabel,
    Switch,
    TextField,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { Controller, useForm } from 'react-hook-form';


import { profileVisibilityDefaults } from '@/constants/user';
import { profileUpdateSchema } from '@/lib/schemas/profile';
import { ProfileUpdate } from '@/lib/types/profile';
import { UserWithProfile } from '@/lib/types/user';
import {
    formatCityPhone,
    formatInternalPhone,
    formatPhoneNumber,
} from '@/utils/phoneFormatter';

interface ProfileEditProps {
    profile: UserWithProfile;
    onSubmit: (data: ProfileUpdate) => Promise<void>;
    onCancel: () => void;
    serverError: string | null;
}

/**
 * Компонент с формой для редактирования профиля пользователя.
 */
export function ProfileEditForm({
    profile,
    onSubmit,
    onCancel,
    serverError,
}: ProfileEditProps) {
    const { control, handleSubmit } = useForm<ProfileUpdate>({
        resolver: zodResolver(profileUpdateSchema),
        defaultValues: {
            fullName: profile.profile?.fullName || '',
            jobTitle: profile.profile?.jobTitle || '',
            email: profile.profile?.email || '',
            phoneCity: profile.profile?.phoneCity || '',
            phoneInternal: profile.profile?.phoneInternal || '',
            phoneMobile: profile.profile?.phoneMobile || '',
            aboutMe: profile.profile?.aboutMe || '',
            birthday: profile.profile?.birthday
                ? new Date(profile.profile.birthday)
                : undefined,
            manager: profile.profile?.manager || '',
            visibilitySettings: {
                ...profileVisibilityDefaults,
                ...profile.profile?.visibilitySettings,
            },
        },
    });

    return (
        <Card>
            <CardHeader
                title={`Редактирование профиля: ${profile.username}`}
                action={<Button onClick={onCancel}>Отмена</Button>}
            />
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)}>
                    {serverError && (
                        <Alert severity='error' sx={{ mb: 2 }}>
                            {serverError}
                        </Alert>
                    )}
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                        }}
                    >
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Controller
                                name='fullName'
                                control={control}
                                render={({ field, fieldState }) => (
                                    <TextField
                                        {...field}
                                        sx={{ width: '100%' }}
                                        label='Полное имя'
                                        fullWidth
                                        error={!!fieldState.error}
                                        helperText={fieldState.error?.message}
                                    />
                                )}
                            />
                            <Controller
                                name='visibilitySettings.fullName'
                                control={control}
                                render={({ field }) => (
                                    <FormControlLabel
                                        sx={{ flex: '0 0 160px' }}
                                        control={
                                            <Switch
                                                {...field}
                                                checked={field.value}
                                            />
                                        }
                                        label={
                                            field.value
                                                ? 'Показывать'
                                                : 'Скрывать'
                                        }
                                    />
                                )}
                            />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Controller
                                name='jobTitle'
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label='Должность'
                                        fullWidth
                                    />
                                )}
                            />
                            <Controller
                                name='visibilitySettings.jobTitle'
                                control={control}
                                render={({ field }) => (
                                    <FormControlLabel
                                        sx={{ flex: '0 0 160px' }}
                                        control={
                                            <Switch
                                                {...field}
                                                checked={field.value}
                                            />
                                        }
                                        label={
                                            field.value
                                                ? 'Показывать'
                                                : 'Скрывать'
                                        }
                                    />
                                )}
                            />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Controller
                                name='email'
                                control={control}
                                render={({ field, fieldState }) => (
                                    <TextField
                                        {...field}
                                        label='Email'
                                        fullWidth
                                        error={!!fieldState.error}
                                        helperText={fieldState.error?.message}
                                    />
                                )}
                            />
                            <Controller
                                name='visibilitySettings.email'
                                control={control}
                                render={({ field }) => (
                                    <FormControlLabel
                                        sx={{ flex: '0 0 160px' }}
                                        control={
                                            <Switch
                                                {...field}
                                                checked={field.value}
                                            />
                                        }
                                        label={
                                            field.value
                                                ? 'Показывать'
                                                : 'Скрывать'
                                        }
                                    />
                                )}
                            />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Controller
                                name='birthday'
                                control={control}
                                render={({ field, fieldState }) => (
                                    <DatePicker
                                        sx={{ width: '100%' }}
                                        label='Дата рождения'
                                        value={dayjs(field.value)}
                                        onChange={value => {
                                            field.onChange(
                                                dayjs(value).toDate() ??
                                                    undefined
                                            );
                                        }}
                                        slotProps={{
                                            textField: {
                                                error: !!fieldState.error,
                                                helperText:
                                                    fieldState.error?.message,
                                            },
                                        }}
                                    />
                                )}
                            />
                            <Controller
                                name='visibilitySettings.birthday'
                                control={control}
                                render={({ field }) => (
                                    <FormControlLabel
                                        sx={{ flex: '0 0 160px' }}
                                        control={
                                            <Switch
                                                {...field}
                                                checked={field.value}
                                            />
                                        }
                                        label={
                                            field.value
                                                ? 'Показывать'
                                                : 'Скрывать'
                                        }
                                    />
                                )}
                            />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Controller
                                name='phoneMobile'
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label='Мобильный телефон'
                                        fullWidth
                                        onChange={e => {
                                            //функция форматирования сама обрабатывает неполный ввод
                                            field.onChange(
                                                formatPhoneNumber(
                                                    e.target.value
                                                )
                                            );
                                        }}
                                        placeholder='Ввести 11 цифр без пробелов и других символов'
                                    />
                                )}
                            />
                            <Controller
                                name='visibilitySettings.phoneMobile'
                                control={control}
                                render={({ field }) => (
                                    <FormControlLabel
                                        sx={{ flex: '0 0 160px' }}
                                        control={
                                            <Switch
                                                {...field}
                                                checked={field.value}
                                            />
                                        }
                                        label={
                                            field.value
                                                ? 'Показывать'
                                                : 'Скрывать'
                                        }
                                    />
                                )}
                            />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Controller
                                name='phoneCity'
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label='Городской телефон'
                                        fullWidth
                                        onChange={e => {
                                            field.onChange(
                                                formatCityPhone(e.target.value)
                                            );
                                        }}
                                        placeholder='Ввести 10 цифр без пробелов и других символов'
                                    />
                                )}
                            />
                            <Controller
                                name='visibilitySettings.phoneCity'
                                control={control}
                                render={({ field }) => (
                                    <FormControlLabel
                                        sx={{ flex: '0 0 160px' }}
                                        control={
                                            <Switch
                                                {...field}
                                                checked={field.value}
                                            />
                                        }
                                        label={
                                            field.value
                                                ? 'Показывать'
                                                : 'Скрывать'
                                        }
                                    />
                                )}
                            />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Controller
                                name='phoneInternal'
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label='Внутренний телефон'
                                        fullWidth
                                        onChange={e => {
                                            field.onChange(
                                                formatInternalPhone(
                                                    e.target.value
                                                )
                                            );
                                        }}
                                        placeholder='Ввести 4 или 7 цифр без пробелов и других символов'
                                    />
                                )}
                            />
                            <Controller
                                name='visibilitySettings.phoneInternal'
                                control={control}
                                render={({ field }) => (
                                    <FormControlLabel
                                        sx={{ flex: '0 0 160px' }}
                                        control={
                                            <Switch
                                                {...field}
                                                checked={field.value}
                                            />
                                        }
                                        label={
                                            field.value
                                                ? 'Показывать'
                                                : 'Скрывать'
                                        }
                                    />
                                )}
                            />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Controller
                                name='manager'
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label='Руководитель'
                                        fullWidth
                                    />
                                )}
                            />
                            <Controller
                                name='visibilitySettings.manager'
                                control={control}
                                render={({ field }) => (
                                    <FormControlLabel
                                        sx={{ flex: '0 0 160px' }}
                                        control={
                                            <Switch
                                                {...field}
                                                checked={field.value}
                                            />
                                        }
                                        label={
                                            field.value
                                                ? 'Показывать'
                                                : 'Скрывать'
                                        }
                                    />
                                )}
                            />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Controller
                                name='aboutMe'
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label='О себе'
                                        multiline
                                        rows={4}
                                        fullWidth
                                    />
                                )}
                            />
                            <Controller
                                name='visibilitySettings.aboutMe'
                                control={control}
                                render={({ field }) => (
                                    <FormControlLabel
                                        sx={{ flex: '0 0 160px' }}
                                        control={
                                            <Switch
                                                {...field}
                                                checked={field.value}
                                            />
                                        }
                                        label={
                                            field.value
                                                ? 'Показывать'
                                                : 'Скрывать'
                                        }
                                    />
                                )}
                            />
                        </Box>
                    </Box>

                    <Box
                        sx={{
                            mt: 3,
                            display: 'flex',
                            justifyContent: 'flex-end',
                        }}
                    >
                        <Button type='submit' variant='contained'>
                            Сохранить
                        </Button>
                    </Box>
                </form>
            </CardContent>
        </Card>
    );
}
