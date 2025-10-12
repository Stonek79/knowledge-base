'use client';

import { useRef, useState } from 'react';

import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { Paper, Typography } from '@mui/material';

interface DragDropZoneProps {
    onFileSelect: (file: File) => void;
    disabled?: boolean;
}

export function DragDropZone({
    onFileSelect,
    disabled = false,
}: DragDropZoneProps) {
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (!disabled) setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        if (disabled) return;

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            const file = files[0];
            if (file) {
                onFileSelect(file);
            }
        }
    };

    const handleClick = () => {
        if (!disabled) {
            fileInputRef.current?.click();
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onFileSelect(file);
        }
    };

    return (
        <Paper
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
            variant='outlined'
            sx={{
                p: 4,
                textAlign: 'center',
                cursor: disabled ? 'not-allowed' : 'pointer',
                border: '2px dashed',
                borderColor: isDragOver ? 'primary.main' : 'grey.300',
                backgroundColor: isDragOver ? 'primary.50' : 'background.paper',
                opacity: disabled ? 0.6 : 1,
                transition: 'all 0.2s ease-in-out',
                ...(disabled
                    ? {}
                    : {
                          '&:hover': {
                              borderColor: 'primary.main',
                              backgroundColor: 'primary.50',
                          },
                      }),
            }}
        >
            <input
                ref={fileInputRef}
                type='file'
                accept='.docx,.doc,.pdf'
                style={{ display: 'none' }}
                onChange={handleFileChange}
                disabled={disabled}
            />

            <CloudUploadIcon
                sx={{
                    fontSize: 48,
                    color: disabled ? 'grey.400' : 'primary.main',
                    mb: 2,
                }}
            />

            <Typography variant='h6' gutterBottom>
                {isDragOver
                    ? 'Отпустите файл здесь'
                    : 'Перетащите DOCX файл сюда'}
            </Typography>

            <Typography variant='body2' color='text.secondary'>
                или нажмите для выбора файла
            </Typography>

            <Typography
                variant='caption'
                color='text.secondary'
                sx={{ mt: 1, display: 'block' }}
            >
                Максимальный размер: 2MB
            </Typography>
        </Paper>
    );
}
