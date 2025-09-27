'use client';

import {
    Control,
    Controller,
    UseFormSetValue,
    useForm,
    useFormContext,
    useWatch,
} from 'react-hook-form';

import { useEffect, useRef } from 'react';

import {
    Autocomplete,
    Box,
    Checkbox,
    Chip,
    CircularProgress,
    FormControlLabel,
    TextField,
    Typography,
} from '@mui/material';

import { UploadFormInput } from '@/lib/types/document';
import { UserResponse, UserWithDocuments } from '@/lib/types/user';

interface ConfidentialAccessControlProps {
    control: Control<UploadFormInput>;
    disabled?: boolean;
    setValue: UseFormSetValue<UploadFormInput>;
    currentUser: UserResponse | null;
    users: UserWithDocuments[];
    usersLoading: boolean;
}

export function ConfidentialAccessControl({
    control,
    disabled,
    setValue,
    currentUser,
    users,
    usersLoading,
}: ConfidentialAccessControlProps) {
    const isConfidential = useWatch({ control, name: 'isConfidential' });
    const autoFilledRef = useRef(false);

    const selectedIds =
        useWatch({ control, name: 'confidentialAccessUserIds' }) ?? [];

    const options = currentUser
        ? [currentUser, ...users.filter(u => u.id !== currentUser.id)]
        : users;

    useEffect(() => {
        if (!currentUser) return;

        if (isConfidential === false) {
            setValue('confidentialAccessUserIds', []);
            autoFilledRef.current = false;
            return;
        }

        // Автозаполнение один раз: текущий пользователь + все enabled
        if (
            !autoFilledRef.current &&
            selectedIds.length === 0 &&
            users.length > 0
        ) {
            const enabledIds = users.filter(u => u.enabled).map(u => u.id);
            const preselected = Array.from(
                new Set([currentUser.id, ...enabledIds])
            );
            setValue('confidentialAccessUserIds', preselected, {
                shouldDirty: true,
            });
            autoFilledRef.current = true;
            return;
        }

        // Гарантируем, что текущий пользователь всегда выбран
        if (isConfidential && !selectedIds.includes(currentUser.id)) {
            setValue(
                'confidentialAccessUserIds',
                [...selectedIds, currentUser.id],
                { shouldDirty: true }
            );
        }
    }, [isConfidential, selectedIds, currentUser, users, setValue]);

    return (
        <Box
            sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                p: 2,
                mt: 2,
            }}
        >
            <Controller
                name='isConfidential'
                control={control}
                render={({ field }) => (
                    <FormControlLabel
                        control={
                            <Checkbox
                                {...field}
                                checked={field.value}
                                disabled={disabled}
                            />
                        }
                        label='Конфиденциальный документ'
                    />
                )}
            />
            <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                Если опция включена, доступ к документу будет только у автора и
                пользователей из списка ниже.
            </Typography>

            <Controller
                name='confidentialAccessUserIds'
                control={control}
                render={({ field }) => (
                    <Autocomplete
                        multiple
                        disabled={!isConfidential || disabled}
                        loading={usersLoading}
                        options={options}
                        getOptionLabel={option => option.username}
                        isOptionEqualToValue={(o, v) => o.id === v.id}
                        filterSelectedOptions
                        disableCloseOnSelect
                        getOptionDisabled={o =>
                            !!currentUser && o.id === currentUser.id
                        }
                        value={options.filter(u =>
                            (field.value ?? []).includes(u.id)
                        )}
                        onChange={(e, newValue) => {
                            const ensured = currentUser
                                ? [
                                      currentUser,
                                      ...newValue.filter(
                                          u => u.id !== currentUser.id
                                      ),
                                  ]
                                : newValue;
                            field.onChange(ensured.map(u => u.id));
                        }}
                        renderInput={params => (
                            <TextField
                                {...params}
                                variant='outlined'
                                label='Список доступа'
                                placeholder='Добавить пользователя...'
                            />
                        )}
                    />
                )}
            />
        </Box>
    );
}
