import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';

import { LOGIN_PAGE_PATH } from '@/constants/api';

export const WelcomePageContent = () => {
    return (
        <Container component='main' maxWidth='md'>
            <Box
                sx={{
                    paddingTop: { xs: 4, sm: 8 },
                    paddingBottom: { xs: 4, sm: 8 },
                    minHeight: 'calc(100vh - 120px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                }}
            >
                <Typography
                    variant='h2'
                    component='h1'
                    gutterBottom
                    sx={{ fontWeight: 'bold' }}
                >
                    Добро пожаловать в нашу базу заключений!
                </Typography>
                <Typography variant='h5' color='text.secondary' sx={{ mb: 4 }}>
                    Здесь вы можете попробоавть найти необходимые вам документы
                    и информацию.
                </Typography>
                <Stack spacing={2} justifyContent='center'>
                    <Button
                        component={NextLink}
                        href={LOGIN_PAGE_PATH}
                        variant='contained'
                        size='large'
                        sx={{ px: 4, py: 1.5 }}
                    >
                        Войти
                    </Button>
                    <Typography
                        variant='body1'
                        color='text.secondary'
                        sx={{ mb: 4 }}
                    >
                        Если у вас нет аккаунта обратитесь к администратору
                    </Typography>
                </Stack>
            </Box>
        </Container>
    );
};
