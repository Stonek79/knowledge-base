'use client'

import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Paper,
    Typography,
    useMediaQuery,
    useTheme,
} from '@mui/material'
import dynamic from 'next/dynamic'
import { useEffect, useRef } from 'react'

import { DOCUMENT_VIEWER_PATH } from '@/constants/api'
import { useRecentDocuments } from '@/lib/hooks/documents/useRecentDocuments'
import type { DocumentWithAuthor, SearchResult } from '@/lib/types/document'

import { DownloadButtons } from '../download/DownloadButtons'

const PDFDocumentViewer = dynamic(
    () => import('./PDFViewer').then(m => m.PDFDocumentViewer),
    { ssr: false }
)
interface DocumentViewerProps {
    document: SearchResult | DocumentWithAuthor
    open: boolean
    onClose: () => void
}

/**
 * Компонент для просмотра документов в модальном окне
 *
 * @description Отображает документ в виде PDF
 * - Поля для скачивания документа (оригинал и PDF)
 * - Объект для отображения PDF
 *
 * @param document - Документ для отображения
 * @param open - Состояние открытия модального окна
 * @param onClose - Обработчик закрытия
 * @param searchQuery - Поисковый запрос для подсветки
 */
export function DocumentViewer({
    document,
    open,
    onClose,
}: DocumentViewerProps) {
    const theme = useTheme()
    const isMobile = useMediaQuery(theme.breakpoints.down('md'))
    const { addRecentDocument } = useRecentDocuments()

    const hasAddedToRecent = useRef(false) // Флаг для предотвращения повторного добавления

    // Добавляем в недавние только при первом открытии
    useEffect(() => {
        if (open && document && !hasAddedToRecent.current) {
            addRecentDocument(document)
            hasAddedToRecent.current = true
        }

        // Сбрасываем флаг при закрытии
        if (!open) {
            hasAddedToRecent.current = false
        }
    }, [open, document, addRecentDocument])

    const documentPath = DOCUMENT_VIEWER_PATH(document.id)

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth='lg'
            fullWidth
            fullScreen={isMobile}
            sx={{
                borderRadius: isMobile ? 0 : 2,
                maxHeight: '100dvh',
            }}
        >
            <DialogTitle>
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <Typography variant='h6' component='h2' noWrap>
                        {document.title}
                    </Typography>

                    <DownloadButtons documentId={document.id} />
                </Box>
            </DialogTitle>

            <DialogContent dividers>
                <Paper variant='outlined' sx={{ height: '90dvh' }}>
                    <PDFDocumentViewer
                        documentPath={documentPath}
                        height='100%'
                    />
                </Paper>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Закрыть</Button>
            </DialogActions>
        </Dialog>
    )
}
