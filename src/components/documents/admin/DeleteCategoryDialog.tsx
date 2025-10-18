'use client'

import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography,
} from '@mui/material'
import { useState } from 'react'

import type { CategoryBase } from '@/lib/types/document'

interface DeleteCategoryDialogProps {
    open: boolean
    category: CategoryBase | null
    onClose: () => void
    onConfirm: () => Promise<void>
}

/**
 * Диалог подтверждения удаления категории
 *
 * @description Запрашивает подтверждение удаления категории:
 * - Отображает информацию о категории
 * - Предупреждает о необратимости действия
 * - Обрабатывает ошибки удаления
 */
export function DeleteCategoryDialog({
    open,
    category,
    onClose,
    onConfirm,
}: DeleteCategoryDialogProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleDelete = async () => {
        if (!category) return

        setIsLoading(true)
        setError(null)

        try {
            await onConfirm()
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Ошибка удаления категории'
            )
        } finally {
            setIsLoading(false)
        }
    }

    // Очищаем ошибку при открытии/закрытии диалога
    const handleClose = () => {
        setError(null)
        onClose()
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
            <DialogTitle>Удалить категорию</DialogTitle>
            <DialogContent>
                {error && (
                    <Alert severity='error' sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {category && (
                    <Typography>
                        Вы уверены, что хотите удалить категорию{' '}
                        <strong>{category.name}</strong>?
                    </Typography>
                )}

                <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ mt: 1 }}
                >
                    Это действие нельзя отменить. Категория будет удалена
                    навсегда.
                </Typography>
            </DialogContent>

            <DialogActions>
                <Button onClick={handleClose} disabled={isLoading}>
                    Отмена
                </Button>
                <Button
                    onClick={handleDelete}
                    variant='contained'
                    color='error'
                    disabled={isLoading}
                >
                    {isLoading ? 'Удаление...' : 'Удалить'}
                </Button>
            </DialogActions>
        </Dialog>
    )
}
