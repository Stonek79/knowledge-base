'use client'

import { Add as AddIcon } from '@mui/icons-material'
import {
    Alert,
    Box,
    Button,
    Container,
    Stack,
    TablePagination,
    Typography,
} from '@mui/material'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import {
    ADMIN_PATH,
    DOCUMENT_EDIT_PAGE_PATH,
    UPLOAD_PAGE_PATH,
} from '@/constants/api'
import { useCategories } from '@/lib/hooks/documents/useCategories'
import { useDocumentDelete } from '@/lib/hooks/documents/useDocumentDelete'
import { useDocumentRestore } from '@/lib/hooks/documents/useDocumentRestore'
import { useDocuments } from '@/lib/hooks/documents/useDocuments'
import { useRecentDocuments } from '@/lib/hooks/documents/useRecentDocuments'
import type {
    DocumentFilters as DocumentFiltersType,
    DocumentWithAuthor,
    SearchResult,
} from '@/lib/types/document'

import { DocumentFilters } from './admin/DocumentFilters'
import { DocumentTable } from './admin/DocumentTable'
import { DeleteDocumentDialog } from './delete/DeleteDocumentDialog'

const DocumentViewer = dynamic(
    () => import('./viewer/DocumentViewer').then(m => m.DocumentViewer),
    { ssr: false }
)

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
    const router = useRouter()
    const { deleteDocument } = useDocumentDelete()
    const { removeRecentDocument } = useRecentDocuments()
    const { restoreDocument } = useDocumentRestore()

    const [filters, setFilters] = useState<DocumentFiltersType>({
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        q: undefined,
        categoryIds: undefined,
        authorId: undefined,
        status: undefined,
    })

    const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
    const [viewerOpen, setViewerOpen] = useState(false)
    const [selectedDocument, setSelectedDocument] = useState<
        SearchResult | DocumentWithAuthor | null
    >(null)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [documentToDelete, setDocumentToDelete] = useState<{
        id: string
        title: string
        deletedAt: boolean
    } | null>(null)

    const query = useMemo(() => {
        return filters.q
    }, [filters.q])

    // Используем существующие хуки
    const { documents, pagination, isLoading, error, mutate } =
        useDocuments(filters)
    const { categories, isLoading: categoriesLoading } = useCategories()

    const handleFiltersChange = (newFilters: DocumentFiltersType) => {
        setFilters(newFilters)
    }

    const resetFilters = () => {
        setFilters({
            page: 1,
            limit: 10,
            sortBy: 'createdAt',
            sortOrder: 'desc',
            q: undefined,
            categoryIds: undefined,
            status: undefined,
        })
        setSelectedDocuments([])
    }

    const handleSelectDocument = (documentId: string) => {
        setSelectedDocuments(prev =>
            prev.includes(documentId)
                ? prev.filter(id => id !== documentId)
                : [...prev, documentId]
        )
    }

    const handleSelectAll = (checked: boolean) => {
        setSelectedDocuments(checked ? documents.map(doc => doc.id) : [])
    }

    const handleView = (document: DocumentWithAuthor) => {
        setSelectedDocument(document)
        setViewerOpen(true)
    }

    const handleEdit = (document: DocumentWithAuthor) => {
        router.push(`${ADMIN_PATH}${DOCUMENT_EDIT_PAGE_PATH(document.id)}`)
    }

    const handleDelete = (document: {
        id: string
        title: string
        deletedAt: boolean
    }) => {
        setDocumentToDelete(document)
        setDeleteDialogOpen(true)
    }

    const confirmSoftDelete = async (documentId: string) => {
        try {
            // `deleteDocument` без опций по умолчанию выполняет мягкое удаление
            await deleteDocument(documentId)
            await mutate()
            removeRecentDocument(documentId)
            setDeleteDialogOpen(false)
            setDocumentToDelete(null)
        } catch (err) {
            console.error('Ошибка мягкого удаления:', err)
        }
    }

    const handleRestore = async (documentId: string) => {
        try {
            await restoreDocument(documentId)
            await mutate()
            setDeleteDialogOpen(false)
            setDocumentToDelete(null)
        } catch (err) {
            console.error('Ошибка восстановления документа:', err)
        }
    }

    const handleHardDelete = async (documentId: string) => {
        try {
            // Вызываем хук с опцией hard: true для безвозвратного удаления
            await deleteDocument(documentId, { hard: true })
            await mutate()
            removeRecentDocument(documentId)
            setDeleteDialogOpen(false)
            setDocumentToDelete(null)
        } catch (err) {
            console.error('Ошибка безвозвратного удаления:', err)
        }
    }

    const handleBulkDelete = async () => {
        if (selectedDocuments.length === 0) return

        try {
            // Удаляем документы по одному (можно оптимизировать через bulk API)
            for (const documentId of selectedDocuments) {
                await deleteDocument(documentId)
            }

            setSelectedDocuments([])
            await mutate()
        } catch (err) {
            console.error('Ошибка массового удаления:', err)
        }
    }

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
                        onClick={() => router.push(`${UPLOAD_PAGE_PATH}`)}
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
                    query={query}
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
                            const newLimit = parseInt(e.target.value, 10)
                            setFilters(prev => ({
                                ...prev,
                                limit: newLimit,
                                page: 1,
                            }))
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
                        setViewerOpen(false)
                        setSelectedDocument(null)
                    }}
                />
            )}

            <DeleteDocumentDialog
                open={deleteDialogOpen}
                document={documentToDelete}
                view={documentToDelete?.deletedAt ? 'deleted' : 'active'}
                onClose={() => {
                    setDeleteDialogOpen(false)
                    setDocumentToDelete(null)
                }}
                onSoftDelete={confirmSoftDelete}
                onRestore={handleRestore}
                onHardDelete={handleHardDelete}
                isAdmin={true}
            />
        </Container>
    )
}
