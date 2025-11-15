'use client'

import { Box, Typography } from '@mui/material'
import { Fragment } from 'react'

import {
    ACTION_TYPE,
    AUDIT_LOG_ACTION_LABELS,
    AUDIT_LOG_FIELD_LABELS,
} from '@/constants/audit-log'
import { AuditLogPayloadSchema } from '@/lib/schemas/audit-log'
import type { AuditLogResponse } from '@/lib/types/audit-log'

interface LogDetailsProps {
    log: AuditLogResponse
}

export function LogDetails({ log }: LogDetailsProps) {
    const { action, details } = log

    if (!details) {
        return (
            <Typography variant='body2'>Нет дополнительных деталей</Typography>
        )
    }

    const parsed = AuditLogPayloadSchema.safeParse({ action, details })

    if (!parsed.success) {
        // Если структура не соответствует схеме, показываем сырой JSON
        return (
            <pre style={{ margin: 0, fontSize: '0.8rem' }}>
                {JSON.stringify(details, null, 2)}
            </pre>
        )
    }

    const { action: typedAction, details: typedDetails } = parsed.data

    const renderChange = (change: {
        field: string
        oldValue?: unknown
        newValue?: unknown
    }) => {
        const fieldLabel = AUDIT_LOG_FIELD_LABELS[change.field] || change.field
        const oldValue = JSON.stringify(change?.oldValue)
        const newValue = JSON.stringify(change?.newValue)

        if (change.oldValue === undefined && change.newValue !== undefined) {
            return (
                <Typography variant='body2'>
                    **{fieldLabel}**: {newValue} (добавлено)
                </Typography>
            )
        }
        if (change.oldValue !== undefined && change.newValue === undefined) {
            return (
                <Typography variant='body2'>
                    **{fieldLabel}**: {oldValue} (удалено)
                </Typography>
            )
        }
        if (change.oldValue !== undefined && change.newValue !== undefined) {
            return (
                <Typography variant='body2'>
                    **{fieldLabel}**: {oldValue} → {newValue}
                </Typography>
            )
        }
        return null
    }

    switch (typedAction) {
        case ACTION_TYPE.DOCUMENT_CREATED:
            return (
                <Box>
                    <Typography variant='body2'>
                        Документ "{typedDetails?.documentName}" создан.
                    </Typography>
                    <Typography variant='body2'>
                        Автор: {typedDetails?.authorName}
                    </Typography>
                    {typedDetails?.categoryNames &&
                        typedDetails?.categoryNames?.length > 0 && (
                            <Typography variant='body2'>
                                Категории:{' '}
                                {typedDetails?.categoryNames?.join(', ')}
                            </Typography>
                        )}
                </Box>
            )

        case ACTION_TYPE.DOCUMENT_UPDATED:
            if (typedDetails?.changes && typedDetails?.changes?.length > 0) {
                return (
                    <Box>
                        <Typography variant='body2' gutterBottom>
                            Обновлен документ: "{typedDetails?.documentName}"
                        </Typography>
                        <Typography variant='body2' gutterBottom>
                            Изменения:
                        </Typography>
                        {typedDetails?.changes?.map(change => (
                            <Typography
                                key={change.field}
                                variant='body2'
                                gutterBottom
                            >
                                {renderChange(change)}
                            </Typography>
                        ))}
                    </Box>
                )
            }
            return (
                <Typography variant='body2'>
                    Документ "{typedDetails?.documentName}" обновлен.
                </Typography>
            )

        case ACTION_TYPE.USER_LOGIN:
            return (
                <Typography variant='body2'>
                    Пользователь вошел в систему.
                    {typedDetails?.ipAddress &&
                        ` IP: ${typedDetails.ipAddress}`}
                </Typography>
            )

        case ACTION_TYPE.USER_LOGIN_FAILED:
            return (
                <Typography variant='body2'>
                    Неудачная попытка входа для "
                    {typedDetails?.attemptedUsername}".
                </Typography>
            )

        case ACTION_TYPE.USER_CREATED:
            return (
                <Typography variant='body2'>
                    Создан пользователь "{typedDetails?.createdUsername}".
                </Typography>
            )

        case ACTION_TYPE.USER_UPDATED:
        case ACTION_TYPE.PROFILE_UPDATED:
        case ACTION_TYPE.CATEGORY_UPDATED:
        case ACTION_TYPE.SYSTEM_SETTINGS_UPDATED:
            if (typedDetails?.changes && typedDetails.changes.length > 0) {
                return (
                    <Box>
                        <Typography variant='body2' gutterBottom>
                            {AUDIT_LOG_ACTION_LABELS[action]}:
                        </Typography>
                        {typedDetails?.changes.map(change => (
                            <Fragment key={change.field}>
                                {renderChange(change)}
                            </Fragment>
                        ))}
                    </Box>
                )
            }
            return (
                <Typography variant='body2'>
                    {AUDIT_LOG_ACTION_LABELS[action]}
                </Typography>
            )

        case ACTION_TYPE.DOCUMENT_DELETED_SOFT:
        case ACTION_TYPE.DOCUMENT_DELETED_HARD:
        case ACTION_TYPE.DOCUMENT_RESTORED:
        case ACTION_TYPE.DOCUMENT_VIEWED:
        case ACTION_TYPE.DOCUMENT_DOWNLOADED: {
            return (
                <Typography variant='body2'>
                    {AUDIT_LOG_ACTION_LABELS[typedAction]}
                    {typedDetails?.documentName &&
                        `: "${typedDetails.documentName}"`}
                </Typography>
            )
        }

        case ACTION_TYPE.USER_DELETED:
            return (
                <Typography variant='body2'>
                    {AUDIT_LOG_ACTION_LABELS[typedAction]}
                    {typedDetails?.deletedUsername &&
                        `: "${typedDetails.deletedUsername}"`}
                </Typography>
            )

        case ACTION_TYPE.CATEGORY_CREATED:
        case ACTION_TYPE.CATEGORY_DELETED:
            return (
                <Typography variant='body2'>
                    {AUDIT_LOG_ACTION_LABELS[typedAction]}
                    {typedDetails?.categoryName &&
                        `: "${typedDetails.categoryName}"`}
                </Typography>
            )

        case ACTION_TYPE.DOCUMENT_ACCESS_GRANTED:
        case ACTION_TYPE.DOCUMENT_ACCESS_REVOKED:
            return (
                <Typography variant='body2'>
                    {AUDIT_LOG_ACTION_LABELS[typedAction]}
                    {typedDetails?.grantedToUsername &&
                        ` для пользователя "${typedDetails.grantedToUsername}"`}
                </Typography>
            )

        case ACTION_TYPE.USER_PASSWORD_CHANGED:
        case ACTION_TYPE.USER_LOGOUT:
            return (
                <Typography variant='body2'>
                    {AUDIT_LOG_ACTION_LABELS[typedAction]}
                </Typography>
            )
        default: {
            const remainingDetails = JSON.stringify(typedDetails, null, 2)

            return (
                <Typography variant='body2'>
                    {AUDIT_LOG_ACTION_LABELS[typedAction] || action}:{' '}
                    {remainingDetails?.length > 0
                        ? remainingDetails
                        : 'no log action'}
                </Typography>
            )
        }
    }
}
