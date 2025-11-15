import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'

import { DashboardStats } from '@/components/admin/DashboardStats'
import { RecentActivity } from '@/components/admin/RecentActivity'
/**
 * Главная страница (дашборд) админ-панели.
 * Здесь будет отображаться основная информация и статистика для администратора.
 * Предполагается, что этот компонент будет серверным для загрузки данных.
 * @returns {Promise<JSX.Element>} Компонент дашборда админ-панели.
 */
export default async function AdminDashboardPage() {
    return (
        <Container maxWidth='xl'>
            <Box sx={{ py: 3 }}>
                <Typography variant='h4' component='h1' gutterBottom>
                    Дашборд администратора
                </Typography>

                {/* Статистика */}
                <DashboardStats />

                {/* Последние действия */}
                <RecentActivity />
            </Box>
        </Container>
    )
}
