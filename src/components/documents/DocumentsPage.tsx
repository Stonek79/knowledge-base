'use client';

import { useState } from 'react';

import { Box, Container, Typography } from '@mui/material';

import { useCategories } from '@/lib/hooks/documents/useCategories';

import { CategoriesList } from './categories/CategoriesList';
import { FilteredList } from './filtered/FilteredList';
import { RecentDocuments } from './recent/RecentDocument';
import { SearchBar } from './search/SearchBar';

export function DocumentsPage() {
    const [currentCategory, setCurrentCategory] = useState<string | null>(null);

    const { categories, isLoading: categoriesLoading } = useCategories();

    const handleCategoryClick = (categoryId: string) => {
        setCurrentCategory(categoryId);
        if (currentCategory === categoryId) {
            setCurrentCategory(null);
        } else {
            setCurrentCategory(categoryId);
        }
    };

    return (
        <Container maxWidth='xl' sx={{ py: 3 }}>
            <Typography variant='h4' component='h1' gutterBottom>
                Система документов
            </Typography>

            {/* Поисковая строка */}
            <Box sx={{ mb: 3 }}>
                <SearchBar />
            </Box>

            {/* Основной контент */}
            <Box
                sx={{
                    display: 'flex',
                    gap: 3,
                    mb: 3,
                    alignItems: 'stretch',
                    minHeight: 0,
                    height: '16em',
                }}
            >
                {/* Категории */}
                <Box
                    sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: 0,
                    }}
                >
                    <CategoriesList
                        categories={categories}
                        isLoading={categoriesLoading}
                        onCategoryClick={handleCategoryClick}
                    />
                </Box>

                {/* Недавние документы */}
                <Box
                    sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: 0,
                    }}
                >
                    <RecentDocuments />
                </Box>
            </Box>

            <Box sx={{ mt: 4 }}>
                {currentCategory && (
                    <FilteredList categoryId={currentCategory} />
                )}
            </Box>
        </Container>
    );
}
