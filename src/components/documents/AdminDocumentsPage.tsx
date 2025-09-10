'use client';

import { useState } from 'react';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

import { Add as AddIcon } from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Container,
    Stack,
    TablePagination,
    Typography,
} from '@mui/material';

import {
    ADMIN_PATH,
    DOCUMENT_EDIT_PAGE_PATH,
    UPLOAD_PAGE_PATH,
} from '@/constants/api';
import { useCategories } from '@/lib/hooks/documents/useCategories';
import { useDocumentDelete } from '@/lib/hooks/documents/useDocumentDelete';
import { useDocuments } from '@/lib/hooks/documents/useDocuments';
import { useRecentDocuments } from '@/lib/hooks/documents/useRecentDocuments';
import {
    DocumentFilters as DocumentFiltersType,
    DocumentWithAuthor,
    SearchResult,
} from '@/lib/types/document';

import { DeleteDocumentDialog } from './admin/DeleteDocumentDialog';
import { DocumentFilters } from './admin/DocumentFilters';
import { DocumentTable } from './admin/DocumentTable';

const DocumentViewer = dynamic(
    () => import('./viewer/DocumentViewer').then(m => m.DocumentViewer),
    { ssr: false }
);

/**
 * Страница управления документами для администраторов
 *
 * @description Предоставляет полный контроль над документами:
 * - Просмотр всех документов с фильтрацией и поиском
 * - Массовые операции (удаление, изменение категорий)
 * - Детальная статистика по документам
 * - Управление правами доступа
 * - Экспорт данных
 */
export function AdminDocumentsPage() {
    const router = useRouter();
    const { deleteDocument } = useDocumentDelete();
    const { removeRecentDocument } = useRecentDocuments();

    const [filters, setFilters] = useState<DocumentFiltersType>({
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        search: undefined,
        categoryIds: undefined,
    });

    const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState<
        SearchResult | DocumentWithAuthor | null
    >(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [documentToDelete, setDocumentToDelete] = useState<string | null>(
        null
    );

    // Используем существующие хуки
    const { documents, pagination, isLoading, error, mutate } =
        useDocuments(filters);
    const { categories, isLoading: categoriesLoading } = useCategories();

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
            categoryIds: undefined,
        });
        setSelectedDocuments([]);
    };

    const handleSelectDocument = (documentId: string) => {
        setSelectedDocuments(prev =>
            prev.includes(documentId)
                ? prev.filter(id => id !== documentId)
                : [...prev, documentId]
        );
    };

    const handleSelectAll = (checked: boolean) => {
        setSelectedDocuments(checked ? documents.map(doc => doc.id) : []);
    };

    const handleView = (document: DocumentWithAuthor) => {
        setSelectedDocument(document);
        setViewerOpen(true);
    };

    const handleEdit = (document: DocumentWithAuthor) => {
        router.push(`${ADMIN_PATH}${DOCUMENT_EDIT_PAGE_PATH(document.id)}`);
    };

    const handleDelete = (documentId: string) => {
        setDocumentToDelete(documentId);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async (documentId: string) => {
        try {
            await deleteDocument(documentId);
            await mutate(); // Обновляем список документов
            removeRecentDocument(documentId);
            setDeleteDialogOpen(false);
            setDocumentToDelete(null);
        } catch (err) {
            console.error('Ошибка удаления:', err);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedDocuments.length === 0) return;

        try {
            // Удаляем документы по одному (можно оптимизировать через bulk API)
            for (const documentId of selectedDocuments) {
                await deleteDocument(documentId);
            }

            setSelectedDocuments([]);
            await mutate();
        } catch (err) {
            console.error('Ошибка массового удаления:', err);
        }
    };

    return (
        <Container maxWidth='xl' sx={{ py: 4, bgcolor: 'background.default' }}>
            {/* Заголовок и действия */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 3,
                    flexWrap: { xs: 'wrap', sm: 'nowrap' },
                    gap: 2,
                }}
            >
                <Typography
                    sx={{ textWrap: 'nowrap' }}
                    variant='h4'
                    component='h1'
                >
                    Управление документами
                </Typography>

                <Stack direction='row' spacing={2}>
                    <Button
                        variant='contained'
                        startIcon={<AddIcon />}
                        onClick={() =>
                            router.push(`${UPLOAD_PAGE_PATH}`)
                        }
                    >
                        Загрузить документ
                    </Button>

                    {selectedDocuments.length > 0 && (
                        <Button
                            variant='outlined'
                            color='error'
                            onClick={handleBulkDelete}
                        >
                            Удалить выбранные ({selectedDocuments.length})
                        </Button>
                    )}
                </Stack>
            </Box>

            {/* Ошибка */}
            {error && (
                <Alert severity='error' sx={{ mb: 3 }}>
                    {error.message}
                </Alert>
            )}
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    width: 'min-content',
                    overflow: 'auto',
                }}
            >
                {/* Фильтры */}
                <DocumentFilters
                    filters={filters}
                    onFiltersChange={handleFiltersChange}
                    categories={categories}
                    isLoading={categoriesLoading}
                    onReset={resetFilters}
                />
                {/* Таблица документов */}
                <DocumentTable
                    documents={documents}
                    isLoading={isLoading}
                    selectedDocuments={selectedDocuments}
                    onSelectDocument={handleSelectDocument}
                    onSelectAll={handleSelectAll}
                    onView={handleView}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
                {/* Пагинация */}
                {pagination && (
                    <TablePagination
                        component='div'
                        count={pagination.total}
                        page={pagination.page - 1}
                        onPageChange={(_, newPage) =>
                            setFilters(prev => ({ ...prev, page: newPage + 1 }))
                        }
                        rowsPerPage={pagination.limit}
                        onRowsPerPageChange={e => {
                            const newLimit = parseInt(e.target.value, 10);
                            setFilters(prev => ({
                                ...prev,
                                limit: newLimit,
                                page: 1,
                            }));
                        }}
                        labelRowsPerPage='Строк на странице:'
                        labelDisplayedRows={({ from, to, count }) =>
                            `${from}-${to} из ${count !== -1 ? count : `более ${to}`}`
                        }
                    />
                )}
            </Box>
            {/* Модальные окна */}
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

            <DeleteDocumentDialog
                open={deleteDialogOpen}
                document={
                    documents.find(d => d.id === documentToDelete) || null
                }
                onClose={() => {
                    setDeleteDialogOpen(false);
                    setDocumentToDelete(null);
                }}
                onConfirm={confirmDelete}
            />
        </Container>
    );
}
