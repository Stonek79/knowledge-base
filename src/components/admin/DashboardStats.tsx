'use client'

import AccessTimeIcon from '@mui/icons-material/AccessTime'
import DescriptionIcon from '@mui/icons-material/Description'
import PeopleIcon from '@mui/icons-material/People'
import {
    Box,
    Card,
    CardContent,
    Grid,
    Skeleton,
    Typography,
} from '@mui/material'
import { subDays } from 'date-fns'
import { useMemo } from 'react'
import { useDocuments } from '@/lib/hooks/documents/useDocuments'
import { useAuditLogs } from '@/lib/hooks/useAuditLogs'
import { useUsers } from '@/lib/hooks/useUsers'

export function DashboardStats() {
    const { isLoading: usersLoading, total: totalUsers } = useUsers({
        limit: 1,
    })
    const { total: totalDocuments, isLoading: documentsLoading } = useDocuments(
        { limit: 1 }
    )

    const sevenDaysAgo = useMemo(() => subDays(new Date(), 7), [])
    const { total: auditLogsTotal, isLoading: auditLogsLoading } = useAuditLogs(
        { limit: 1, startDate: sevenDaysAgo.toISOString() }
    )

    const isLoading = usersLoading || documentsLoading || auditLogsLoading

    const stats = {
        totalUsers,
        totalDocuments,
        recentActivity: auditLogsTotal,
    }

    const statCards = [
        {
            title: 'Всего пользователей',
            value: stats.totalUsers,
            icon: <PeopleIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
        },
        {
            title: 'Всего документов',
            value: stats.totalDocuments,
            icon: (
                <DescriptionIcon
                    sx={{ fontSize: 40, color: 'secondary.main' }}
                />
            ),
        },
        {
            title: 'Активность за неделю',
            value: stats.recentActivity,
            icon: (
                <AccessTimeIcon sx={{ fontSize: 40, color: 'warning.main' }} />
            ),
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
                                        {isLoading ? (
                                            <Skeleton width={80} />
                                        ) : (
                                            card.value
                                        )}
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
