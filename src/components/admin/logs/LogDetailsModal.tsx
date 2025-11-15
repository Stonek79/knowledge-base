'use client'

import CloseIcon from '@mui/icons-material/Close'
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
} from '@mui/material'

import { AUDIT_LOG_ACTION_LABELS } from '@/constants/audit-log'
import type { AuditLogResponse } from '@/lib/types/audit-log'

import { LogDetails } from './LogDetails'

interface LogDetailsModalProps {
    open: boolean
    log: AuditLogResponse | null
    onClose: () => void
}

export function LogDetailsModal({ open, log, onClose }: LogDetailsModalProps) {
    if (!log) {
        return null
    }

    const title = AUDIT_LOG_ACTION_LABELS[log.action] || 'Детали записи'

    return (
        <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth>
            <DialogTitle
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                {title}
                <IconButton
                    aria-label='close'
                    onClick={onClose}
                    sx={{
                        color: theme => theme.palette.grey[500],
                    }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <LogDetails log={log} />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Закрыть</Button>
            </DialogActions>
        </Dialog>
    )
}
