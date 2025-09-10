'use client';

import { useState } from 'react';

import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    InputAdornment,
    Paper,
    TextField,
    Typography,
} from '@mui/material';

import { useUsers } from '@/lib/hooks/useUsers';
import { UserWithDocuments } from '@/lib/types/user';

import { CreateUserDialog } from './CreateUserDialog';
import { DeleteUserDialog } from './DeleteUserDialog';
import { EditUserDialog } from './EditUserDialog';
import { UserTable } from './UserTable';

export function UsersPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserWithDocuments | null>(
        null
    );

    const { users, isLoading, error, mutate } = useUsers();

    const filteredUsers =
        users?.filter(user =>
            user.username.toLowerCase().includes(searchTerm.toLowerCase())
        ) || [];

    const handleEdit = (user: UserWithDocuments) => {
        setSelectedUser(user);
        setEditDialogOpen(true);
    };

    const handleDelete = (user: UserWithDocuments) => {
        setSelectedUser(user);
        setDeleteDialogOpen(true);
    };

    const handleCreateSuccess = () => {
        setCreateDialogOpen(false);
        mutate();
    };

    const handleEditSuccess = () => {
        setEditDialogOpen(false);
        setSelectedUser(null);
        mutate();
    };

    const handleDeleteSuccess = () => {
        setDeleteDialogOpen(false);
        setSelectedUser(null);
        mutate();
    };

    if (error) {
        return (
            <Alert severity='error' sx={{ m: 2 }}>
                Ошибка загрузки пользователей: {error.message}
            </Alert>
        );
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
            </Paper>

            <UserTable
                users={filteredUsers}
                isLoading={isLoading}
                onEdit={handleEdit}
                onDelete={handleDelete}
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
    );
}
