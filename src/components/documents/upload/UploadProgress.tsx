'use client';

import { Box, CircularProgress, Paper, Typography } from '@mui/material';

interface UploadProgressProps {
    progress: number;
    message?: string;
}

export function UploadProgress({
    progress,
    message = 'Загрузка документа...',
}: UploadProgressProps) {
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
                    {message} {progress}%
                </Typography>
            </Box>
        </Paper>
    );
}
