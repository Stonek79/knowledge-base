'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useEffect, useState } from 'react'

export const CurrentDateTime = () => {
    const [currentTime, setCurrentTime] = useState<Date | null>(null)

    useEffect(() => {
        setCurrentTime(new Date())
        const timer = setInterval(() => {
            setCurrentTime(new Date())
        }, 1000)

        return () => clearInterval(timer)
    }, [])

    if (!currentTime) {
        // Render a placeholder or nothing to avoid hydration mismatch
        // Using a fixed height box to prevent layout shift if possible, or just null
        return <Box sx={{ height: '68px', mb: 3 }} />
    }

    return (
        <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Typography
                variant='h6'
                color='primary.main'
                sx={{ fontWeight: 500, textTransform: 'capitalize' }}
            >
                {format(currentTime, 'd MMMM yyyy', { locale: ru })}
            </Typography>
            <Typography
                variant='h3'
                sx={{
                    fontWeight: 'bold',
                    letterSpacing: 2,
                    fontVariantNumeric: 'tabular-nums', // Ensures numbers don't jump width
                }}
            >
                {format(currentTime, 'HH:mm:ss')}
            </Typography>
        </Box>
    )
}
