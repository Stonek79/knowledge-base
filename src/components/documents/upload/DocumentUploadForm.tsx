'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { useState } from 'react';

import { Upload as UploadIcon } from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Stack,
    Typography,
} from '@mui/material';

import { ATTACHMENT_TYPE } from '@/constants/document';
import { MIME } from '@/constants/mime';
import { USER_ROLES } from '@/constants/user';
import { useAuth } from '@/lib/hooks/useAuth';
import { uploadFormSchema } from '@/lib/schemas/document';
import { BaseAttachment } from '@/lib/types/attachment';
import { UploadFormInput } from '@/lib/types/document';
import { SupportedMime } from '@/lib/types/mime';

import { AttachmentManager } from '../attachments/AttachmentManager';
import { DragDropZone } from './DragDropZone';
import { FilePreview } from './FilePreview';
import { MetadataForm } from './MetadataForm';
import { UploadProgress } from './UploadProgress';

// Type guard, чтобы TypeScript понимал, с каким объектом мы работаем
function isBaseAttachment(item: unknown): item is BaseAttachment {
    return !!item && typeof item === 'object' && 'id' in item;
}

// Хелпер для создания уникального "временного" ID для новых файлов
function getFileId(file: File): string {
    return `new_${file.name}_${file.lastModified}`;
}

export async function validateDocxFile(
    file: File
): Promise<{ valid: boolean; error?: string }> {
    if (file.type !== MIME.DOCX)
        return { valid: false, error: 'Поддерживаются только DOCX файлы' };
    if (file.size > 2 * 1024 * 1024)
        return { valid: false, error: 'Размер файла не должен превышать 2MB' };
    return { valid: true };
}

interface DocumentUploadFormProps {
    onSubmit?: (data: {
        metadata: Omit<UploadFormInput, 'file' | 'attachments'>;
        mainFile: File | null;
        attachments: (File | BaseAttachment)[];
    }) => Promise<void>;
    onCancel?: () => void;
    isLoading?: boolean;
    onClose?: () => void;
    initialData?: Omit<UploadFormInput, 'file'>;
    mode?: 'create' | 'edit';
    initialAttachments?: BaseAttachment[];
    onRemoveAttachment?(id: string): void;
}

