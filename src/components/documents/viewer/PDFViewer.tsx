'use client'

import { FitScreen, ZoomIn, ZoomOut } from '@mui/icons-material'
import {
    Alert,
    Box,
    CircularProgress,
    IconButton,
    Stack,
    Toolbar,
    Tooltip,
    Typography,
} from '@mui/material'
import { useCallback, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'

// Настройка worker для PDF.js
// Настройка worker для PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

interface PDFDocumentViewerProps {
    documentPath: string
    height?: string | number
}

/**
 * Компонент для просмотра PDF документов с использованием react-pdf
 *
 * @description Предоставляет функции:
 * - Прокрутка всех страниц
 * - Масштабирование (zoom in/out)
 * - Автоподгонка по ширине
 * - Индикатор загрузки
 * - Обработка ошибок
 *
 * @param documentPath - Путь к PDF документу
 * @param height - Высота контейнера (по умолчанию '90dvh')
 */
export function PDFDocumentViewer({
    documentPath,
    height = '90dvh',
}: PDFDocumentViewerProps) {
    const [numPages, setNumPages] = useState<number>(0)
    const [scale, setScale] = useState<number>(1.0)
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)

    const onDocumentLoadSuccess = useCallback(
        ({ numPages }: { numPages: number }) => {
            setNumPages(numPages)
            setLoading(false)
            setError(null)
        },
        []
    )

    const onDocumentLoadError = useCallback((error: Error) => {
        console.error('Ошибка загрузки PDF:', error)
        setError('Не удалось загрузить PDF документ')
        setLoading(false)
    }, [])

    const onPageLoadError = useCallback((error: Error) => {
        console.error('Ошибка загрузки страницы:', error)
    }, [])

    const zoomIn = useCallback(() => {
        setScale(prev => Math.min(prev + 0.2, 3.0))
    }, [])

    const zoomOut = useCallback(() => {
        setScale(prev => Math.max(prev - 0.2, 0.5))
    }, [])

    const fitToWidth = useCallback(() => {
        setScale(1.0)
    }, [])

    if (error) {
        return (
            <Box
                sx={{
                    height,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Alert severity='error' sx={{ maxWidth: 400 }}>
                    {error}
                </Alert>
            </Box>
        )
    }

    return (
        <Box sx={{ height, display: 'flex', flexDirection: 'column' }}>
            {/* Панель управления */}
            <Toolbar
                variant='dense'
                sx={{
                    bgcolor: 'background.paper',
                    borderBottom: 1,
                    borderColor: 'divider',
                }}
            >
                <Stack
                    direction='row'
                    spacing={1}
                    alignItems='center'
                    sx={{ width: '100%' }}
                >
                    <Typography variant='body2' sx={{ minWidth: 60 }}>
                        {numPages || 0} стр.
                    </Typography>

                    <Box sx={{ flexGrow: 1 }} />

                    {/* Масштабирование */}
                    <Tooltip title='Уменьшить'>
                        <IconButton
                            onClick={zoomOut}
                            disabled={scale <= 0.5}
                            size='small'
                        >
                            <ZoomOut />
                        </IconButton>
                    </Tooltip>

                    <Typography
                        variant='body2'
                        sx={{ minWidth: 50, textAlign: 'center' }}
                    >
                        {Math.round(scale * 100)}%
                    </Typography>

                    <Tooltip title='Увеличить'>
                        <IconButton
                            onClick={zoomIn}
                            disabled={scale >= 3.0}
                            size='small'
                        >
                            <ZoomIn />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title='По ширине'>
                        <IconButton onClick={fitToWidth} size='small'>
                            <FitScreen />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Toolbar>

            {/* PDF контент */}
            <Box
                sx={{
                    flex: 1,
                    overflow: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    bgcolor: 'grey.100',
                    p: 2,
                }}
            >
                {loading && (
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            mt: 4,
                        }}
                    >
                        <CircularProgress size={32} />
                        <Typography>Загрузка PDF...</Typography>
                    </Box>
                )}

                <Document
                    file={documentPath}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading=''
                    error=''
                >
                    {!loading &&
                        Array.from(new Array(numPages), (_, index) => (
                            <Box
                                key={`page_${index + 1}`}
                                sx={{ mb: 2, boxShadow: 3 }}
                            >
                                <Page
                                    pageNumber={index + 1}
                                    scale={scale}
                                    onLoadError={onPageLoadError}
                                    loading=''
                                    error=''
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                />
                            </Box>
                        ))}
                </Document>
            </Box>
        </Box>
    )
}
