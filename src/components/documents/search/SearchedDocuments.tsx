'use client';

import { useState } from 'react';

import {
    Person as PersonIcon,
    Visibility as VisibilityIcon,
} from '@mui/icons-material';
import {
    Avatar,
    Box,
    Card,
    Chip,
    CircularProgress,
    Divider,
    List,
    ListItem,
    ListItemButton,
    Pagination,
    Typography,
} from '@mui/material';

import { DocumentWithAuthor, SearchedDocument } from '@/lib/types/document';

import { DocumentViewer } from '../viewer/DocumentViewer';
import { SearchHighlight } from './SearchHighlight';

type SearchedDocumentsProps = {
    results: SearchedDocument[];
    isLoading?: boolean;
    query: string;
};

export function SearchedDocuments({
    results,
    isLoading = false,
    query,
}: SearchedDocumentsProps) {
    const [viewedDocuments, setViewedDocuments] = useState<Set<string>>(
        new Set()
    );
    const [selectedDocument, setSelectedDocument] =
        useState<DocumentWithAuthor | null>(null);
    const [viewerOpen, setViewerOpen] = useState(false);

    if (!query.trim()) {
        return (
            <Typography color='text.secondary'>
                Введите запрос и нажмите «Найти»
            </Typography>
        );
    }

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <CircularProgress size={20} />
                <Typography>Идет поиск…</Typography>
            </Box>
        );
    }

    if (results.length === 0) {
        return <Typography>Ничего не найдено</Typography>;
    }

    const handleDocumentClick = (result: DocumentWithAuthor) => {
        setSelectedDocument(result);
        setViewerOpen(true);
        setViewedDocuments(prev => new Set([...prev, result.id]));
    };

    const handleViewerClose = () => {
        setViewerOpen(false);
        setSelectedDocument(null);
    };

    return (
        <Box>
            <Typography variant='h6' gutterBottom>
                Результаты поиска ({results.length})
            </Typography>

            {/* Контейнер с прокруткой */}
            <Box
                sx={{
                    maxHeight: 'calc(100vh - 200px)',
                    overflowY: 'auto',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: 'background.paper',
                }}
            >
                <List sx={{ p: 0, width: '100%' }}>
                    {results.map((result, index) => (
                        <Box
                            key={result.id}
                            sx={{
                                pl: 2,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                width: '100%',
                            }}
                        >
                            <Avatar
                                sx={{
                                    width: 32,
                                    height: 32,
                                    border: 1,
                                    borderColor: viewedDocuments.has(result.id)
                                        ? 'secondary.main'
                                        : 'primary.main',
                                    bgcolor: 'action.selected',
                                    color: viewedDocuments.has(result.id)
                                        ? 'black'
                                        : 'text.secondary',
                                    fontSize: '0.875rem',
                                    fontWeight: 'bold',
                                }}
                            >
                                {index + 1}
                            </Avatar>
                            <Card sx={{ m: 2, width: '100%' }}>
                                <ListItem
                                    disablePadding
                                    sx={{
                                        // Стили для просмотренных документов
                                        ...(viewedDocuments.has(result.id) && {
                                            bgcolor: 'action.hover',
                                            borderLeft: 3,
                                            borderColor: 'primary.main',
                                        }),
                                        transition: 'all 0.2s ease-in-out',
                                        '&:hover': {
                                            transform: 'translateX(4px)',
                                        },
                                        width: '100%',
                                    }}
                                >
                                    <ListItemButton
                                        onClick={() =>
                                            handleDocumentClick(result)
                                        }
                                        sx={{
                                            py: 2,
                                            px: 3,
                                            '&:hover': {
                                                bgcolor: 'action.hover',
                                            },
                                            width: '100%',
                                        }}
                                    >
                                        {/* Основной контент */}
                                        <Box>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                }}
                                            >
                                                <Typography
                                                    variant='h6'
                                                    component='span'
                                                >
                                                    {result.title}
                                                </Typography>
                                                {viewedDocuments.has(
                                                    result.id
                                                ) && (
                                                    <Chip
                                                        icon={
                                                            <VisibilityIcon />
                                                        }
                                                        label='Просмотрено'
                                                        size='small'
                                                        color='primary'
                                                        variant='outlined'
                                                    />
                                                )}
                                            </Box>

                                            <Box sx={{ mt: 1 }}>
                                                {/* Подсвеченный контент */}
                                                <SearchHighlight
                                                    text={result.content}
                                                    highlights={
                                                        result.highlights || []
                                                    }
                                                    query={query}
                                                />

                                                {/* Метаданные */}
                                                <Box
                                                    sx={{
                                                        mt: 1,
                                                        display: 'flex',
                                                        gap: 2,
                                                        alignItems: 'center',
                                                        flexWrap: 'wrap',
                                                    }}
                                                >
                                                    <Chip
                                                        icon={<PersonIcon />}
                                                        label={
                                                            result.author
                                                                .username
                                                        }
                                                        size='small'
                                                        variant='outlined'
                                                        color='secondary'
                                                    />
                                                    <Chip
                                                        label={`Релевантность: ${((result?.relevance || 0) * 100).toFixed(1)}%`}
                                                        size='small'
                                                        variant='outlined'
                                                        color='info'
                                                    />
                                                </Box>
                                            </Box>
                                        </Box>
                                    </ListItemButton>
                                </ListItem>

                                {/* Разделитель между элементами (кроме последнего) */}
                                {index < results?.length - 1 && (
                                    <Divider component='li' />
                                )}
                            </Card>
                        </Box>
                    ))}
                </List>
            </Box>

            {/* Пагинация */}
            {results?.length > 25 && (
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                    <Pagination
                        count={Math.ceil(results?.length / 25)}
                        page={1}
                        onChange={(_, page) => {
                            console.log('Переход на страницу:', page);
                        }}
                        color='primary'
                    />
                </Box>
            )}

            {/* Модальное окно просмотра */}
            {selectedDocument && (
                <DocumentViewer
                    document={selectedDocument}
                    open={viewerOpen}
                    onClose={handleViewerClose}
                    searchQuery={query}
                />
            )}
        </Box>
    );
}
