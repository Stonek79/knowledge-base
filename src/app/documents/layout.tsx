import type { Metadata } from 'next';

import { DocumentsLayout } from '@/components/layout/DocumentsLayout';

export const metadata: Metadata = {
    title: 'Документы - Knowledge Base',
    description: 'Управление и просмотр документов',
};

interface DocumentsLayoutWrapperProps {
    children: React.ReactNode;
}

/**
 * Layout для страниц документов.
 * Включает навигацию, header и возможность выхода/перехода в админ панель.
 */
export default async function DocumentsLayoutWrapper({
    children,
}: Readonly<DocumentsLayoutWrapperProps>) {
    return <DocumentsLayout>{children}</DocumentsLayout>;
}
