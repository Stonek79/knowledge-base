'use client';

import {
    Delete as DeleteIcon,
    Upload as UploadIcon,
} from '@mui/icons-material';
import { Box, IconButton, Paper, Typography } from '@mui/material';

import { formatFileSize } from '@/utils/formatFileSize';

interface FilePreviewProps {
    file: File;
    onRemove: () => void;
    disabled?: boolean;
}

export function FilePreview({
    file,
    onRemove,
    disabled = false,
}: FilePreviewProps) {
    return (
        <Paper variant='outlined' sx={{ p: 2 }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                    }}
                >
                    <UploadIcon color='primary' />
                    <Typography variant='body2'>
                        {file.name} ({formatFileSize(file.size)})
                    </Typography>
                </Box>

                <IconButton
                    onClick={onRemove}
                    size='small'
                    color='error'
                    disabled={disabled}
                >
                    <DeleteIcon />
                </IconButton>
            </Box>
        </Paper>
    );
}
