'use client'

import { Box, CircularProgress, Paper, Typography } from '@mui/material'
import { useEffect, useState } from 'react'

interface UploadProgressProps {
    progress: number
    message?: string
    isProcessing?: boolean
}

const FUNNY_MESSAGES = [
    'Загружаем документ...',
    'Разбираем файл по буковкам...',
    'Угощаем Gotenberg чаем с печеньками...',
    'Превращаем ваш документ в красивый PDF...',
    'Индексируем содержимое для поиска...',
    'Время заварить чай ☕',
    'Почти готово! Последние штрихи...',
    'Проверяем орфографию (шутка)...',
    'Договариваемся с файловой системой...',
]

export function UploadProgress({
    progress,
    message,
    isProcessing = false,
}: UploadProgressProps) {
    const [currentMessage, setCurrentMessage] = useState(
        message || FUNNY_MESSAGES[0]
    )

    useEffect(() => {
        if (isProcessing && !message) {
            let index = 0
            const interval = setInterval(() => {
                setCurrentMessage(FUNNY_MESSAGES[index % FUNNY_MESSAGES.length])
                index++
            }, 3000)
            return () => clearInterval(interval)
        } else if (message) {
            setCurrentMessage(message)
        }
        // Добавляем return для всех остальных случаев
        return undefined
    }, [isProcessing, message])

    return (
        <Paper variant='outlined' sx={{ p: 2 }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                }}
            >
                <CircularProgress size={20} />
                <Typography variant='body2'>
                    {currentMessage} {progress > 0 && `${progress}%`}
                </Typography>
            </Box>
        </Paper>
    )
}
