'use client';

import { Category } from '@prisma/client';

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

interface CategoriesListProps {
    categories: Category[];
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
        <Card>
            <CardContent>
                <Typography variant='h6' gutterBottom>
                    Категории
                </Typography>
                <List>
                    {categories.map(category => (
                        <ListItem key={category.id} disablePadding>
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
