import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Link from 'next/link';

import { HOME_PATH } from '@/constants/api';

export default function NotFound() {
    return (
        <Container component="main" maxWidth="sm">
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
                <Typography variant="h1" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
                    404
                </Typography>
                <Typography variant="h5" component="h2" gutterBottom>
                    Страница не найдена
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    Извините, мы не можем найти страницу, которую вы ищете. Возможно, она была
                    перемещена, удалена или никогда не существовала.
                </Typography>
                <Button component={Link} href={HOME_PATH} variant="contained" color="primary">
                    Вернуться на главную
                </Button>
            </Box>
        </Container>
    );
}
