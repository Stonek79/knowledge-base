import useSWR from 'swr';

import { API_DOCUMENTS_PATH } from '@/constants/api';
import { makeSWRFetcher } from '@/lib/api/apiHelper';
import type { BaseAttachment } from '@/lib/types/attachment';
import { DocumentWithAuthor } from '@/lib/types/document';

const fetcher = makeSWRFetcher({ returnNullOn401: true });

export function useDocument(documentId: string | null) {
    const { data, error, isLoading, mutate } = useSWR<{
        document: DocumentWithAuthor & {
            attachments: BaseAttachment[];
            mainPdf?: { id: string; filePath: string } | null;
        };
        isDownloading: boolean;
    } | null>(
        documentId ? `${API_DOCUMENTS_PATH}/${documentId}` : null,
        fetcher,
        {
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            revalidateIfStale: true,
            dedupingInterval: 2000,
        }
    );

    return {
        document: data?.document ?? null,
        isDownloading: data?.isDownloading ?? false,
        isLoading,
        error: error instanceof Error ? error.message : null,
        mutate,
    };
}
