import {
    FileCopy as FileIcon,
    PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import { Box, Button } from '@mui/material';

import { useDocumentDownload } from '@/lib/hooks/documents/useDocumentDownload';

export function DownloadButtons({
    setOpen,
    documentId,
}: {
    setOpen?: (open: boolean) => void;
    documentId: string;
}) {
    const { downloadDocument, isDownloading, downloadError, downloadArchive } =
        useDocumentDownload();

    return (
        <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
                sx={{ textWrap: 'nowrap', px: 4 }}
                variant='outlined'
                startIcon={<FileIcon />}
                onClick={() => {
                    downloadArchive(documentId);
                    if (!downloadError) setOpen?.(false);
                }}
                disabled={isDownloading}
                fullWidth
            >
                Скачать оригинал (zip)
            </Button>

            <Button
                sx={{ textWrap: 'nowrap', px: 4 }}
                variant='contained'
                startIcon={<PdfIcon />}
                onClick={() => {
                    downloadDocument(documentId, 'pdf');
                    if (!downloadError) setOpen?.(false);
                }}
                disabled={isDownloading}
                fullWidth
                color='primary'
            >
                Скачать PDF
            </Button>
        </Box>
    );
}
