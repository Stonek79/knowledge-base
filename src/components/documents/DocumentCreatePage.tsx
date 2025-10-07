'use client';

import { useState } from 'react';

import {
    ArrowBack as ArrowBackIcon,
    CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import {
    Alert,
    Breadcrumbs,
    Button,
    Container,
    Link,
    Typography,
} from '@mui/material';
import { usePathname, useRouter } from 'next/navigation';

import {
    ADMIN_PATH,
    DOCUMENTS_BASE_PATH,
    DOCUMENTS_PAGE_PATH,
} from '@/constants/api';
import { USER_ROLES } from '@/constants/user';
import { useDocumentMutation } from '@/lib/hooks/documents/useDocumentMutation';
import { useAuth } from '@/lib/hooks/useAuth';
import type { BaseAttachment } from '@/lib/types/attachment';
import type { ComposeChangeSet } from '@/lib/types/compose';
import type { UploadFormInput } from '@/lib/types/document';

import { LoadingPage } from '../states/LoadingPage';

import { DocumentUploadForm } from './upload/DocumentUploadForm';

/**
 * Страница загрузки документов
 *
 * @description Предоставляет интерфейс для загрузки новых документов:
 * - Интеграция с DocumentUpload компонентом
 * - Проверка прав доступа (ADMIN/USER)
 * - Обработка успешной загрузки с редиректом
 * - Обработка ошибок загрузки
 *
 * @returns JSX компонент страницы загрузки
 */
export function DocumentCreatePage() {
    const router = useRouter();
    const pathname = usePathname();
    const { user, isLoading: isAuthLoading } = useAuth();
    const { stageFile, commit, isLoading, error, clearError } =
        useDocumentMutation();
    const [uploadSuccess, setUploadSuccess] = useState(false);

    const isUser = user?.role === USER_ROLES.USER;
    const isAdmin = user?.role === USER_ROLES.ADMIN;
    const canUpload = isAdmin || isUser;

    /**
     * Обработчик успешной загрузки документа
     *
     * @param metaata - Данные формы с файлом и метаданными
     * @param mainFile - Основной файл документа
     * @param attachments - Данные формы с файлами приложений
     *
     */
    const handleCommit = async (data: {
        metadata: Omit<UploadFormInput, 'file' | 'attachments'>;
        mainFile: File | null;
        attachments: (File | BaseAttachment)[];
    }) => {
        if (!data.mainFile) {
            // Можно установить локальную ошибку, чтобы показать пользователю
            console.error('Основной файл обязателен для создания документа.');
            return;
        }

        clearError();
        setUploadSuccess(false);

        try {
            const attachmentsWithClientId = data.attachments.map(att => ({
                clientId: crypto.randomUUID(), // Для создания все ID новые
                item: att,
            }));

            // 1. Staging: грузим все файлы
            const mainFileStagedResult = await stageFile(data.mainFile);
            const mainFileStaged = {
                ...mainFileStagedResult,
                clientId: crypto.randomUUID(),
            };

            const newAttachments = attachmentsWithClientId.filter(
                ({ item }) => item instanceof File
            );

            const uploadPromises = newAttachments.map(async attachmentInfo => {
                const stagedFile = await stageFile(attachmentInfo.item as File);
                return {
                    ...stagedFile,
                    clientId: attachmentInfo.clientId,
                };
            });

            const attachmentsStagedResults =
                await Promise.allSettled(uploadPromises);

            const attachmentsToAdd = attachmentsStagedResults.map(
                (result, index) => {
                    if (result.status === 'rejected') {
                        const failedFileName = (
                            newAttachments[index]!.item as File
                        ).name;
                        throw new Error(
                            `Не удалось загрузить файл: ${failedFileName}`
                        );
                    }
                    return result.value;
                }
            );

            // 2. Commit: отправляем один JSON-пакет на сервер
            const finalPayload: ComposeChangeSet = {
                operationId: crypto.randomUUID(),
                metadata: data.metadata,
                replaceMain: mainFileStaged,
                addAttachments: attachmentsToAdd,
                deleteAttachmentIds: [],
                reorder: attachmentsWithClientId.map(
                    ({ clientId, item }, index) => ({
                        clientId,
                        attachmentId: 'id' in item ? item.id : undefined,
                        order: index,
                    })
                ),
            };

            const result = await commit(null, finalPayload); // `null` id означает создание

            setUploadSuccess(true);

            // 3. Успех: перенаправляем на страницу документа через 2 секунды
            setTimeout(() => {
                router.push(`${DOCUMENTS_BASE_PATH}/${result.docId}`);
            }, 2000);
        } catch (err) {
            console.error('Ошибка при создании документа:', err);
            // Ошибка уже будет в `error` из хука
        }
    };

    const handleOnClickDocuments = () => {
        if (pathname.includes(ADMIN_PATH)) {
            router.push(`${ADMIN_PATH}${DOCUMENTS_BASE_PATH}`);
        } else {
            router.push(DOCUMENTS_BASE_PATH);
        }
    };

    /**
     * Обработчик отмены загрузки
     */
    const handleCancel = () => {
        router.push(DOCUMENTS_PAGE_PATH);
    };

    if (isAuthLoading) {
        return <LoadingPage />;
    }

    // Проверка прав доступа
    if (!canUpload) {
        return (
            <Container maxWidth='lg' sx={{ py: 4 }}>
                <Alert severity='warning' sx={{ mb: 3 }}>
                    У вас нет прав для загрузки документов. Требуется роль ADMIN
                    или USER.
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
                    onClick={handleOnClickDocuments}
                    sx={{ textDecoration: 'none' }}
                >
                    Документы
                </Link>
                <Typography color='text.primary'>Загрузка документа</Typography>
            </Breadcrumbs>

            {/* Заголовок */}
            <Typography variant='h4' component='h1' gutterBottom>
                Загрузка документа
            </Typography>
            <Typography variant='body1' color='text.secondary' sx={{ mb: 4 }}>
                Загрузите новый документ в формате DOCX. Максимальный размер
                файла: 2MB.
            </Typography>

            {/* Сообщение об успехе */}
            {uploadSuccess && !error && (
                <Alert
                    severity='success'
                    icon={<CheckCircleIcon />}
                    sx={{ mb: 3 }}
                >
                    Документ успешно загружен! Перенаправление на страницу
                    документов...
                </Alert>
            )}

            {/* Ошибка */}
            {error && (
                <Alert severity='error' sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* Компонент загрузки */}
            <DocumentUploadForm
                mode='create'
                onSubmit={handleCommit}
                onCancel={handleCancel}
                isLoading={isLoading}
            />
        </Container>
    );
}
