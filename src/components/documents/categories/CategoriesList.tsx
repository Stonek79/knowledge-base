'use client';

import {
    Box,
    Card,
    CardContent,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    Skeleton,
    Typography,
} from '@mui/material';

import { CategoryBase } from '@/lib/types/document';

interface CategoriesListProps {
    categories: CategoryBase[];
    isLoading?: boolean;
    onCategoryClick: (categoryId: string) => void;
}

export function CategoriesList({
    categories,
    isLoading,
    onCategoryClick,
}: CategoriesListProps) {
    if (isLoading) {
        return (
            <Card>
                <CardContent>
                    <Typography variant='h6' gutterBottom>
                        Категории
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                        {[...Array(4)].map((_, i) => (
                            <Skeleton key={i} height={40} />
                        ))}
                    </Box>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <CardContent
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    minHeight: 0,
                    p: 1,
                }}
            >
                <Typography
                    variant='h6'
                    gutterBottom
                    sx={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 1,
                        bgcolor: 'background.paper',
                        py: 1,
                    }}
                >
                    Категории
                </Typography>
                <List sx={{ flex: 1, overflow: 'auto', minHeight: 0, pr: 1 }}>
                    {categories.map(category => (
                        <ListItem key={category.id} disablePadding sx={{ border: '1px solid #e0e0e0', gap: 1, borderRadius: 1 }}>
                            <ListItemButton
                                onClick={() => onCategoryClick(category.id)}
                            >
                                <ListItemIcon>
                                    <Box
                                        sx={{
                                            width: 12,
                                            height: 12,
                                            borderRadius: '50%',
                                            backgroundColor:
                                                category.color || '#6B7280',
                                        }}
                                    />
                                </ListItemIcon>
                                <Typography variant='body2'>
                                    {category.name}
                                </Typography>
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </CardContent>
        </Card>
    );
}
