'use client'

import DescriptionIcon from '@mui/icons-material/Description'
import LoginIcon from '@mui/icons-material/Login'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import UploadIcon from '@mui/icons-material/Upload'
import Avatar from '@mui/material/Avatar'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'

interface Activity {
    id: string
    type:
        | 'user_created'
        | 'document_uploaded'
        | 'user_login'
        | 'document_viewed'
    user: string
    description: string
    timestamp: string
}

export function RecentActivity() {
    // Временные данные (потом заменим на реальные API)
    const activities: Activity[] = [
        {
            id: '1',
            type: 'user_created',
            user: 'admin',
            description: 'Создан новый пользователь: john.doe',
            timestamp: '2 минуты назад',
        },
        {
            id: '2',
            type: 'document_uploaded',
            user: 'admin',
            description: 'Загружен документ: Отчет Q4 2024',
            timestamp: '15 минут назад',
        },
        {
            id: '3',
            type: 'user_login',
            user: 'john.doe',
            description: 'Пользователь вошел в систему',
            timestamp: '1 час назад',
        },
        {
            id: '4',
            type: 'document_viewed',
            user: 'john.doe',
            description: 'Просмотрен документ: Руководство пользователя',
            timestamp: '2 часа назад',
        },
    ]

    const getActivityIcon = (type: Activity['type']) => {
        switch (type) {
            case 'user_created':
                return <PersonAddIcon color='primary' />
            case 'document_uploaded':
                return <UploadIcon color='secondary' />
            case 'user_login':
                return <LoginIcon color='success' />
            case 'document_viewed':
                return <DescriptionIcon color='info' />
            default:
                return <DescriptionIcon />
        }
    }

    return (
        <Card sx={{ mt: 3 }}>
            <CardContent>
                <Typography variant='h6' gutterBottom>
                    Последние действия
                </Typography>
                <List>
                    {activities.map(activity => (
                        <ListItem key={activity.id} alignItems='flex-start'>
                            <ListItemIcon>
                                <Avatar
                                    sx={{
                                        width: 32,
                                        height: 32,
                                        bgcolor: 'grey.200',
                                    }}
                                >
                                    {getActivityIcon(activity.type)}
                                </Avatar>
                            </ListItemIcon>
                            <ListItemText
                                primary={activity.description}
                                secondary={
                                    <>
                                        <Typography
                                            component='span'
                                            variant='body2'
                                            color='textPrimary'
                                        >
                                            {activity.user}
                                        </Typography>
                                        {' • '}
                                        <Typography
                                            component='span'
                                            variant='body2'
                                            color='textSecondary'
                                        >
                                            {activity.timestamp}
                                        </Typography>
                                    </>
                                }
                            />
                        </ListItem>
                    ))}
                </List>
            </CardContent>
        </Card>
    )
}
