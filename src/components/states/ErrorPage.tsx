'use client';

import { useEffect } from 'react';

import Link from 'next/link';

import {
    Alert,
    Box,
    Button,
    Container,
    Stack,
    Typography,
} from '@mui/material';

import { HOME_PATH } from '@/constants/api';

interface ErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export function ErrorPage({ error, reset }: ErrorProps) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('[GlobalError]:', error);
    }, [error]);

    return (
        <Container component='main' maxWidth='md'>
            <Box
                sx={{
                    marginTop: { xs: 6, sm: 8 },
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    padding: { xs: 2, sm: 3 },
                }}
            >
                <Typography
                    variant='h4'
                    component='h1'
                    gutterBottom
                    color='error'
                >
                    Что-то пошло не так
                </Typography>
                <Alert
                    severity='error'
                    sx={{ my: 2, width: '100%', textAlign: 'left' }}
                >
                    <Typography variant='subtitle1' component='h2' gutterBottom>
                        Произошла ошибка в приложении.
                    </Typography>
                    {error.message && (
                        <Typography variant='body2' sx={{ mb: 1 }}>
                            Сообщение: {error.message}
                        </Typography>
                    )}
                    {process.env.NODE_ENV === 'development' && error.digest && (
                        <Typography
                            variant='caption'
                            display='block'
                            gutterBottom
                        >
                            Digest: {error.digest}
                        </Typography>
                    )}
                </Alert>

                <Stack spacing={2}>
                    <Button
                        variant='contained'
                        onClick={reset}
                        sx={{ mt: 2, px: 4, py: 1 }}
                    >
                        Попробовать снова
                    </Button>
                    <Button
                        component={Link}
                        href={HOME_PATH}
                        variant='contained'
                        color='primary'
                    >
                        Вернуться на главную
                    </Button>
                    <Typography variant='body2' sx={{ mt: 3 }}>
                        Если проблема повторяется, пожалуйста, свяжитесь со
                        службой поддержки.
                    </Typography>
                </Stack>
            </Box>
        </Container>
    );
}
