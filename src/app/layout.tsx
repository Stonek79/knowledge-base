import './globals.css';

import { RootProvider } from '@/components/providers/RootProvider';

import type { Metadata } from 'next';


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
