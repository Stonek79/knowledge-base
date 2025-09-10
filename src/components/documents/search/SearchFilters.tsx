'use client';

import {
    Box,
    Button,
    Chip,
    Divider,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    OutlinedInput,
    Paper,
    Select,
    TextField,
    Typography,
} from '@mui/material';

import { useCategories } from '@/lib/hooks/documents/useCategories';
import { DocumentFilters } from '@/lib/types/document';

interface SearchFiltersProps {
    filters: DocumentFilters;
    onFiltersChange: (filters: Partial<DocumentFilters>) => void;
    onReset: () => void;
}

export function SearchFilters({
    filters,
    onFiltersChange,
    onReset,
}: SearchFiltersProps) {
    const { categories, isLoading } = useCategories();

    return (
        <Paper sx={{ p: 3 }}>
            <Typography variant='h6' gutterBottom>
                Фильтры поиска
            </Typography>

            <Grid container spacing={3}>
                {/* Категории */}
                <Grid sx={{ xs: 12, md: 4 }}>
                    <FormControl fullWidth>
                        <InputLabel>Категории</InputLabel>
                        <Select
                            multiple
                            sx={{ minWidth: 200 }}
                            value={filters.categoryIds || []}
                            onChange={e =>
                                onFiltersChange({
                                    categoryIds: e.target.value as string[],
                                })
                            }
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
                                        const category = categories?.find(
                                            cat => cat.id === value
                                        );
                                        return (
                                            <Chip
                                                key={value}
                                                label={category?.name || value}
                                                size='small'
                                            />
                                        );
                                    })}
                                </Box>
                            )}
                        >
                            {categories?.map(category => (
                                <MenuItem key={category.id} value={category.id}>
                                    {category.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                {/* Сортировка */}
                <Grid sx={{ xs: 12, md: 4 }}>
                    <FormControl fullWidth>
                        <InputLabel>Сортировка</InputLabel>
                        <Select
                            sx={{ minWidth: 200 }}
                            value={filters.sortBy}
                            onChange={e =>
                                onFiltersChange({
                                    sortBy: e.target.value,
                                })
                            }
                        >
                            <MenuItem value='createdAt'>Дата создания</MenuItem>
                            <MenuItem value='updatedAt'>Дата обновления</MenuItem>
                            <MenuItem value='title'>Название</MenuItem>
                            <MenuItem value='viewCount'>Просмотры</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>

                {/* Порядок */}
                <Grid sx={{ xs: 12, md: 4 }}>
                    <FormControl fullWidth>
                        <InputLabel>Порядок</InputLabel>
                        <Select
                            sx={{ minWidth: 200 }}
                            value={filters.sortOrder}
                            onChange={e =>
                                onFiltersChange({
                                    sortOrder: e.target.value as 'asc' | 'desc',
                                })
                            }
                        >
                            <MenuItem value='desc'>По убыванию</MenuItem>
                            <MenuItem value='asc'>По возрастанию</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            {/* Кнопки управления */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button variant='outlined' onClick={onReset}>
                    Сбросить фильтры
                </Button>
            </Box>
        </Paper>
    );
}
