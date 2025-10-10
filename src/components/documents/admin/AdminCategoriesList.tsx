'use client';

import { useState } from 'react';


import {
    Delete as DeleteIcon,
    Edit as EditIcon,
    Visibility as VisibilityIcon,
} from '@mui/icons-material';
import {
    Box,
    Card,
    CardContent,
    IconButton,
    Paper,
    Skeleton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from '@mui/material';
import { useRouter } from 'next/navigation';

import {
    ADMIN_PATH,
    CATEGORY_EDIT_PAGE_PATH,
    CATEGORY_PAGE_PATH,
} from '@/constants/api';
import { useCategories } from '@/lib/hooks/documents/useCategories';
import { CategoryBase } from '@/lib/types/document';
import { formatDate } from '@/utils/date';

import { DeleteCategoryDialog } from './DeleteCategoryDialog';

export function AdminCategoriesList() {
    const router = useRouter();

    const { categories, isLoading, deleteCategory } = useCategories();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] =
        useState<CategoryBase | null>(null);

    const handleEdit = (category: CategoryBase) => {
        router.push(`${ADMIN_PATH}${CATEGORY_EDIT_PAGE_PATH(category.id)}`);
    };

    const handleDelete = async (categoryId: string) => {
        try {
            await deleteCategory(categoryId);
        } catch (error) {
            console.error('Failed to delete category:', error);
        }
    };

    const handleViewCategory = (categoryId: string) => {
        router.push(`${ADMIN_PATH}${CATEGORY_PAGE_PATH(categoryId)}`);
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent>
                    <Typography variant='h6' gutterBottom>
                        Управление категориями
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                        {[...Array(4)].map((_, i) => (
                            <Skeleton key={i} height={60} sx={{ mb: 1 }} />
                        ))}
                    </Box>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardContent>
                <Typography variant='h6' gutterBottom>
                    Управление категориями ({categories?.length || 0})
                </Typography>

                <TableContainer component={Paper} variant='outlined'>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Название</TableCell>
                                <TableCell>Описание</TableCell>
                                <TableCell>Документы</TableCell>
                                <TableCell>Цвет</TableCell>
                                <TableCell>Обновлено</TableCell>
                                <TableCell align='center'>Действия</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {categories?.map(category => (
                                <TableRow key={category.id}>
                                    <TableCell>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                            }}
                                        >
                                            <Typography
                                                variant='subtitle2'
                                                fontWeight={500}
                                            >
                                                {category.name}
                                            </Typography>
                                        </Box>
                                    </TableCell>

                                    <TableCell>
                                        <Typography
                                            variant='body2'
                                            color='text.secondary'
                                        >
                                            {category.description || '—'}
                                        </Typography>
                                    </TableCell>

                                    <TableCell>
                                        <Typography
                                            variant='body2'
                                            color='text.secondary'
                                        >
                                            {category._count?.documents || 0}
                                        </Typography>
                                    </TableCell>

                                    <TableCell>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    width: 20,
                                                    height: 20,
                                                    borderRadius: '50%',
                                                    backgroundColor:
                                                        category.color ||
                                                        '#6B7280',
                                                    border: '2px solid #fff',
                                                    boxShadow:
                                                        '0 0 0 1px #e5e7eb',
                                                }}
                                            />
                                            <Typography
                                                variant='caption'
                                                color='text.secondary'
                                            >
                                                {category.color || '#6B7280'}
                                            </Typography>
                                        </Box>
                                    </TableCell>

                                    <TableCell>
                                        <Typography
                                            variant='body2'
                                            color='text.secondary'
                                        >
                                            {formatDate(category.updatedAt)}
                                        </Typography>
                                    </TableCell>

                                    <TableCell align='center'>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                gap: 1,
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <Tooltip title='Просмотр'>
                                                <IconButton
                                                    size='small'
                                                    onClick={() =>
                                                        handleViewCategory(
                                                            category.id
                                                        )
                                                    }
                                                >
                                                    <VisibilityIcon />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title='Редактировать'>
                                                <IconButton
                                                    size='small'
                                                    onClick={() =>
                                                        handleEdit(category)
                                                    }
                                                >
                                                    <EditIcon />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip
                                                title={
                                                    category._count.documents >
                                                        0 || category.isDefault
                                                        ? 'Нельзя удалить категорию, так как она используется в документах'
                                                        : 'Удалить'
                                                }
                                            >
                                                <span>
                                                    <IconButton
                                                        size='small'
                                                        color='error'
                                                        onClick={() =>
                                                            handleDelete(
                                                                category.id
                                                            )
                                                        }
                                                        disabled={
                                                            category._count
                                                                .documents >
                                                                0 ||
                                                            category.isDefault
                                                        }
                                                    >
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </CardContent>
            <DeleteCategoryDialog
                open={deleteDialogOpen}
                category={categoryToDelete}
                onClose={() => setDeleteDialogOpen(false)}
                onConfirm={handleDelete}
            />
        </Card>
    );
}
