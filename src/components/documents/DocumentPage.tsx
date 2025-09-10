'use client';

import { useEffect, useState } from 'react';

import { useParams, useRouter, useSearchParams } from 'next/navigation';

import {
    Archive as ArchiveIcon,
    ArrowBack as ArrowBackIcon,
    Person as PersonIcon,
    Schedule as ScheduleIcon,
    Tag as TagIcon,
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Breadcrumbs,
    Button,
    Chip,
    CircularProgress,
    Container,
    Link,
    Paper,
    Stack,
    Typography,
} from '@mui/material';

import { DOCUMENTS_BASE_PATH, DOCUMENT_EDIT_PAGE_PATH } from '@/constants/api';
import { USER_ROLES } from '@/constants/user';
import { useDocument } from '@/lib/hooks/documents/useDocument';
import { useDocumentDelete } from '@/lib/hooks/documents/useDocumentDelete';
import { useRecentDocuments } from '@/lib/hooks/documents/useRecentDocuments';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatDate } from '@/utils/date';
import { formatFileSize } from '@/utils/formatFileSize';

import { DeleteDocumentDialog } from './admin/DeleteDocumentDialog';
import { DownloadButtons } from './download/DownloadButtons';
import { DocumentViewer } from './viewer/DocumentViewer';

/**
 * Страница отдельного документа
 *
 * @description Отображает полную информацию о документе:
 * - Метаданные и содержимое
 * - Навигация между документами
 * - Действия в зависимости от роли
 * - Хлебные крошки для навигации
 *
 * @param params - Параметры маршрута (documentId)
 */
