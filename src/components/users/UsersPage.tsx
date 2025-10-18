'use client'

import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material'
import {
    Alert,
    Box,
    Button,
    InputAdornment,
    Paper,
    Tab,
    Tabs,
    TextField,
    Typography,
} from '@mui/material'
import { useState } from 'react'

import { USER_SORTABLE_FIELDS, USER_STATUSES } from '@/constants/user'
import { useUsers } from '@/lib/hooks/useUsers'
import type {
    UserSortableFields,
    UserStatus,
    UserWithDocuments,
} from '@/lib/types/user'

import { CreateUserDialog } from './CreateUserDialog'
import { DeleteUserDialog } from './DeleteUserDialog'
import { EditUserDialog } from './EditUserDialog'
import { UserTable } from './UserTable'

export function UsersPage() {
    const [searchTerm, setSearchTerm] = useState('')
    const [status, setStatus] = useState<UserStatus | undefined>(undefined)
    const [sortBy, setSortBy] = useState<UserSortableFields>(
        USER_SORTABLE_FIELDS[0]
    )
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<UserWithDocuments | null>(
        null
    )

    const { users, isLoading, error, mutate } = useUsers({
        search: searchTerm,
        status,
        sortBy,
        sortOrder,
    })

    const handleSort = (field: UserSortableFields) => {
        const isAsc = sortBy === field && sortOrder === 'asc'
        setSortOrder(isAsc ? 'desc' : 'asc')
        setSortBy(field)
    }

    const handleEdit = (user: UserWithDocuments) => {
        setSelectedUser(user)
        setEditDialogOpen(true)
    }

    const handleDelete = (user: UserWithDocuments) => {
        setSelectedUser(user)
        setDeleteDialogOpen(true)
    }

    const handleCreateSuccess = () => {
        setCreateDialogOpen(false)
        mutate()
    }

    const handleEditSuccess = () => {
        setEditDialogOpen(false)
        setSelectedUser(null)
        mutate()
    }

    const handleDeleteSuccess = () => {
        setDeleteDialogOpen(false)
        setSelectedUser(null)
        mutate()
    }

    if (error) {
        return (
            <Alert severity='error' sx={{ m: 2 }}>
                Ошибка загрузки пользователей: {error.message}
            </Alert>
        )
    }

    return (
        <Box sx={{ p: 3 }}>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 3,
                }}
            >
                <Typography variant='h4' component='h1'>
                    Управление пользователями
                </Typography>
                <Button
                    variant='contained'
                    startIcon={<AddIcon />}
                    onClick={() => setCreateDialogOpen(true)}
                >
                    Добавить пользователя
                </Button>
            </Box>

            <Paper sx={{ p: 2, mb: 3 }}>
                <TextField
                    fullWidth
                    placeholder='Поиск по имени пользователя...'
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position='start'>
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                        },
                    }}
                />
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 2 }}>
                    <Tabs
                        value={status || 'ALL'}
                        onChange={(_, newValue) => setStatus(newValue)}
                        aria-label='Фильтр по статусу пользователя'
                    >
                        <Tab label='Все' value='ALL' />
                        <Tab label='Активные' value={USER_STATUSES.ACTIVE} />
                        <Tab
                            label='Временные'
                            value={USER_STATUSES.PLACEHOLDER}
                        />
                    </Tabs>
                </Box>
            </Paper>

            <UserTable
                users={users}
                isLoading={isLoading}
                onEdit={handleEdit}
                onDelete={handleDelete}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
            />

            <CreateUserDialog
                open={createDialogOpen}
                onClose={() => setCreateDialogOpen(false)}
                onSuccess={handleCreateSuccess}
            />

            {selectedUser && (
                <>
                    <EditUserDialog
                        open={editDialogOpen}
                        user={selectedUser}
                        onClose={() => setEditDialogOpen(false)}
                        onSuccess={handleEditSuccess}
                    />
                    <DeleteUserDialog
                        open={deleteDialogOpen}
                        user={selectedUser}
                        onClose={() => setDeleteDialogOpen(false)}
                        onSuccess={handleDeleteSuccess}
                    />
                </>
            )}
        </Box>
    )
}
