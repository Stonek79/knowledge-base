import './globals.css'

import type { Metadata } from 'next'
import { RootProvider } from '@/components/providers/RootProvider'

export const metadata: Metadata = {
    title: 'База заключений',
    description: 'Хранилище заключений ДПО',
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang='ru' suppressHydrationWarning>
            <body suppressHydrationWarning>
                <RootProvider>{children}</RootProvider>
            </body>
        </html>
    )
}
