'use client'

import 'swagger-ui-react/swagger-ui.css'

import { Box, CircularProgress, Typography, useTheme } from '@mui/material'
import dynamic from 'next/dynamic'
import { notFound } from 'next/navigation'
import { useEffect, useState } from 'react'
import styles from './ApiDocsPage.module.css'

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false })

export default function ApiDocsPage() {
    // В продакшене эта страница не будет доступна
    if (process.env.NODE_ENV === 'production') {
        notFound()
    }

    const [spec, setSpec] = useState(null)
    const theme = useTheme()
    const isDark = theme.palette.mode === 'dark'

    useEffect(() => {
        fetch('/api/doc')
            .then(res => res.json())
            .then(data => {
                setSpec(data)
            })
            .catch(error => {
                console.error('Failed to fetch API spec:', error)
            })
    }, [])

    return (
        <Box sx={{ p: 4 }}>
            <Typography variant='h4' gutterBottom>
                API Documentation
            </Typography>
            {spec ? (
                <div className={isDark ? styles.swaggerDark : ''}>
                    <SwaggerUI spec={spec} />
                </div>
            ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                    <CircularProgress />
                </Box>
            )}
        </Box>
    )
}
