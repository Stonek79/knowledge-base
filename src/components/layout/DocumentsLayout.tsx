'use client';

import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';

import { Header } from './Header';

interface DocumentsLayoutProps {
    children: React.ReactNode;
}

export function DocumentsLayout({ children }: DocumentsLayoutProps) {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100vh',
            }}
        >
            <CssBaseline />

            {/* Header без сайдбара */}
            <Header showSidebar={false} />

            {/* Основной контент */}
            <Box
                component='main'
                sx={{
                    flexGrow: 1,
                    p: 3,
                    pt: 8,
                    backgroundColor: 'background.default',
                    minHeight: 'calc(100vh - 64px)',
                }}
            >
                {children}
            </Box>
        </Box>
    );
}
