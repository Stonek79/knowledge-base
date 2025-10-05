'use client';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Box, Button, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';

export function NoResults({
    title = 'Нет данных',
    message = 'Попробуйте изменить параметры поиска или создать новый элемент',
    actionLabel = 'Назад',
    onAction,
    icon = <ArrowBackIcon sx={{ fontSize: 64, color: 'text.disabled' }} />,
}: {
    title?: string;
    message?: string;
    actionLabel?: string;
    onAction?: () => void;
    icon?: React.ReactNode;
}) {
    const router = useRouter();

    const handleOnClick = () => {
        if (onAction) {
            onAction();
        } else {
            router.back();
        }
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '300px',
                gap: 2,
            }}
        >
            {icon}
            <Typography variant='h6' color='text.secondary' gutterBottom>
                {title}
            </Typography>
            <Typography
                variant='body2'
                color='text.secondary'
                textAlign='center'
                sx={{ maxWidth: 400 }}
            >
                {message}
            </Typography>
            {onAction && (
                <Button
                    variant='contained'
                    onClick={handleOnClick}
                    startIcon={<ArrowBackIcon />}
                    sx={{ mt: 2 }}
                >
                    {actionLabel}
                </Button>
            )}
        </Box>
    );
}
