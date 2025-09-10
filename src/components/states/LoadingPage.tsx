import { Box, CircularProgress, Typography } from '@mui/material';

export function LoadingPage({
    title = 'Загрузка...',
    message,
}: {
    title?: string;
    message?: string;
}) {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '400px',
                gap: 2,
            }}
        >
            <CircularProgress size={48} />
            <Typography variant='h6' color='text.secondary'>
                {title}
            </Typography>
            {message && (
                <Typography
                    variant='body2'
                    color='text.secondary'
                    textAlign='center'
                >
                    {message}
                </Typography>
            )}
        </Box>
    );
}
