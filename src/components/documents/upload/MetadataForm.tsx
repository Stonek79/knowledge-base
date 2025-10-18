'use client'

import {
    Box,
    Chip,
    FormControl,
    FormHelperText,
    Grid,
    InputLabel,
    MenuItem,
    OutlinedInput,
    Select,
    TextField,
} from '@mui/material'
import { useMemo } from 'react'
import {
    type Control,
    Controller,
    type FieldErrors,
    type UseFormSetValue,
} from 'react-hook-form'

import { USER_ROLES } from '@/constants/user'
import { useCategories } from '@/lib/hooks/documents/useCategories'
import { useUsers } from '@/lib/hooks/useUsers'
import type { UploadFormInput } from '@/lib/types/document'

import { AuthorAutocomplete } from './AuthorAutocomplete'

interface MetadataFormProps {
    control: Control<UploadFormInput>
    errors: FieldErrors<UploadFormInput>
    setValue: UseFormSetValue<UploadFormInput>
    disabled?: boolean
}

export function MetadataForm({
    control,
    errors,
    setValue,
    disabled = false,
}: MetadataFormProps) {
    const { users } = useUsers()
    const { categories, isLoading: categoriesLoading } = useCategories()

    const filteredUsers = useMemo(
        () => users.filter(u => u.role !== USER_ROLES.ADMIN),
        [users]
    )

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Grid sx={{ xs: 12 }}>
                <AuthorAutocomplete
                    control={control}
                    errors={errors}
                    setValue={setValue}
                    users={filteredUsers}
                    disabled={disabled}
                />
            </Grid>
            <Grid sx={{ xs: 12 }}>
                <Controller
                    name='title'
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            fullWidth
                            label='Название документа'
                            required
                            disabled={disabled}
                            error={!!errors.title}
                            helperText={errors.title?.message}
                        />
                    )}
                />
            </Grid>

            <Grid sx={{ xs: 12 }}>
                <Controller
                    name='description'
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            fullWidth
                            label='Описание'
                            multiline
                            rows={3}
                            disabled={disabled}
                            error={!!errors.description}
                            helperText={errors.description?.message}
                        />
                    )}
                />
            </Grid>

            <Grid sx={{ xs: 12 }}>
                <Controller
                    name='categoryIds'
                    control={control}
                    render={({ field }) => {
                        return (
                            <FormControl
                                fullWidth
                                required
                                disabled={disabled || categoriesLoading}
                                error={!!errors.categoryIds}
                            >
                                <InputLabel>Категории</InputLabel>
                                <Select
                                    {...field}
                                    multiple
                                    value={field.value ?? []}
                                    input={<OutlinedInput label='Категории' />}
                                    renderValue={selected => (
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                gap: 0.5,
                                            }}
                                        >
                                            {selected.map(value => {
                                                const category =
                                                    categories?.find(cat => {
                                                        return cat.id === value
                                                    })
                                                return (
                                                    <Chip
                                                        key={value}
                                                        label={
                                                            category?.name ||
                                                            value
                                                        }
                                                        size='small'
                                                        sx={{
                                                            backgroundColor:
                                                                category?.color,
                                                            color: 'white',
                                                        }}
                                                    />
                                                )
                                            })}
                                        </Box>
                                    )}
                                >
                                    {categories?.map(category => (
                                        <MenuItem
                                            key={category.id}
                                            value={category.id}
                                        >
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        width: 16,
                                                        height: 16,
                                                        borderRadius: '50%',
                                                        backgroundColor:
                                                            category.color,
                                                    }}
                                                />
                                                {category.name}
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                                <FormHelperText>
                                    {errors.categoryIds?.message ||
                                        'Выберите хотя бы одну категорию'}
                                </FormHelperText>
                            </FormControl>
                        )
                    }}
                />
            </Grid>
            <Grid sx={{ xs: 12 }}>
                <Controller
                    name='keywords'
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            fullWidth
                            label='Ключевые слова'
                            placeholder='поиск, документы, система'
                            disabled={disabled}
                            error={!!errors.keywords}
                            helperText={
                                errors.keywords?.message ||
                                'Введите ключевые слова через запятую или пробел для улучшения поиска'
                            }
                            onChange={e => {
                                const value = e.target.value
                                field.onChange(value) // Сначала обновляем значение
                            }}
                            onBlur={e => {
                                // Обрабатываем текст только при потере фокуса
                                const value = e.target.value
                                if (value.trim()) {
                                    const processedValue = value
                                        .replace(/[^а-яёa-z0-9,\s]/gi, '') // Убираем недопустимые символы
                                        .replace(/\s+/g, ',') // Заменяем пробелы на запятые
                                        .replace(/,+/g, ',') // Убираем множественные запятые
                                        .replace(/^,|,$/g, '') // Убираем запятые в начале и конце

                                    if (processedValue !== value) {
                                        field.onChange(processedValue)
                                    }
                                }
                            }}
                            onPaste={e => {
                                e.preventDefault()
                                const pastedText =
                                    e.clipboardData.getData('text')

                                // Очищаем вставленный текст
                                const cleanText = pastedText.replace(
                                    /[^а-яёa-z0-9,\s]/gi,
                                    ''
                                )

                                // Вставляем очищенный текст
                                const target = e.target as HTMLInputElement
                                const start = target.selectionStart || 0
                                const end = target.selectionEnd || 0
                                const currentValue = target.value
                                const newValue =
                                    currentValue.substring(0, start) +
                                    cleanText +
                                    currentValue.substring(end)

                                field.onChange(newValue)

                                // Устанавливаем курсор в правильное место
                                setTimeout(() => {
                                    target.setSelectionRange(
                                        start + cleanText.length,
                                        start + cleanText.length
                                    )
                                }, 0)
                            }}
                        />
                    )}
                />
            </Grid>
        </Box>
    )
}
