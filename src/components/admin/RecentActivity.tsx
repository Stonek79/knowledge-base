'use client'

import {
    Category as CategoryIcon,
    Description as DescriptionIcon,
    Download as DownloadIcon,
    Login as LoginIcon,
    PersonAdd as PersonAddIcon,
    Upload as UploadIcon,
    RemoveRedEye as ViewIcon,
} from '@mui/icons-material'
import {
    Avatar,
    Box,
    Card,
    CardContent,
    CircularProgress,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Typography,
} from '@mui/material'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import Link from 'next/link'
import { ADMIN_LOGS_PATH } from '@/constants/api'
import { ACTION_TYPE, AUDIT_LOG_ACTION_LABELS } from '@/constants/audit-log'
import { useAuditLogs } from '@/lib/hooks/useAuditLogs'
import { AuditLogPayloadSchema } from '@/lib/schemas/audit-log'
import type { AuditLogResponse } from '@/lib/types/audit-log'

function getLogIcon(action: AuditLogResponse['action']) {
    switch (action) {
        case ACTION_TYPE.USER_CREATED:
            return <PersonAddIcon color='primary' />
        case ACTION_TYPE.DOCUMENT_CREATED:
            return <UploadIcon color='secondary' />
        case ACTION_TYPE.USER_LOGIN:
            return <LoginIcon color='success' />
        case ACTION_TYPE.DOCUMENT_VIEWED:
            return <ViewIcon color='info' />
        case ACTION_TYPE.DOCUMENT_DOWNLOADED:
            return <DownloadIcon color='info' />
        case ACTION_TYPE.CATEGORY_CREATED:
        case ACTION_TYPE.CATEGORY_UPDATED:
        case ACTION_TYPE.CATEGORY_DELETED:
            return <CategoryIcon color='warning' />
        default:
            return <DescriptionIcon />
    }
}

function formatLogMessage(log: AuditLogResponse): string {
    const { action, details } = log
    const parsed = AuditLogPayloadSchema.safeParse({ action, details })
    const fallbackMessage = AUDIT_LOG_ACTION_LABELS[action] || action

    if (!parsed.success) {
        return fallbackMessage
    }

    const { action: dataAction, details: dataDetails } = parsed.data

    switch (dataAction) {
        case ACTION_TYPE.DOCUMENT_CREATED:
        case ACTION_TYPE.DOCUMENT_UPDATED:
        case ACTION_TYPE.DOCUMENT_DELETED_SOFT:
        case ACTION_TYPE.DOCUMENT_DELETED_HARD:
        case ACTION_TYPE.DOCUMENT_VIEWED:
        case ACTION_TYPE.DOCUMENT_DOWNLOADED:
        case ACTION_TYPE.DOCUMENT_RESTORED:
            return `${AUDIT_LOG_ACTION_LABELS[dataAction]} "${
                dataDetails?.documentName
            }"`

        case ACTION_TYPE.CATEGORY_CREATED:
        case ACTION_TYPE.CATEGORY_UPDATED:
        case ACTION_TYPE.CATEGORY_DELETED:
            return `${AUDIT_LOG_ACTION_LABELS[dataAction]} "${
                dataDetails?.categoryName
            }"`

        case ACTION_TYPE.USER_CREATED:
            return `${AUDIT_LOG_ACTION_LABELS[dataAction]} "${
                dataDetails?.createdUsername
            }"`

        case ACTION_TYPE.USER_DELETED:
            return `${AUDIT_LOG_ACTION_LABELS[dataAction]} "${
                dataDetails?.deletedUsername
            }"`

        case ACTION_TYPE.USER_LOGIN:
        case ACTION_TYPE.USER_LOGOUT:
        case ACTION_TYPE.USER_PASSWORD_CHANGED:
            return AUDIT_LOG_ACTION_LABELS[dataAction]

        default:
            return fallbackMessage
    }
}

export function RecentActivity() {
    const { logs, isLoading, error } = useAuditLogs({ limit: 7, page: 1 })

    return (
        <Card sx={{ mt: 3 }}>
            <CardContent>
                <Typography variant='h6' gutterBottom>
                    Последние действия
                </Typography>
                {isLoading && (
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            py: 3,
                        }}
                    >
                        <CircularProgress />
                    </Box>
                )}
                {error && (
                    <Typography
                        color='error'
                        sx={{ py: 3, textAlign: 'center' }}
                    >
                        Не удалось загрузить активность.
                    </Typography>
                )}
                {!isLoading && !error && (
                    <List>
                        {logs.map(log => (
                            <ListItem
                                key={log.id}
                                alignItems='flex-start'
                                component={Link}
                                href={`${ADMIN_LOGS_PATH}?userIds=${log.user.id}`}
                                sx={{
                                    textDecoration: 'none',
                                    color: 'inherit',
                                    '&:hover': {
                                        backgroundColor: 'action.hover',
                                    },
                                }}
                            >
                                <ListItemIcon>
                                    <Avatar
                                        sx={{
                                            width: 32,
                                            height: 32,
                                            bgcolor: 'grey.200',
                                        }}
                                    >
                                        {getLogIcon(log.action)}
                                    </Avatar>
                                </ListItemIcon>
                                <ListItemText
                                    primary={formatLogMessage(log)}
                                    secondary={
                                        <>
                                            <Typography
                                                component='span'
                                                variant='body2'
                                                color='text.primary'
                                                sx={{ fontWeight: 'bold' }}
                                            >
                                                {log.user.username}
                                            </Typography>
                                            {' • '}
                                            <Typography
                                                component='span'
                                                variant='body2'
                                                color='text.secondary'
                                            >
                                                {formatDistanceToNow(
                                                    new Date(log.timestamp),
                                                    {
                                                        addSuffix: true,
                                                        locale: ru,
                                                    }
                                                )}
                                            </Typography>
                                        </>
                                    }
                                />
                            </ListItem>
                        ))}
                    </List>
                )}
            </CardContent>
        </Card>
    )
}
