'use client';

import { Fragment } from 'react';

import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import {
    Alert,
    Box,
    Button,
    Divider,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Skeleton,
    Tooltip,
    Typography,
} from '@mui/material';

import type { BaseAttachment } from '@/lib/types/attachment';

export type AttachmentManagerProps = {
    /** Режим работы: создание или редактирование */
    mode: 'create' | 'edit';
    /** Текущий список приложений (в нужном порядке) */
    attachments: BaseAttachment[];
    /** Добавить одно приложение */
    onAdd(file: File): void;
    /** Удалить приложение по id */
    onRemove(attachmentId: string): void;
    /** Сдвинуть приложение вверх */
    onMoveUp?(attachmentId: string): void;
    /** Сдвинуть приложение вниз */
    onMoveDown?(attachmentId: string): void;
    /** Флаги состояния */
    isLoading?: boolean;
    error?: string | null;
};

export function AttachmentManager({
    mode,
    onMoveUp,
    onMoveDown,
    attachments,
    isLoading,
    error,
    onAdd,
    onRemove,
}: AttachmentManagerProps) {
    return (
        <Box sx={{ mt: 4 }}>
            <Typography variant='h6'>Приложения</Typography>

            <Box sx={{ mt: 1, mb: 2 }}>
                <Button
                    component='label'
                    disabled={isLoading || !!error}
                    variant='contained'
                    tabIndex={-1}
                    startIcon={<CloudUploadIcon />}
                >
                    Добавить приложение
                    <input
                        type='file'
                        hidden
                        onChange={e => {
                            const f = e.target.files?.[0];
                            if (f) void onAdd(f);
                            e.currentTarget.value = '';
                        }}
                        accept='.doc,.docx,.pdf'
                    />
                </Button>
            </Box>

            {error && (
                <Alert severity='error' sx={{ mt: 1, mb: 2 }}>
                    {error}
                </Alert>
            )}
            {isLoading && (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 2,
                    }}
                >
                    <Skeleton variant='text' width={100} height={24} />
                    <Skeleton variant='text' width={100} height={24} />
                    <Skeleton variant='text' width={100} height={24} />
                </Box>
            )}
            <List aria-label='attachments' dense disablePadding>
                {attachments.map((a, index) => (
                    <Fragment key={a.id}>
                        <ListItem
                            aria-label='attachment'
                            secondaryAction={
                                <>
                                    <IconButton
                                        edge='end'
                                        aria-label='delete'
                                        onClick={async () => {
                                            await onRemove(a.id);
                                        }}
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </>
                            }
                        >
                            {/*TODO: Добавить просмотр при нажатии на файл */}
                            <ListItemText
                                sx={{ flex: '0 0 auto' }}
                                primary={`${index + 1}. `}
                            />
                            <ListItemButton>
                                <ListItemText
                                    sx={{ textWrap: 'nowrap' }}
                                    primary={`${a.fileName} · ${(a.fileSize / 1024).toFixed(1)} KB`}
                                />
                            </ListItemButton>
                            <Tooltip title='Вверх'>
                                <span>
                                    <IconButton
                                        size='small'
                                        onClick={() => onMoveUp?.(a.id)}
                                        disabled={!onMoveUp || index === 0}
                                        aria-label='move up'
                                    >
                                        <ArrowUpwardIcon fontSize='inherit' />
                                    </IconButton>
                                </span>
                            </Tooltip>

                            <Tooltip title='Вниз'>
                                <span>
                                    <IconButton
                                        size='small'
                                        onClick={() => onMoveDown?.(a.id)}
                                        disabled={
                                            !onMoveDown ||
                                            index === attachments.length - 1
                                        }
                                        aria-label='move down'
                                    >
                                        <ArrowDownwardIcon fontSize='inherit' />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </ListItem>
                        <Divider component='li' />
                    </Fragment>
                ))}
                {attachments.length === 0 && (
                    <ListItem>
                        <ListItemText primary='Приложений нет' />
                    </ListItem>
                )}
            </List>
        </Box>
    );
}
