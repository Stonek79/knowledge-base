'use client';

import { useState } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
    FilterList as FilterIcon,
    FilterListOff as FilterOffIcon,
} from '@mui/icons-material';
import { Box, Button, Container, Grid, Typography } from '@mui/material';

import { useDocuments } from '@/lib/hooks/documents/useDocuments';
import { DocumentFilters } from '@/lib/types/document';

import { SearchBar } from './SearchBar';
import { SearchFilters } from './SearchFilters';
import { SearchedDocuments } from './SearchedDocuments';

export function SearchPage() {
    const router = useRouter();
    const pathname = usePathname();
    const sp = useSearchParams();

    const initialQuery = sp.get('q') ?? '';
    const [query, setQuery] = useState(initialQuery);
    const [filters, setFilters] = useState<DocumentFilters>({
        page: 1,
        limit: 20,
        categoryIds: undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
    });
    const { documents, isLoading } = useDocuments({
        ...filters,
        q: query, // Передаем поисковый запрос в фильтрах
    });
    const [filtersExpanded, setFiltersExpanded] = useState(false);

    const updateUrl = (newQuery: string, newFilters: DocumentFilters) => {
        const params = new URLSearchParams();
        if (newQuery) params.set('q', newQuery);
        if (newFilters.categoryIds?.length)
            params.set('categories', newFilters.categoryIds.join(','));
        if (newFilters.authorId) params.set('authorId', newFilters.authorId);

        router.replace(`${pathname}?${params.toString()}`);
    };

    const handleSearch = (q: string) => {
        const newFilters = { ...filters, q: q, page: 1 };
        setQuery(q);
        setFilters(newFilters);
        updateUrl(q, newFilters);
    };

    const handleFiltersChange = (newFilters: Partial<DocumentFilters>) => {
        const updatedFilters = { ...filters, ...newFilters, page: 1 };
        setFilters(updatedFilters);
        updateUrl(query, updatedFilters);
    };

    const resetFilters = () => {
        const defaultFilters: DocumentFilters = {
            page: 1,
            limit: 20,
            sortBy: 'createdAt',
            sortOrder: 'desc',
            authorId: '',
        };
        setFilters(defaultFilters);
        updateUrl(query, defaultFilters);
    };

    return (
        <Container
            maxWidth='xl'
            sx={{
                py: 3,
                overflow: 'hidden',
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 1000,
            }}
        >
            <Typography variant='h4' component='h1' gutterBottom>
                Поиск документов
            </Typography>

            <Box sx={{ mb: 3 }}>
                <SearchBar
                    initialValue={initialQuery}
                    onSearch={handleSearch}
                />
            </Box>

            <Button
                variant={filtersExpanded ? 'contained' : 'outlined'}
                startIcon={filtersExpanded ? <FilterOffIcon /> : <FilterIcon />}
                onClick={() => setFiltersExpanded(!filtersExpanded)}
                size='large'
            >
                {filtersExpanded ? 'Скрыть фильтры' : 'Фильтры'}
            </Button>

            {/* Раскрывающиеся фильтры */}
            {filtersExpanded && (
                <Box sx={{ mb: 3 }}>
                    <SearchFilters
                        filters={filters}
                        onFiltersChange={handleFiltersChange}
                        onReset={resetFilters}
                    />
                </Box>
            )}

            <Box>
                <Grid sx={{ xs: 12, md: 9, flex: 1 }}>
                    <SearchedDocuments
                        results={documents}
                        isLoading={isLoading}
                        query={query}
                    />
                </Grid>
            </Box>
        </Container>
    );
}
