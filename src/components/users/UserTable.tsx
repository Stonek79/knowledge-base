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
    TableSortLabel,
} from '@mui/material';

import {
    USER_ROLES,
    USER_SORTABLE_FIELDS_LABELS,
    USER_STATUSES,
} from '@/constants/user';
import {
    UserRole,
    UserSortableFields,
    UserStatus,
    UserWithDocuments,
} from '@/lib/types/user';

interface UserTableProps {
    users: UserWithDocuments[];
    isLoading: boolean;
    onEdit: (user: UserWithDocuments) => void;
    onDelete: (user: UserWithDocuments) => void;
    sortBy: UserSortableFields;
    sortOrder: 'asc' | 'desc';
    onSort: (field: UserSortableFields) => void;
}

const columns: {
    id: UserSortableFields;
    label: string;
    sortable: boolean;
}[] = [
    {
        id: 'username',
        label: USER_SORTABLE_FIELDS_LABELS.username,
        sortable: true,
    },
    { id: 'role', label: USER_SORTABLE_FIELDS_LABELS.role, sortable: true },
    { id: 'status', label: USER_SORTABLE_FIELDS_LABELS.status, sortable: true },
    {
        id: 'createdAt',
        label: USER_SORTABLE_FIELDS_LABELS.createdAt,
        sortable: true,
    },
    {
        id: 'actions',
        label: USER_SORTABLE_FIELDS_LABELS.actions,
        sortable: false,
    },
];

export function UserTable({
    users,
    isLoading,
    onEdit,
    onDelete,
    sortBy,
    sortOrder,
    onSort,
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

    const getUserStatusColor = (status: UserStatus) => {
        switch (status) {
            case USER_STATUSES.ACTIVE:
                return 'success';
            case USER_STATUSES.PLACEHOLDER:
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
                            {columns.map(column => (
                                <TableCell key={column.id}>
                                    {column.label}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {[1, 2, 3].map(i => (
                            <TableRow key={i}>
                                {columns.map(column => (
                                    <TableCell key={column.id}>
                                        <Skeleton />
                                    </TableCell>
                                ))}
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
                        {columns.map(column => (
                            <TableCell key={column.id}>
                                {column.sortable ? (
                                    <TableSortLabel
                                        active={sortBy === column.id}
                                        direction={
                                            sortBy === column.id
                                                ? sortOrder
                                                : 'asc'
                                        }
                                        onClick={() => onSort(column.id)}
                                    >
                                        {column.label}
                                    </TableSortLabel>
                                ) : (
                                    column.label
                                )}
                            </TableCell>
                        ))}
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
                                <Chip
                                    label={user.status}
                                    color={getUserStatusColor(
                                        user.status || USER_STATUSES.ACTIVE
                                    )}
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
