'use client'

import AccessTimeIcon from '@mui/icons-material/AccessTime'
import DescriptionIcon from '@mui/icons-material/Description'
import PeopleIcon from '@mui/icons-material/People'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import useSWR from 'swr'

import { API_DOCUMENTS_PATH, API_USERS_PATH } from '@/constants/api'

interface StatsData {
    totalUsers: number
    totalDocuments: number
    activeUsers: number
    recentActivity: number
}

export function DashboardStats() {
    const { data: usersData } = useSWR(API_USERS_PATH)
    const { data: documentsData } = useSWR(API_DOCUMENTS_PATH)

    // Временные данные (потом заменим на реальные API)
    const stats: StatsData = {
        totalUsers: usersData?.length || 0,
        totalDocuments: documentsData?.length || 0,
        activeUsers: 5, // TODO: Реальная статистика
        recentActivity: 12, // TODO: Реальная статистика
    }

    const statCards = [
        {
            title: 'Всего пользователей',
            value: stats.totalUsers,
            icon: <PeopleIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
            color: 'primary.main',
        },
        {
            title: 'Всего документов',
            value: stats.totalDocuments,
            icon: (
                <DescriptionIcon
                    sx={{ fontSize: 40, color: 'secondary.main' }}
                />
            ),
            color: 'secondary.main',
        },
        {
            title: 'Активных пользователей',
            value: stats.activeUsers,
            icon: (
                <TrendingUpIcon sx={{ fontSize: 40, color: 'success.main' }} />
            ),
            color: 'success.main',
        },
        {
            title: 'Активность за неделю',
            value: stats.recentActivity,
            icon: (
                <AccessTimeIcon sx={{ fontSize: 40, color: 'warning.main' }} />
            ),
            color: 'warning.main',
        },
    ]

    return (
        <Grid container spacing={3}>
            {statCards.map(card => (
                <Grid size={{ xs: 12, sm: 6, md: 3 }} key={card.title}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Box
                                display='flex'
                                alignItems='center'
                                justifyContent='space-between'
                            >
                                <Box>
                                    <Typography
                                        color='textSecondary'
                                        gutterBottom
                                        variant='body2'
                                    >
                                        {card.title}
                                    </Typography>
                                    <Typography
                                        variant='h4'
                                        component='div'
                                        sx={{ fontWeight: 'bold' }}
                                    >
                                        {card.value}
                                    </Typography>
                                </Box>
                                {card.icon}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            ))}
        </Grid>
    )
}
