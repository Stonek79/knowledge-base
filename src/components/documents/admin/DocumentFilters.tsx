'use client';

import { useCallback } from 'react';

import { Clear as ClearIcon } from '@mui/icons-material';
import {
    Box,
    Button,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
} from '@mui/material';

import type {
    CategoryBase,
    DocumentFilters as DocumentFiltersType,
} from '@/lib/types/document';

import { SearchField } from './SearchField';

interface DocumentFiltersProps {
    filters: DocumentFiltersType;
    onFiltersChange: (filters: DocumentFiltersType) => void;
    categories: CategoryBase[];
    isLoading: boolean;
    onReset: () => void;
}

/**
 * Компонент фильтров для документов
 *
 * @description Предоставляет интерфейс для фильтрации документов:
 * - Поиск по названию и содержимому
 * - Фильтрация по категориям
 * - Сортировка по различным полям
 */
export function DocumentFilters({
    filters,
    onFiltersChange,
    categories,
    isLoading,
    onReset,
}: DocumentFiltersProps) {
    const handleSearchChange = useCallback(
        (search: string) => {
            const trimmedSearch = search.trim();
            onFiltersChange({
                ...filters,
                search: trimmedSearch || undefined,
                page: 1,
            });
        },
        [filters, onFiltersChange]
    );

    const handleCategoryChange = useCallback(
        (categoryIds: string[]) => {
            const filteredIds = categoryIds.filter(
                id => id !== 'all' && id.trim() !== ''
            );

            onFiltersChange({
                ...filters,
                categoryIds: filteredIds.length > 0 ? filteredIds : undefined,
                page: 1,
            });
        },
        [filters, onFiltersChange]
    );

    const handleSortChange = useCallback(
        (sortBy: DocumentFiltersType['sortBy']) => {
            onFiltersChange({
                ...filters,
                sortBy,
                page: 1,
            });
        },
        [filters, onFiltersChange]
    );

    const handleSortOrderChange = useCallback(
        (sortOrder: DocumentFiltersType['sortOrder']) => {
            onFiltersChange({
                ...filters,
                sortOrder,
                page: 1,
            });
        },
        [filters, onFiltersChange]
    );

    return (
        <Paper sx={{ p: 2, mb: 3, overflowX: 'auto', maxWidth: 'fit-content' }}>
            <Stack
                direction='row'
                spacing={2}
                alignItems='center'
                width='100%'
            >
                <Box sx={{ minWidth: 200 }}>
                    <SearchField
                        placeholder='Поиск документов...'
                        value={filters.search || ''}
                        onSearch={search => handleSearchChange(search)}
                    />
                </Box>

                <FormControl sx={{ minWidth: 200 }} disabled={isLoading}>
                    <InputLabel>Категория</InputLabel>
                    <Select
                        multiple
                        value={filters.categoryIds || []}
                        onChange={e => {
                            const value = e.target.value as string[];

                            if (value.includes('all')) {
                                handleCategoryChange([]);
                            } else {
                                handleCategoryChange(value);
                            }
                        }}
                        label='Категория'
                    >
                        <MenuItem value='all'>Все категории</MenuItem>
                        {categories.map(category => (
                            <MenuItem key={category.id} value={category.id}>
                                {category.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel>Сортировка</InputLabel>
                    <Select
                        value={filters.sortBy || 'createdAt'}
                        onChange={e => handleSortChange(e.target.value)}
                        label='Сортировка'
                    >
                        <MenuItem value='createdAt'>По дате создания</MenuItem>
                        <MenuItem value='title'>По названию</MenuItem>
                        <MenuItem value='viewCount'>По просмотрам</MenuItem>
                        <MenuItem value='downloadCount'>
                            По скачиваниям
                        </MenuItem>
                    </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel>Порядок</InputLabel>
                    <Select
                        value={filters.sortOrder || 'desc'}
                        onChange={e => handleSortOrderChange(e.target.value)}
                        label='Порядок'
                    >
                        <MenuItem value='desc'>По убыванию</MenuItem>
                        <MenuItem value='asc'>По возрастанию</MenuItem>
                    </Select>
                </FormControl>
                <Button
                    sx={{ height: '100%', minWidth: 'fit-content' }}
                    variant='outlined'
                    startIcon={<ClearIcon />}
                    onClick={onReset}
                    disabled={!filters.search && !filters.categoryIds?.length}
                >
                    Сбросить
                </Button>
            </Stack>
        </Paper>
    );
}
