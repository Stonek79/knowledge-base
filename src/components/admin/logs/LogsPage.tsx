'use client'

import InfoIcon from '@mui/icons-material/Info'
import {
    Box,
    Card,
    Container,
    IconButton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    Tooltip,
    Typography,
} from '@mui/material'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import type { Dayjs } from 'dayjs'
import { useState } from 'react'

import {
    AUDIT_LOG_ACTION_LABELS,
    TARGET_TYPE_LABELS,
} from '@/constants/audit-log'
import { useAuditLogs } from '@/lib/hooks/useAuditLogs'
import type { ActionType, AuditLogResponse } from '@/lib/types/audit-log'
import type { BaseUser } from '@/lib/types/user'

import { ActionFilter } from './ActionFilter'
import { LogDetailsModal } from './LogDetailsModal'
import { UserFilter } from './UserFilter'

export function LogsPage() {
    const [page, setPage] = useState(0)
    const [rowsPerPage, setRowsPerPage] = useState(20)
    const [startDate, setStartDate] = useState<Dayjs | null>(null)
    const [endDate, setEndDate] = useState<Dayjs | null>(null)
    const [selectedUsers, setSelectedUsers] = useState<BaseUser[]>([])
    const [selectedActions, setSelectedActions] = useState<ActionType[]>([])
    const [selectedLog, setSelectedLog] = useState<AuditLogResponse | null>(
        null
    )

    const { logs, pagination, error, isLoading } = useAuditLogs({
        page: page + 1,
        limit: rowsPerPage,
        startDate: startDate ? startDate.toISOString() : undefined,
        endDate: endDate ? endDate.toISOString() : undefined,
        userIds: selectedUsers.map(u => u.id),
        actions: selectedActions,
    })

    const total = pagination?.total || 0

    const handleOpenModal = (log: AuditLogResponse) => {
        setSelectedLog(log)
    }

    const handleCloseModal = () => {
        setSelectedLog(null)
    }

    const handleChangePage = (_: unknown, newPage: number) => {
        setPage(newPage)
    }

    const handleChangeRowsPerPage = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        setRowsPerPage(parseInt(event.target.value, 10))
        setPage(0)
    }

    return (
        <Container maxWidth='xl'>
            <Box sx={{ my: 4 }}>
                <Typography variant='h4' component='h1' gutterBottom>
                    Журнал аудита
                </Typography>
            </Box>

            <Card sx={{ mb: 3, p: 2 }}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <Stack direction='row' spacing={2}>
                        <DatePicker
                            label='Начальная дата'
                            value={startDate}
                            onChange={setStartDate}
                        />
                        <DatePicker
                            label='Конечная дата'
                            value={endDate}
                            onChange={setEndDate}
                        />
                        <UserFilter
                            selectedUsers={selectedUsers}
                            onChange={setSelectedUsers}
                        />
                        <ActionFilter
                            selectedActions={selectedActions}
                            onChange={setSelectedActions}
                        />
                    </Stack>
                </LocalizationProvider>
            </Card>

            <Card>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Дата</TableCell>
                                <TableCell>Пользователь</TableCell>
                                <TableCell>Действие</TableCell>
                                <TableCell>Объект</TableCell>
                                <TableCell align='right'>Действия</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading && (
                                <TableRow>
                                    <TableCell colSpan={5} align='center'>
                                        Загрузка...
                                    </TableCell>
                                </TableRow>
                            )}
                            {error && (
                                <TableRow>
                                    <TableCell
                                        colSpan={5}
                                        align='center'
                                        sx={{ color: 'error.main' }}
                                    >
                                        Ошибка при загрузке логов
                                    </TableCell>
                                </TableRow>
                            )}
                            {!isLoading && logs.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} align='center'>
                                        Нет данных
                                    </TableCell>
                                </TableRow>
                            )}
                            {logs.map(log => (
                                <TableRow key={log.id} hover>
                                    <TableCell>
                                        {new Date(
                                            log.timestamp
                                        ).toLocaleString()}
                                    </TableCell>
                                    <TableCell>{log.user.username}</TableCell>
                                    <TableCell>
                                        {AUDIT_LOG_ACTION_LABELS[log.action]}
                                    </TableCell>
                                    <TableCell>
                                        {log.targetType && log.targetId ? (
                                            <Box>
                                                <Typography variant='body2'>
                                                    {
                                                        TARGET_TYPE_LABELS[
                                                            log.targetType
                                                        ]
                                                    }
                                                </Typography>
                                                <Typography
                                                    variant='caption'
                                                    color='text.secondary'
                                                    noWrap
                                                >
                                                    ID: {log.targetId}
                                                </Typography>
                                            </Box>
                                        ) : (
                                            'N/A'
                                        )}
                                    </TableCell>
                                    <TableCell align='right'>
                                        <Tooltip title='Подробнее'>
                                            <IconButton
                                                onClick={() =>
                                                    handleOpenModal(log)
                                                }
                                            >
                                                <InfoIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[10, 20, 50]}
                    component='div'
                    count={total}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </Card>

            <LogDetailsModal
                open={!!selectedLog}
                log={selectedLog}
                onClose={handleCloseModal}
            />
        </Container>
    )
}
