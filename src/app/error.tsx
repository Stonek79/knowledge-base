'use client';

import { ErrorPage } from '@/components/states/ErrorPage';

interface ErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function DocumentsError({ error, reset }: ErrorProps) {
    return <ErrorPage error={error} reset={reset} />;
}