export function DocumentUploadForm({
    onSubmit,
    onCancel,
    isLoading = false,
    onClose,
    initialData,
    initialAttachments,
    onRemoveAttachment,
    mode,
}: DocumentUploadFormProps) {
    const { user } = useAuth();
    const [uploadProgress, setUploadProgress] = useState(0);
    const [attachments, setAttachments] = useState<
        (BaseAttachment & { file?: File })[]
    >(initialAttachments || []);
    const [mainFile, setMainFile] = useState<File | null>(null);

    const {
        control,
        handleSubmit,
        setValue,
        setError,
        formState: { errors, isSubmitting },
        reset,
        clearErrors,
    } = useForm<UploadFormInput>({
        resolver: zodResolver(uploadFormSchema),
        defaultValues: {
            authorId: user?.id || '',
            title: initialData?.title || '',
            description: initialData?.description || '',
            categoryIds: initialData?.categoryIds || [],
            keywords: initialData?.keywords || '',
        },
    });

    const isUser = user?.role === USER_ROLES.USER;
    const isAdmin = user?.role === USER_ROLES.ADMIN;
    const canUpload = isAdmin || isUser;
    const isUploadingState = isLoading !== undefined ? isLoading : isSubmitting;

    const handleFileSelect = async (file: File) => {
        clearErrors('file');
        const { valid, error } = await validateDocxFile(file);
        if (!valid) {
            setError('file', { message: error });
            return;
        }

        setMainFile(file); // Сохраняем в локальный стейт
        // Автозаполнение названия из имени файла
        const baseName = file.name.replace(/\.[^.]+$/i, '');
        setValue('title', baseName);
    };

    const handleFileRemove = () => {
        setMainFile(null);
        setValue('title', '');
        clearErrors(['file']);
    };

    /** Переместить вложение вверх по локальному списку */
    const handleMoveUp = (id: string) => {
        setAttachments(prev => {
            const list = [...prev];
            const i = list.findIndex(a => a.id === id);
            if (i <= 0) return prev;
            const prevItem = list[i - 1];
            const currItem = list[i];
            if (!prevItem || !currItem) return prev;
            list[i - 1] = currItem;
            list[i] = prevItem;
            return list;
        });
    };

    /** Переместить вложение вниз по локальному списку */
    const handleMoveDown = (id: string) => {
        setAttachments(prev => {
            const list = [...prev];
            const i = list.findIndex(a => a.id === id);
            if (i < 0 || i >= list.length - 1) return prev;
            const currItem = list[i];
            const nextItem = list[i + 1];
            if (!currItem || !nextItem) return prev;
            list[i] = nextItem;
            list[i + 1] = currItem;
            return list;
        });
    };

    const onSubmitForm = (data: UploadFormInput) => {
        // Если родитель передал onSubmit, вызываем его с собранным пакетом
        if (onSubmit) {
            const submissionData = {
                metadata: {
                    authorId: data.authorId,
                    title: data.title,
                    description: data.description,
                    categoryIds: data.categoryIds,
                    keywords: data.keywords,
                },
                mainFile: mainFile, // Наш локальный стейт для основного файла
                attachments: attachments.map(att => att.file ?? att), // Наш локальный стейт для приложений
            };

            void onSubmit(submissionData);
        }
    };

    const handleCancel = () => {
        if (onClose) {
            onClose();
        } else if (onCancel) {
            onCancel();
        }
        reset();
        setUploadProgress(0);
    };

    if (!canUpload) {
        return (
            <Alert severity='warning'>
                У вас нет прав для загрузки документов
            </Alert>
        );
    }

    return (
        <Box
            component='form'
            onSubmit={handleSubmit(onSubmitForm)}
            sx={{ maxWidth: 800, mx: 'auto' }}
        >
            <Stack spacing={3}>
                <Typography variant='h5' component='h1' gutterBottom>
                    Загрузка документа
                </Typography>

                {/* Drag & Drop зона */}
                <DragDropZone
                    key={mainFile ? 'has-file' : 'no-file'}
                    onFileSelect={handleFileSelect}
                    onError={error => console.error(error)}
                    disabled={isUploadingState}
                />

                {/* Выбранный файл */}
                {mainFile && (
                    <FilePreview
                        file={mainFile}
                        onRemove={handleFileRemove}
                        disabled={isUploadingState}
                    />
                )}

                {/* Ошибки валидации */}
                {Object.keys(errors).length > 0 && (
                    <Alert severity='error'>
                        {Object.values(errors).map((error, index) => (
                            <div key={index}>{error?.message as string}</div>
                        ))}
                    </Alert>
                )}

                {/* Форма метаданных */}
                <MetadataForm
                    control={control}
                    errors={errors}
                    disabled={isUploadingState}
                />

                <AttachmentManager
                    mode={mode ?? 'create'}
                    attachments={attachments}
                    onAdd={file => {
                        const newAttachment: BaseAttachment & { file: File } = {
                            id: getFileId(file),
                            fileName: file.name,
                            fileSize: file.size,
                            mimeType: file.type as SupportedMime,
                            attachmentType: ATTACHMENT_TYPE.ATTACHMENT,
                            createdAt: new Date(),
                            file: file,
                        };
                        setAttachments(prev => [...prev, newAttachment]);
                    }}
                    onRemove={id => {
                        // Сообщаем родителю, что этот ID нужно будет удалить при коммите
                        if (onRemoveAttachment) {
                            const item = attachments.find(a => a.id === id);
                            // Вызываем колбэк только для существующих, а не для только что добавленных файлов
                            if (item && isBaseAttachment(item) && !item.file) {
                                onRemoveAttachment(id);
                            }
                        }
                        // В любом случае удаляем из локального UI
                        setAttachments(prev => prev.filter(a => a.id !== id));
                    }}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                    isLoading={isUploadingState}
                />

                {/* Прогресс загрузки */}
                {isUploadingState && (
                    <UploadProgress
                        progress={uploadProgress}
                        isProcessing={isUploadingState}
                    />
                )}

                {/* Кнопки действий */}
                <Box
                    sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}
                >
                    {(onCancel || onClose) && (
                        <Button
                            onClick={handleCancel}
                            disabled={isUploadingState}
                            variant='outlined'
                        >
                            Отмена
                        </Button>
                    )}
                    <Button
                        type='submit'
                        variant='contained'
                        disabled={
                            mode === 'create' && !mainFile
                                ? true
                                : isUploadingState
                        }
                        startIcon={
                            isUploadingState ? (
                                <CircularProgress size={16} />
                            ) : (
                                <UploadIcon />
                            )
                        }
                    >
                        {isUploadingState
                            ? 'Загрузка...'
                            : initialData
                              ? 'Сохранить'
                              : 'Загрузить документ'}
                    </Button>
                </Box>
            </Stack>
        </Box>
    );
}
