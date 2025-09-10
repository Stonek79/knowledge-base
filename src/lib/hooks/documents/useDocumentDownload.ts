import { useCallback, useState } from 'react';

import {
    API_DOCUMENT_ATTACHMENTS_ARCHIVE_PATH,
    API_DOCUMENT_DOWNLOAD_PATH_WITH_ID,
} from '@/constants/api';
import { downloadBlob } from '@/lib/api/apiHelper';

export const useDocumentDownload = () => {
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState<string | null>(null);

    const downloadDocument = async (
        documentId: string,
        fileType: 'original' | 'pdf'
    ) => {
        setIsDownloading(true);
        setDownloadError(null);

        const downloadUrl = `${API_DOCUMENT_DOWNLOAD_PATH_WITH_ID(documentId)}?type=${fileType}`;

        await downloadBlob(downloadUrl);
    };

    const downloadArchive = useCallback(async (documentId: string) => {
        setIsDownloading(true);
        setDownloadError(null);

        await downloadBlob(
            API_DOCUMENT_ATTACHMENTS_ARCHIVE_PATH(documentId),
            'originals.zip'
        );
    }, []);

    return {
        downloadDocument,
        isDownloading,
        downloadError,
        clearError: () => setDownloadError(null),
        downloadArchive,
    };
};
