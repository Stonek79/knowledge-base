'use client'

import { Alert, Breadcrumbs, Container, Link, Typography } from '@mui/material'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

import { ADMIN_PATH, DOCUMENTS_BASE_PATH } from '@/constants/api'
import { useDocument } from '@/lib/hooks/documents/useDocument'
import { useDocumentMutation } from '@/lib/hooks/documents/useDocumentMutation'
import type { BaseAttachment } from '@/lib/types/attachment'
import type { ComposeChangeSet } from '@/lib/types/compose'
import type { UploadFormInput } from '@/lib/types/document'

import { NoResults } from '../states/NoResults'

import { DocumentUploadForm } from './upload/DocumentUploadForm'

export function DocumentEditPage() {
    const params = useParams()
    const router = useRouter()
    const pathname = usePathname()

    const documentId = params.documentId as string

    const { document, mutate } = useDocument(documentId)

    const {
        stageFile,
        commit,
        isLoading: isUpdating,
        error: updateError,
        clearError,
    } = useDocumentMutation()
    const [deletedAttachmentIds, setDeletedAttachmentIds] = useState<string[]>(
        []
    )

    const [success, setSuccess] = useState(false)

    const initialData: Omit<UploadFormInput, 'file'> = {
        authorId: document?.authorId || '',
        title: document?.title || '',
        description: document?.description || '',
        categoryIds: document?.categories.map(c => c.categoryId) || [],
        keywords: document?.keywords?.join(',') || '',
        isConfidential: document?.isConfidential || false,
        isSecret: document?.isSecret || false,
        accessCode: document?.accessCodeHash || '',
        confidentialAccessUserIds:
            document?.confidentialAccessUsers?.map(u => u.userId) || [],
    }

    if (!document) return <NoResults />

    const handleRemoveAttachment = (id: string) => {
        // Если это существующее приложение, помечаем его на удаление для будущего коммита
        const isExisting = document?.attachments.some(a => a.id === id)
        if (isExisting) {
            setDeletedAttachmentIds(prev => [...prev, id])
        }
    }

    const handleOnClickDocuments = () => {
        if (pathname.includes(ADMIN_PATH)) {
            router.push(`${ADMIN_PATH}${DOCUMENTS_BASE_PATH}`)
        } else {
            router.push(DOCUMENTS_BASE_PATH)
        }
    }

    const handleFormSubmit = async (data: {
        metadata: Omit<UploadFormInput, 'file' | 'attachments'>
        mainFile: File | null
        attachments: (File | BaseAttachment)[]
    }) => {
        clearError()

        try {
            // --- Подготовительный этап: присваиваем clientId всем элементам ---
            const attachmentsWithClientId = data.attachments.map(att => {
                // Проверяем, что это не File, И что у него есть id.
                // Это гарантирует, что мы используем id только от существующих
                // в БД приложений.
                const isExistingAttachment =
                    att instanceof File === false && 'id' in att

                return {
                    clientId: isExistingAttachment
                        ? att.id
                        : crypto.randomUUID(),
                    item: att,
                }
            })

            // 1. Staging: грузим только НОВЫЕ файлы
            const mainFileStagedResult = data.mainFile
                ? await stageFile(data.mainFile)
                : undefined

            const mainFileStaged = mainFileStagedResult
                ? (({ originalName, ...rest }) => ({
                      ...rest,
                      fileName: originalName,
                      clientId: crypto.randomUUID(),
                  }))(mainFileStagedResult)
                : undefined

            const newAttachments = attachmentsWithClientId.filter(
                ({ item }) => item instanceof File
            )

            const attachmentsStagedResults = await Promise.allSettled(
                newAttachments.map(async attachment => {
                    const stagedFileResult = await stageFile(
                        attachment.item as File
                    )
                    const { originalName, ...rest } = stagedFileResult
                    return {
                        ...rest,
                        fileName: originalName,
                        clientId: attachment?.clientId,
                    }
                })
            )

            // Собираем данные для `addAttachments`, связывая staged-результат с clientId
            const attachmentsToAdd = attachmentsStagedResults.map(
                (result, index) => {
                    if (result.status === 'rejected') {
                        const failedFileName = (
                            newAttachments[index]?.item as File
                        ).name
                        throw new Error(
                            `Не удалось загрузить файл: ${failedFileName}`
                        )
                    }
                    return result.value
                }
            )

            // 2. Commit: собираем полный пакет изменений
            const finalPayload: ComposeChangeSet = {
                operationId: crypto.randomUUID(),
                metadata: data.metadata,
                replaceMain: mainFileStaged,
                addAttachments: attachmentsToAdd,
                deleteAttachmentIds: deletedAttachmentIds,
                reorder: attachmentsWithClientId.map(
                    ({ clientId, item }, index) => ({
                        clientId,
                        attachmentId: 'id' in item ? item.id : undefined,
                        order: index,
                    })
                ),
            }

            await commit(documentId, finalPayload)

            // 3. Успех: обновляем данные на странице и сбрасываем локальные изменения
            await mutate()
            setDeletedAttachmentIds([])
            setSuccess(true)
            setTimeout(() => {
                setSuccess(false)
            }, 3000)
        } catch (err) {
            console.error('Ошибка при обновлении документа:', err)
        }
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
                <Typography color='text.primary'>
                    Редактирование документа
                </Typography>
            </Breadcrumbs>

            {updateError && (
                <Alert severity='error' onClose={clearError}>
                    {updateError}
                </Alert>
            )}
            {success && (
                <Alert severity='success' onClose={() => setSuccess(false)}>
                    Сохранено
                </Alert>
            )}
            <DocumentUploadForm
                mode='edit'
                document={document}
                initialAttachments={document?.attachments ?? []}
                initialData={initialData}
                onSubmit={handleFormSubmit}
                isLoading={isUpdating}
                onRemoveAttachment={handleRemoveAttachment}
            />
        </Container>
    )
}
