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
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { useCategories } from '@/lib/hooks/documents/useCategories'
import { updateCategorySchema } from '@/lib/schemas/document'
import type { UpdateCategoryData } from '@/lib/types/document'

export function EditCategoryPage() {
    const router = useRouter()
    const params = useParams<{ categoryId: string }>()
    const categoryId = params.categoryId

    const {
        updateCategory,
        operationLoading,
        operationError,
        operationSuccess,
        categories,
        clearMessages,
    } = useCategories()

    const category = categories?.find(c => c.id === categoryId)

    console.log('[CATEGORY]', category)
    console.log('[ID]', categoryId)

    const {
        register,
        handleSubmit,
        formState: { errors, isDirty, isValid },
        reset,
        watch,
    } = useForm<UpdateCategoryData>({
        resolver: zodResolver(updateCategorySchema),
        mode: 'onChange',
        defaultValues: {
            name: category?.name || '',
            description: category?.description || '',
            color: category?.color || '#000000',
            isDefault: category?.isDefault || false,
        },
    })

    const handleReset = () => {
        reset()
        clearMessages()
    }

    const onSubmit = async (data: UpdateCategoryData) => {
        try {
            await updateCategory({ ...data, id: categoryId })
            handleReset()
            router.back()
        } catch (error) {
            console.error('Failed to update category:', error)
        }
    }

    const nameValue = watch('name')
    const descriptionValue = watch('description')

    return (
        <Paper sx={{ p: 3, m: 3 }}>
            <Typography
                variant='h6'
                gutterBottom
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
                <AddIcon />
                Редактировать категорию
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
                            `${nameValue?.length || 0}/50 символов`
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

                    <TextField
                        label='Цвет'
                        type='color'
                        sx={{
                            width: '200px',
                        }}
                        {...register('color')}
                        disabled={operationLoading}
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
                            onClick={() => router.back()}
                            variant='outlined'
                        >
                            Назад
                        </Button>
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
                                ? 'Редактирование...'
                                : 'Редактировать категорию'}
                        </Button>
                    </Box>
                </Box>
            </form>
        </Paper>
    )
}
