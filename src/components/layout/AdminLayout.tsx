'use client'

import Box from '@mui/material/Box'
import CssBaseline from '@mui/material/CssBaseline'
import { useState } from 'react'

import { Header } from './Header'
import { Sidebar } from './Sidebar'

const DRAWER_WIDTH = 240

interface AdminLayoutProps {
    children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(true)

    const handleSidebarToggle = () => {
        setSidebarOpen(!sidebarOpen)
    }

    return (
        <Box sx={{ display: 'flex' }}>
            <CssBaseline />

            {/* Header */}
            <Header onSidebarToggle={handleSidebarToggle} />

            {/* Sidebar */}
            <Sidebar open={sidebarOpen} onToggle={handleSidebarToggle} />

            {/* Main content */}
            <Box
                component='main'
                sx={{
                    flexGrow: 1,
                    p: 3,
                    pt: 7,
                    width: {
                        xs: '100%',
                        md: `calc(100% - ${DRAWER_WIDTH}px)`,
                    },
                    ml: {
                        xs: 0,
                        md: `${DRAWER_WIDTH}px`,
                    },
                    minHeight: '100dvh',
                    backgroundColor: 'background.default',
                }}
            >
                {children}
            </Box>
        </Box>
    )
}
