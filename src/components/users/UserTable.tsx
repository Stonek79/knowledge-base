'use client';

import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import {
    Alert,
    Chip,
    IconButton,
    Paper,
    Skeleton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material';

import { USER_ROLES } from '@/constants/user';
import { UserRole, UserWithDocuments } from '@/lib/types/user';

interface UserTableProps {
    users: UserWithDocuments[];
    isLoading: boolean;
    onEdit: (user: UserWithDocuments) => void;
    onDelete: (user: UserWithDocuments) => void;
}

export function UserTable({
    users,
    isLoading,
    onEdit,
    onDelete,
}: UserTableProps) {
    const getRoleLabel = (role: UserRole) => {
        switch (role) {
            case USER_ROLES.ADMIN:
                return 'Администратор';
            case USER_ROLES.USER:
                return 'Пользователь';
            case USER_ROLES.GUEST:
                return 'Гость';
            default:
                return role;
        }
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case USER_ROLES.ADMIN:
                return 'error';
            case USER_ROLES.USER:
                return 'primary';
            case USER_ROLES.GUEST:
                return 'default';
            default:
                return 'default';
        }
    };

    if (isLoading) {
        return (
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Имя пользователя</TableCell>
                            <TableCell>Роль</TableCell>
                            <TableCell>Дата создания</TableCell>
                            <TableCell>Действия</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {[1, 2, 3].map(i => (
                            <TableRow key={i}>
                                <TableCell>
                                    <Skeleton />
                                </TableCell>
                                <TableCell>
                                    <Skeleton />
                                </TableCell>
                                <TableCell>
                                    <Skeleton />
                                </TableCell>
                                <TableCell>
                                    <Skeleton />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        );
    }

    if (users.length === 0) {
        return <Alert severity='info'>Пользователи не найдены</Alert>;
    }

    return (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Имя пользователя</TableCell>
                        <TableCell>Роль</TableCell>
                        <TableCell>Дата создания</TableCell>
                        <TableCell>Действия</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {users.map(user => (
                        <TableRow key={user.id}>
                            <TableCell>{user.username}</TableCell>
                            <TableCell>
                                <Chip
                                    label={getRoleLabel(user.role)}
                                    color={getRoleColor(user.role)}
                                    size='small'
                                />
                            </TableCell>
                            <TableCell>
                                {new Date(user.createdAt).toLocaleDateString(
                                    'ru-RU'
                                )}
                            </TableCell>
                            <TableCell>
                                <IconButton
                                    size='small'
                                    onClick={() => onEdit(user)}
                                    color='primary'
                                >
                                    <EditIcon />
                                </IconButton>
                                <IconButton
                                    size='small'
                                    onClick={() => onDelete(user)}
                                    color='error'
                                >
                                    <DeleteIcon />
                                </IconButton>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
