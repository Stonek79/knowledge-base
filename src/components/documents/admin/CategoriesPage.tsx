'use client';

import { Box, Typography } from '@mui/material';

import { AdminCategoriesList } from './AdminCategoriesList';
import { CreateCategory } from './CreateCategory';

export function CategoriesPage() {
    
    return (
        <Box sx={{ gap: 3, m: 3, display: 'flex', flexDirection: 'column' }}>
            <Typography variant='h4'>Категории</Typography>
            <AdminCategoriesList />
            <CreateCategory />
        </Box>
    );
}