export function DocumentPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const documentId = params.documentId as string;

    const { removeRecentDocument } = useRecentDocuments();

    const { document, isLoading, error } = useDocument(documentId);
    const { deleteDocument, isDeleting, deleteError, clearError } =
        useDocumentDelete();

    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    useEffect(() => {
        if (!document) return;
        const open = searchParams.get('open');
        if (open === '1' || open === 'true' || open === 'preview') {
            setIsViewerOpen(true);
        }
    }, [document, searchParams]);

    const handleEdit = (docId: string) => {
        router.push(DOCUMENT_EDIT_PAGE_PATH(docId));
    };

    const handleDelete = (documentId: string) => {
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async (documentId: string) => {
        try {
            await deleteDocument(documentId);

            removeRecentDocument(documentId);
            setDeleteDialogOpen(false);

            if (!isDeleting && !deleteError) {
                router.push(DOCUMENTS_BASE_PATH);
            }
        } catch (err) {
            console.error('Ошибка удаления:', err);
        }
    };

    if (isLoading) {
        return (
            <Container maxWidth='lg' sx={{ py: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                </Box>
            </Container>
        );
    }

    if (error || !document) {
        return (
            <Container maxWidth='lg' sx={{ py: 4 }}>
                <Alert severity='error' sx={{ mb: 3 }}>
                    {error || 'Документ не найден'}
                </Alert>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => router.push(DOCUMENTS_BASE_PATH)}
                >
                    Вернуться к документам
                </Button>
            </Container>
        );
    }

    return (
        <Container maxWidth='lg' sx={{ py: 4 }}>
            {/* Хлебные крошки */}
            <Breadcrumbs sx={{ mb: 3 }}>
                <Link
                    component='button'
                    variant='body1'
                    onClick={() => router.push(DOCUMENTS_BASE_PATH)}
                    sx={{ textDecoration: 'none' }}
                >
                    Документы
                </Link>
                <Typography color='text.primary'>{document.title}</Typography>
            </Breadcrumbs>

            {/* Заголовок и действия */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    mb: 3,
                }}
            >
                <Box sx={{ flex: 1 }}>
                    <Typography variant='h4' component='h1' gutterBottom>
                        {document.title}
                    </Typography>

                    {/* Метаданные документа */}
                    <Paper variant='outlined' sx={{ p: 2 }}>
                        <Typography variant='h6' gutterBottom>
                            Информация о документе
                        </Typography>
                        <Stack spacing={2}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                }}
                            >
                                <PersonIcon color='action' fontSize='small' />
                                <Typography
                                    variant='body2'
                                    color='text.secondary'
                                >
                                    Автор: {document?.author?.username}
                                </Typography>
                            </Box>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                }}
                            >
                                <ScheduleIcon color='action' fontSize='small' />
                                <Typography
                                    variant='body2'
                                    color='text.secondary'
                                >
                                    Создан: {formatDate(document?.createdAt)}
                                </Typography>
                            </Box>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                }}
                            >
                                <ArchiveIcon color='action' fontSize='small' />
                                <Typography
                                    variant='body2'
                                    color='text.secondary'
                                >
                                    Размер: {formatFileSize(document.fileSize)}
                                </Typography>
                            </Box>
                            {document.attachments.length > 0 && (
                                <Box>
                                    <Typography
                                        variant='body1'
                                        color='text.primary'
                                    >
                                        {`Приложения (всего ${document.attachments.length}):`}
                                    </Typography>
                                    {document.attachments.map(
                                        (attachment, i) => (
                                            <Typography
                                                variant='body2'
                                                color='text.secondary'
                                                key={attachment.id}
                                            >
                                                {`${i + 1}. ${attachment.fileName}`}
                                            </Typography>
                                        )
                                    )}
                                </Box>
                            )}
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                }}
                            >
                                <Typography
                                    variant='body2'
                                    color='text.secondary'
                                >
                                    Просмотров: {document.viewCount}
                                </Typography>
                            </Box>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                }}
                            >
                                <Typography
                                    variant='body2'
                                    color='text.secondary'
                                >
                                    Скачиваний: {document.downloadCount}
                                </Typography>
                            </Box>
                        </Stack>
                    </Paper>

                    {/* Описание */}
                    {document.description && (
                        <Paper variant='outlined' sx={{ p: 2 }}>
                            <Typography variant='h6' gutterBottom>
                                Описание
                            </Typography>
                            <Typography variant='body2' color='text.secondary'>
                                {document.description}
                            </Typography>
                        </Paper>
                    )}

                    {/* Категории */}
                    {document.categories && document.categories.length > 0 && (
                        <Paper variant='outlined' sx={{ p: 2 }}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    mb: 1,
                                }}
                            >
                                <TagIcon color='action' fontSize='small' />
                                <Typography variant='h6'>Категории</Typography>
                            </Box>
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: 1,
                                }}
                            >
                                {document.categories.map(docCategory => (
                                    <Chip
                                        key={docCategory.id}
                                        label={docCategory.category.name}
                                        size='small'
                                        sx={{
                                            backgroundColor:
                                                docCategory.category.color,
                                            color: 'white',
                                            '&:hover': {
                                                backgroundColor:
                                                    docCategory.category.color,
                                                opacity: 0.8,
                                            },
                                        }}
                                    />
                                ))}
                            </Box>
                        </Paper>
                    )}
                </Box>
            </Box>

            {/* Кнопки действий */}
            <Stack direction='row' spacing={2} sx={{ mb: 3 }}>
                <Button
                    variant='contained'
                    onClick={() => setIsViewerOpen(true)}
                >
                    Открыть документ
                </Button>

                <DownloadButtons documentId={document.id} />
                {(user?.role === USER_ROLES.ADMIN ||
                    document.authorId === user?.id) && (
                    <Button
                        variant='outlined'
                        onClick={() => handleEdit(documentId)}
                    >
                        Редактировать
                    </Button>
                )}
                {user?.role === USER_ROLES.ADMIN && (
                    <Button
                        variant='outlined'
                        color='error'
                        onClick={() => handleDelete(document.id)}
                    >
                        Удалить
                    </Button>
                )}
            </Stack>

            {/* DocumentViewer */}
            {document?.id && (
                <DocumentViewer
                    document={document}
                    open={isViewerOpen}
                    onClose={() => setIsViewerOpen(false)}
                />
            )}

            {deleteError && (
                <Box>
                    <Alert severity='error' sx={{ mb: 3 }}>
                        {`Ошибка удаления файла: ${deleteError}`}
                    </Alert>
                    <Button
                        onClick={() => {
                            clearError();
                            router.refresh();
                        }}
                    >
                        Попробовать снова
                    </Button>
                </Box>
            )}

            <DeleteDocumentDialog
                open={deleteDialogOpen}
                document={document || null}
                onClose={() => {
                    setDeleteDialogOpen(false);
                }}
                onConfirm={confirmDelete}
            />
        </Container>
    );
}
