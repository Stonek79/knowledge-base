import './globals.css';

import { RootProvider } from '@/components/providers/RootProvider';

import type { Metadata } from 'next';


export const metadata: Metadata = {
    title: 'База заключений',
    description: 'Хранилище заключений ДПО',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang='ru' suppressHydrationWarning>
            <body suppressHydrationWarning>
                <RootProvider>{children}</RootProvider>
            </body>
        </html>
    );
}
