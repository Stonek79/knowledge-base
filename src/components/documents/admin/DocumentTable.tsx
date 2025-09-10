'use client';

import {
    Delete as DeleteIcon,
    Edit as EditIcon,
    Visibility as VisibilityIcon,
} from '@mui/icons-material';
import {
    Checkbox,
    Chip,
    IconButton,
    Paper,
    Skeleton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material';

import { DocumentWithAuthor } from '@/lib/types/document';
import { formatFileSize } from '@/utils/formatFileSize';

interface DocumentTableProps {
    documents: DocumentWithAuthor[];
    isLoading: boolean;
    selectedDocuments: string[];
    onSelectDocument: (documentId: string) => void;
    onSelectAll: (checked: boolean) => void;
    onView: (document: DocumentWithAuthor) => void;
    onEdit: (document: DocumentWithAuthor) => void;
    onDelete: (documentId: string) => void;
}

/**
 * Таблица документов для административной панели
 *
 * @description Отображает список документов с возможностью:
 * - Массового выбора документов
 * - Просмотра, редактирования, удаления
 * - Отображения метаданных (автор, категории, статистика)
 */
export function DocumentTable({
    documents,
    isLoading,
    selectedDocuments,
    onSelectDocument,
    onSelectAll,
    onView,
    onEdit,
    onDelete,
}: DocumentTableProps) {
    if (isLoading) {
        return (
            <TableContainer component={Paper} sx={{ overflowX: 'visible', maxWidth: '100%' }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell padding='checkbox'>
                                <Skeleton width={20} height={20} />
                            </TableCell>
                            <TableCell>Название</TableCell>
                            <TableCell>Автор</TableCell>
                            <TableCell>Категории</TableCell>
                            <TableCell>Размер</TableCell>
                            <TableCell>Просмотры</TableCell>
                            <TableCell>Создан</TableCell>
                            <TableCell>Действия</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {[1, 2, 3].map(i => (
                            <TableRow key={i}>
                                <TableCell padding='checkbox'>
                                    <Skeleton width={20} height={20} />
                                </TableCell>
                                <TableCell>
                                    <Skeleton />
                                </TableCell>
                                <TableCell>
                                    <Skeleton />
                                </TableCell>
                                <TableCell>
                                    <Skeleton />
                                </TableCell>
                                <TableCell>
                                    <Skeleton />
                                </TableCell>

                                <TableCell>
                                    <Skeleton />
                                </TableCell>
                                <TableCell>
                                    <Skeleton />
                                </TableCell>
                                <TableCell>
                                    <Skeleton />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        );
    }

    if (documents.length === 0) {
        return (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
                Документы не найдены
            </Paper>
        );
    }

    return (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell padding='checkbox'>
                            <Checkbox
                                checked={
                                    selectedDocuments.length ===
                                        documents.length && documents.length > 0
                                }
                                indeterminate={
                                    selectedDocuments.length > 0 &&
                                    selectedDocuments.length < documents.length
                                }
                                onChange={e => onSelectAll(e.target.checked)}
                            />
                        </TableCell>
                        <TableCell>Название</TableCell>
                        <TableCell>Автор</TableCell>
                        <TableCell>Категории</TableCell>
                        <TableCell>Размер</TableCell>
                        <TableCell>Просмотры</TableCell>
                        <TableCell>Создан</TableCell>
                        <TableCell>Действия</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {documents.map(document => (
                        <TableRow key={document.id}>
                            <TableCell padding='checkbox'>
                                <Checkbox
                                    checked={selectedDocuments.includes(
                                        document.id
                                    )}
                                    onChange={() =>
                                        onSelectDocument(document.id)
                                    }
                                />
                            </TableCell>
                            <TableCell
                                sx={{
                                    minWidth: 200,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {document.title}
                            </TableCell>
                            <TableCell>{document.author.username}</TableCell>
                            <TableCell>
                                <Stack direction='row' spacing={0.5}>
                                    {document.categories.map(docCategory => (
                                        <Chip
                                            key={docCategory.id}
                                            label={docCategory.category.name}
                                            size='small'
                                            sx={{
                                                backgroundColor:
                                                    docCategory.category.color,
                                                color: 'white',
                                            }}
                                        />
                                    ))}
                                </Stack>
                            </TableCell>
                            <TableCell sx={{ textWrap: 'nowrap' }}>
                                {formatFileSize(document.fileSize)}
                            </TableCell>
                            <TableCell>{document.viewCount}</TableCell>
                            <TableCell>
                                {new Date(
                                    document.createdAt
                                ).toLocaleDateString('ru-RU')}
                            </TableCell>
                            <TableCell>
                                <Stack direction='row' spacing={0.5}>
                                    <IconButton
                                        size='small'
                                        onClick={() => onView(document)}
                                        title='Просмотр'
                                    >
                                        <VisibilityIcon />
                                    </IconButton>
                                    <IconButton
                                        size='small'
                                        onClick={() => onEdit(document)}
                                        title='Редактировать'
                                    >
                                        <EditIcon />
                                    </IconButton>
                                    <IconButton
                                        size='small'
                                        onClick={() => onDelete(document.id)}
                                        title='Удалить'
                                        color='error'
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </Stack>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
