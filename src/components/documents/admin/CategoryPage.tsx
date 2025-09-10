'use client';

import { useEffect, useState } from 'react';

import { useParams, useRouter } from 'next/navigation';

import {
    ArrowBack as ArrowBackIcon,
    ColorLens as ColorIcon,
    CalendarToday as DateIcon,
    Delete as DeleteIcon,
    Description as DocumentIcon,
    Edit as EditIcon,
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Container,
    Divider,
    Grid,
    IconButton,
    Skeleton,
    Tooltip,
    Typography,
} from '@mui/material';

import { useCategories } from '@/lib/hooks/documents/useCategories';
import { useDocuments } from '@/lib/hooks/documents/useDocuments';
import { DocumentFilters as DocumentFiltersType, ViewableDocument } from '@/lib/types/document';
import { formatDate } from '@/utils/date';

import { DocumentFilters } from './DocumentFilters';
import { DocumentViewer } from '../viewer/DocumentViewer';

export default function CategoryPage() {
    const params = useParams();
    const router = useRouter();
    const categoryId = params.categoryId as string;

    const [viewerOpen, setViewerOpen] = useState(false);
    const [selectedDocument, setSelectedDocument] =
        useState<ViewableDocument | null>(null);
    const [filters, setFilters] = useState<DocumentFiltersType>({
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        search: undefined,
        categoryIds: [categoryId], // Фильтруем по текущей категории
    });

    const {
        categories,
        isLoading: categoriesLoading,
        error: categoriesError,
    } = useCategories();
    const {
        documents,
        pagination,
        isLoading: documentsLoading,
        error: documentsError,
    } = useDocuments(filters);

    const category = categories?.find(cat => cat.id === categoryId);

    useEffect(() => {
        if (categoryId) {
            setFilters(prev => ({ ...prev, categoryIds: [categoryId] }));
        }
    }, [categoryId]);

    const handleBack = () => {
        router.back();
    };

    const handleEdit = () => {
        // TODO: Открыть модалку редактирования
        console.log('Edit category:', category);
    };

    const handleDelete = async () => {
        if (!category || category.isDefault) return;

        // TODO: Показать диалог подтверждения
        console.log('Delete category:', category);
    };

    const handleFiltersChange = (newFilters: DocumentFiltersType) => {
        setFilters(newFilters);
    };

    const resetFilters = () => {
        setFilters({
            page: 1,
            limit: 10,
            sortBy: 'createdAt',
            sortOrder: 'desc',
            search: undefined,
            categoryIds: [categoryId],
        });
    };

    if (categoriesLoading) {
        return (
            <Container maxWidth='lg' sx={{ py: 4 }}>
                <Skeleton variant='rectangular' height={200} sx={{ mb: 3 }} />
                <Skeleton variant='rectangular' height={400} />
            </Container>
        );
    }

    if (categoriesError || !category) {
        return (
            <Container maxWidth='lg' sx={{ py: 4 }}>
                <Alert severity='error'>
                    Категория не найдена или произошла ошибка загрузки.
                </Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth='lg' sx={{ py: 4 }}>
            {/* Хлебные крошки и навигация */}
            <Box sx={{ mb: 3 }}>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={handleBack}
                    variant='outlined'
                    size='small'
                >
                    Назад к категориям
                </Button>

                <Box
                    sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}
                >
                    <Tooltip title='Редактировать категорию'>
                        <IconButton onClick={handleEdit} color='primary'>
                            <EditIcon />
                        </IconButton>
                    </Tooltip>

                    <Tooltip
                        title={
                            category.isDefault
                                ? 'Нельзя удалить категорию по умолчанию'
                                : 'Удалить категорию'
                        }
                    >
                        <span>
                            <IconButton
                                onClick={handleDelete}
                                color='error'
                                disabled={category.isDefault}
                            >
                                <DeleteIcon />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Box>
            </Box>

            {/* Информация о категории */}
            <Card sx={{ mb: 4 }}>
                <CardContent>
                    <Grid container spacing={3}>
                        <Grid sx={{ xs: 12, md: 8 }} component='div'>
                            <Typography variant='h6' gutterBottom>
                                Основная информация
                            </Typography>

                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 2,
                                }}
                            >
                                <Box>
                                    <Typography
                                        variant='subtitle2'
                                        color='text.secondary'
                                        gutterBottom
                                    >
                                        Название
                                    </Typography>
                                    <Typography
                                        variant='body1'
                                        fontWeight={500}
                                    >
                                        {category.name}
                                    </Typography>
                                </Box>

                                <Box>
                                    <Typography
                                        variant='subtitle2'
                                        color='text.secondary'
                                        gutterBottom
                                    >
                                        Описание
                                    </Typography>
                                    <Typography variant='body1'>
                                        {category.description ||
                                            'Описание отсутствует'}
                                    </Typography>
                                </Box>

                                <Box>
                                    <Typography
                                        variant='subtitle2'
                                        color='text.secondary'
                                        gutterBottom
                                    >
                                        Статус
                                    </Typography>
                                    {category.isDefault ? (
                                        <Chip
                                            label='Категория по умолчанию'
                                            color='primary'
                                            variant='outlined'
                                        />
                                    ) : (
                                        <Chip
                                            label='Пользовательская категория'
                                            color='default'
                                            variant='outlined'
                                        />
                                    )}
                                </Box>
                            </Box>
                        </Grid>

                        <Grid sx={{ xs: 12, md: 4 }} component='div'>
                            <Typography variant='h6' gutterBottom>
                                Детали
                            </Typography>

                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 2,
                                }}
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                    }}
                                >
                                    <ColorIcon color='action' />
                                    <Box>
                                        <Typography
                                            variant='caption'
                                            color='text.secondary'
                                        >
                                            Цвет
                                        </Typography>
                                        <Box
                                            sx={{
                                                width: 24,
                                                height: 24,
                                                borderRadius: '50%',
                                                backgroundColor:
                                                    category.color || '#6B7280',
                                                border: '2px solid #fff',
                                                boxShadow: '0 0 0 1px #e5e7eb',
                                            }}
                                        />
                                    </Box>
                                </Box>

                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                    }}
                                >
                                    <DocumentIcon color='action' />
                                    <Box>
                                        <Typography
                                            variant='caption'
                                            color='text.secondary'
                                        >
                                            Документов
                                        </Typography>
                                        <Typography
                                            variant='body2'
                                            fontWeight={500}
                                        >
                                            {category._count?.documents || 0}
                                        </Typography>
                                    </Box>
                                </Box>

                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                    }}
                                >
                                    <DateIcon color='action' />
                                    <Box>
                                        <Typography
                                            variant='caption'
                                            color='text.secondary'
                                        >
                                            Создано
                                        </Typography>
                                        <Typography variant='body2'>
                                            {formatDate(category.createdAt)}
                                        </Typography>
                                    </Box>
                                </Box>

                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                    }}
                                >
                                    <DateIcon color='action' />
                                    <Box>
                                        <Typography
                                            variant='caption'
                                            color='text.secondary'
                                        >
                                            Обновлено
                                        </Typography>
                                        <Typography variant='body2'>
                                            {formatDate(category.updatedAt)}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            <Divider sx={{ mb: 4 }} />

            {/* Документы категории */}
            <Box>
                <Typography variant='h5' gutterBottom>
                    Документы в категории
                </Typography>

                {documentsError && (
                    <Alert severity='error' sx={{ mb: 3 }}>
                        {documentsError.message}
                    </Alert>
                )}

                {/* Фильтры для документов */}
                <DocumentFilters
                    filters={filters}
                    onFiltersChange={handleFiltersChange}
                    categories={[category]} // Только текущая категория
                    isLoading={false}
                    onReset={resetFilters}
                />

                {/* Таблица документов */}
                <Box sx={{ mt: 3 }}>
                    {documents?.map(doc => (
                        <Card key={doc.id} sx={{ mb: 2 }}>
                            <CardContent>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Box>
                                        <Typography variant='h6' gutterBottom>
                                            {doc.title}
                                        </Typography>
                                        <Typography
                                            variant='body2'
                                            color='text.secondary'
                                        >
                                            {doc.description ||
                                                'Описание отсутствует'}
                                        </Typography>
                                        <Typography
                                            variant='caption'
                                            color='text.secondary'
                                        >
                                            Загружен:{' '}
                                            {formatDate(doc.createdAt)}
                                        </Typography>
                                    </Box>
                                    <Button
                                        variant='outlined'
                                        size='small'
                                        onClick={() => {
                                            setSelectedDocument(doc);
                                            setViewerOpen(true);
                                        }}
                                    >
                                        Просмотреть
                                    </Button>
                                </Box>
                            </CardContent>
                        </Card>
                    ))}
                </Box>

                {/* Пагинация */}
                {pagination && (
                    <Box
                        sx={{
                            mt: 3,
                            display: 'flex',
                            justifyContent: 'center',
                        }}
                    >
                        {/* TODO: Добавить компонент пагинации */}
                    </Box>
                )}

                {selectedDocument && (
                    <DocumentViewer
                        document={selectedDocument}
                        open={viewerOpen}
                        onClose={() => {
                            setViewerOpen(false);
                            setSelectedDocument(null);
                        }}
                    />
                )}  
            </Box>
        </Container>
    );
}
