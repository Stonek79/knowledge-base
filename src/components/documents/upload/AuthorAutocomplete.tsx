'use client';

import {
    Control,
    Controller,
    FieldErrors,
    UseFormSetValue,
    useWatch,
} from 'react-hook-form';

import { Fragment, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import {
    Alert,
    Autocomplete,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    TextField,
} from '@mui/material';

import { USER_ROLES } from '@/constants/user';
import { UploadFormInput } from '@/lib/types/document';
import { UserWithDocuments } from '@/lib/types/user';

// Define a union type for the options to ensure type safety
type AuthorOption =
    | UserWithDocuments
    | { inputValue: string; username: string };

// Type guard to check if an option is the special "Add..." option
function isNewUserOption(
    option: unknown
): option is { inputValue: string; username: string } {
    return (
        typeof option === 'object' &&
        option !== null &&
        'inputValue' in option &&
        'username' in option
    );
}

interface AuthorAutocompleteProps {
    control: Control<UploadFormInput>;
    errors: FieldErrors<UploadFormInput>;
    setValue: UseFormSetValue<UploadFormInput>;
    users: UserWithDocuments[];
    disabled?: boolean;
}

export function AuthorAutocomplete({
    control,
    errors,
    setValue,
    users,
    disabled,
}: AuthorAutocompleteProps) {
    const [openDialog, setOpenDialog] = useState(false);
    const [dialogValue, setDialogValue] = useState('');
    const [dialogError, setDialogError] = useState<string | null>(null);

    const authorId = useWatch({ control, name: 'authorId' });
    const username = useWatch({ control, name: 'username' });

    const handleCloseDialog = () => {
        setDialogValue('');
        setDialogError(null);
        setOpenDialog(false);
    };

    const handleDialogSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const newName = dialogValue.trim();

        if (!newName) {
            setDialogError('Имя автора не может быть пустым.');
            return;
        }

        const isAdminName = users.some(
            u =>
                u.username.toLowerCase() === newName.toLowerCase() &&
                u.role === USER_ROLES.ADMIN
        );

        if (isAdminName) {
            setDialogError(
                'Это имя принадлежит администратору. Выберите другое имя.'
            );
            return;
        }

        setValue('username', newName, { shouldValidate: true });
        setValue('authorId', undefined);
        handleCloseDialog();
    };

    const autocompleteValue = useMemo(() => {
        if (authorId) {
            return users.find(u => u.id === authorId) || null;
        }
        if (username) {
            return username;
        }
        return null;
    }, [authorId, username, users]);

    return (
        <Fragment>
            <Controller<UploadFormInput>
                name='authorId' // Attach controller to the primary field for error display
                control={control}
                render={({ field }) => (
                    <Autocomplete<AuthorOption, false, false, true>
                        value={autocompleteValue}
                        onChange={(event, newValue) => {
                            if (!newValue) {
                                setValue('authorId', undefined);
                                setValue('username', undefined);
                                return;
                            }

                            if (typeof newValue === 'string') {
                                setTimeout(() => {
                                    setOpenDialog(true);
                                    setDialogValue(newValue);
                                });
                            } else if (isNewUserOption(newValue)) {
                                setOpenDialog(true);
                                setDialogValue(newValue.inputValue);
                            } else {
                                setValue('authorId', newValue.id, {
                                    shouldValidate: true,
                                });
                                setValue('username', undefined);
                            }
                        }}
                        filterOptions={(options, params) => {
                            const filtered: AuthorOption[] = options.filter(
                                option =>
                                    option.username
                                        .toLowerCase()
                                        .includes(
                                            params.inputValue.toLowerCase()
                                        )
                            );

                            const isExisting = options.some(
                                option =>
                                    option.username.toLowerCase() ===
                                    params.inputValue.toLowerCase()
                            );

                            if (params.inputValue !== '' && !isExisting) {
                                filtered.push({
                                    inputValue: params.inputValue,
                                    username: `Добавить "${params.inputValue}"`,
                                });
                            }

                            return filtered;
                        }}
                        options={users}
                        getOptionLabel={option => {
                            if (typeof option === 'string') return option;
                            return option.username;
                        }}
                        selectOnFocus
                        clearOnBlur
                        handleHomeEndKeys
                        renderOption={(props, option) => (
                            <li
                                {...props}
                                key={
                                    isNewUserOption(option)
                                        ? option.inputValue
                                        : option.id
                                }
                            >
                                {option.username}
                            </li>
                        )}
                        disabled={disabled}
                        freeSolo
                        renderInput={params => (
                            <TextField
                                {...params}
                                label='Автор'
                                error={!!errors.authorId || !!errors.username}
                                helperText={
                                    errors.authorId?.message ||
                                    errors.username?.message ||
                                    'Выберите из списка или введите новое имя'
                                }
                            />
                        )}
                    />
                )}
            />
            <Dialog open={openDialog} onClose={handleCloseDialog}>
                <form onSubmit={handleDialogSubmit}>
                    <DialogTitle>Добавить нового автора</DialogTitle>
                    <DialogContent>
                        {dialogError && (
                            <Alert severity='error' sx={{ mb: 2 }}>
                                {dialogError}
                            </Alert>
                        )}
                        <DialogContentText>
                            Вы уверены, что хотите добавить пользователя "
                            {dialogValue}"? Он будет создан со статусом
                            "Временный".
                        </DialogContentText>
                        <TextField
                            autoFocus
                            margin='dense'
                            id='name'
                            value={dialogValue}
                            onChange={event =>
                                setDialogValue(event.target.value)
                            }
                            label='Имя пользователя'
                            type='text'
                            variant='standard'
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog}>Отмена</Button>
                        <Button type='submit'>Добавить</Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Fragment>
    );
}
