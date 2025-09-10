import type { Metadata } from 'next';

import { RootProvider } from '@/components/providers/RootProvider';

import './globals.css';

export const metadata: Metadata = {
    title: 'Knowledge Base',
    description: 'Knowledge Base',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang='ru'>
            <body>
                <RootProvider>{children}</RootProvider>
            </body>
        </html>
    );
}
