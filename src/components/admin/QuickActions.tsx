'use client'

import AddIcon from '@mui/icons-material/Add'
import AssessmentIcon from '@mui/icons-material/Assessment'
import SettingsIcon from '@mui/icons-material/Settings'
import UploadIcon from '@mui/icons-material/Upload'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import { useRouter } from 'next/navigation'

export function QuickActions() {
    const router = useRouter()

    const actions = [
        {
            title: 'Создать пользователя',
            description: 'Добавить нового пользователя в систему',
            icon: <AddIcon />,
            color: 'primary',
            onClick: () => router.push('/admin/users/create'),
        },
        {
            title: 'Загрузить документ',
            description: 'Добавить новый документ в базу',
            icon: <UploadIcon />,
            color: 'secondary',
            onClick: () => router.push('/admin/documents/upload'),
        },
        {
            title: 'Просмотр статистики',
            description: 'Детальная аналитика системы',
            icon: <AssessmentIcon />,
            color: 'success',
            onClick: () => router.push('/admin/analytics'),
        },
        {
            title: 'Настройки системы',
            description: 'Конфигурация приложения',
            icon: <SettingsIcon />,
            color: 'warning',
            onClick: () => router.push('/admin/settings'),
        },
    ]

    return (
        <Card sx={{ mt: 3 }}>
            <CardContent>
                <Typography variant='h6' gutterBottom>
                    Быстрые действия
                </Typography>
                <Grid container spacing={2}>
                    {actions.map(action => (
                        <Grid
                            size={{ xs: 12, sm: 6, md: 3 }}
                            key={action.title}
                        >
                            <Button
                                variant='outlined'
                                fullWidth
                                startIcon={action.icon}
                                onClick={action.onClick}
                                sx={{
                                    height: 80,
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    textAlign: 'center',
                                    p: 2,
                                }}
                            >
                                <Box>
                                    <Typography
                                        variant='subtitle2'
                                        component='div'
                                    >
                                        {action.title}
                                    </Typography>
                                    <Typography
                                        variant='caption'
                                        color='textSecondary'
                                    >
                                        {action.description}
                                    </Typography>
                                </Box>
                            </Button>
                        </Grid>
                    ))}
                </Grid>
            </CardContent>
        </Card>
    )
}
