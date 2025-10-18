'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Add as AddIcon, Save as SaveIcon } from '@mui/icons-material'
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Divider,
    FormControlLabel,
    Paper,
    Switch,
    TextField,
    Typography,
} from '@mui/material'
import { useForm } from 'react-hook-form'

import { useCategories } from '@/lib/hooks/documents/useCategories'
import { createCategorySchema } from '@/lib/schemas/document'
import type { CreateCategoryData } from '@/lib/types/document'

export function CreateCategory() {
    const {
        createCategory,
        operationLoading,
        operationError,
        operationSuccess,
    } = useCategories()

    const {
        register,
        handleSubmit,
        formState: { errors, isDirty, isValid },
        reset,
        watch,
    } = useForm<CreateCategoryData>({
        resolver: zodResolver(createCategorySchema),
        mode: 'onChange',
        defaultValues: {
            name: '',
            description: '',
            color: '#000000',
            isDefault: false,
        },
    })

    const onSubmit = async (data: CreateCategoryData) => {
        try {
            await createCategory(data)
            reset()
        } catch (error) {
            console.error('Failed to create category:', error)
        }
    }

    const handleReset = () => {
        reset()
    }

    const nameValue = watch('name')
    const descriptionValue = watch('description')

    return (
        <Paper sx={{ p: 3, mb: 3 }}>
            <Typography
                variant='h6'
                gutterBottom
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
                <AddIcon />
                Создать новую категорию
            </Typography>

            <Divider sx={{ mb: 3 }} />

            {operationError && (
                <Alert severity='error' sx={{ mb: 2 }}>
                    {operationError}
                </Alert>
            )}

            {operationSuccess && (
                <Alert severity='success' sx={{ mb: 2 }}>
                    {operationSuccess}
                </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                        label='Название категории *'
                        {...register('name')}
                        error={!!errors.name}
                        helperText={
                            errors.name?.message ||
                            `${nameValue.length}/50 символов`
                        }
                        fullWidth
                        disabled={operationLoading}
                        placeholder='Введите название категории'
                    />

                    <TextField
                        label='Описание'
                        {...register('description')}
                        error={!!errors.description}
                        helperText={
                            errors.description?.message ||
                            `${descriptionValue?.length || 0}/200 символов`
                        }
                        multiline
                        rows={3}
                        fullWidth
                        disabled={operationLoading}
                        placeholder='Введите описание категории (необязательно)'
                    />
                    <FormControlLabel
                        control={<Switch {...register('isDefault')} />}
                        label='По умолчанию'
                    />

                    <Box
                        sx={{
                            display: 'flex',
                            gap: 2,
                            justifyContent: 'flex-end',
                        }}
                    >
                        <Button
                            type='button'
                            onClick={handleReset}
                            disabled={operationLoading || !isDirty}
                            variant='outlined'
                        >
                            Сбросить
                        </Button>

                        <Button
                            type='submit'
                            variant='contained'
                            startIcon={
                                operationLoading ? (
                                    <CircularProgress size={16} />
                                ) : (
                                    <SaveIcon />
                                )
                            }
                            disabled={operationLoading || !isValid || !isDirty}
                        >
                            {operationLoading
                                ? 'Создание...'
                                : 'Создать категорию'}
                        </Button>
                    </Box>
                </Box>
            </form>
        </Paper>
    )
}
