'use client';

import { useState } from 'react';

import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import DescriptionIcon from '@mui/icons-material/Description';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { usePathname, useRouter } from 'next/navigation';

import { useTheme } from '@/components/providers/CustomThemeProvider';
import {
    ADMIN_PATH,
    DOCUMENTS_BASE_PATH,
    DOCUMENTS_PAGE_PATH,
    HOME_PATH,
    LOGIN_PAGE_PATH,
    UPLOAD_PAGE_PATH,
} from '@/constants/api';
import { USER_ROLES } from '@/constants/user';
import { useAuth } from '@/lib/hooks/useAuth';

// для светлой темы

interface HeaderProps {
    onSidebarToggle?: () => void;
    showSidebar?: boolean;
}

export function Header({ onSidebarToggle, showSidebar = false }: HeaderProps) {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const { user, logout } = useAuth();
    const { mode, toggleTheme } = useTheme();

    const router = useRouter();
    const pathname = usePathname();

    const isAdmin = user?.role === USER_ROLES.ADMIN;
    const canAddDocument = isAdmin || USER_ROLES.USER;

    const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = async () => {
        await logout();
        router.push(LOGIN_PAGE_PATH);
        handleClose();
    };

    const handleProfile = () => {
        // TODO: Добавить страницу профиля
        handleClose();
    };

    // Навигационные функции
    const navigateToHome = () => {
        router.push(HOME_PATH);
    };

    const navigateToDocuments = () => {
        router.push(DOCUMENTS_PAGE_PATH);
    };

    const navigateToAdmin = () => {
        router.push(ADMIN_PATH);
    };

    const navigateToUpload = () => {
        router.push(UPLOAD_PAGE_PATH);
    };
    return (
        <AppBar
            position='fixed'
            sx={{
                zIndex: theme => theme.zIndex.drawer + 1,
                width: showSidebar
                    ? {
                          xs: '100%',
                          md: `calc(100% - 240px)`,
                      }
                    : '100%',
                ml: showSidebar
                    ? {
                          xs: 0,
                          md: '240px',
                      }
                    : 0,
            }}
        >
            <Toolbar>
                {/* Кнопка меню для мобильной версии (только если есть сайдбар) */}
                {showSidebar && onSidebarToggle && (
                    <IconButton
                        color='inherit'
                        aria-label='открыть меню'
                        onClick={onSidebarToggle}
                        sx={{
                            mr: 2,
                            display: { xs: 'block', md: 'none' },
                        }}
                    >
                        <MenuIcon />
                    </IconButton>
                )}

                {/* Логотип и название */}
                <Typography
                    variant='h6'
                    component='div'
                    sx={{
                        flexGrow: 0,
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        mr: 4,
                    }}
                    onClick={navigateToHome}
                >
                    База знаний
                </Typography>

                {/* Навигационные кнопки (только если НЕ показываем сайдбар) */}
                {!showSidebar && (
                    <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
                        {pathname !== DOCUMENTS_BASE_PATH && (
                            <Button
                                color='inherit'
                                startIcon={<DescriptionIcon />}
                                onClick={navigateToDocuments}
                            >
                                Документы
                            </Button>
                        )}

                        {canAddDocument && (
                            <Button
                                onClick={navigateToUpload}
                                startIcon={<UploadFileIcon />}
                                color='inherit'
                                sx={{ textWrap: 'nowrap' }}
                            >
                                Загрузить документ
                            </Button>
                        )}
                        {/* Админ панель - только для ADMIN */}
                        {user?.role === 'ADMIN' && (
                            <Button
                                color='inherit'
                                startIcon={<AdminPanelSettingsIcon />}
                                onClick={navigateToAdmin}
                                sx={{ textWrap: 'nowrap' }}
                            >
                                Админ панель
                            </Button>
                        )}
                    </Box>
                )}

                {/* Спейсер если показываем сайдбар */}
                {showSidebar && <Box sx={{ flexGrow: 1 }} />}

                {/* Правый блок с пользователем */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Tooltip
                        title={
                            mode === 'dark'
                                ? 'Переключить на светлую тему'
                                : 'Переключить на темную тему'
                        }
                    >
                        <IconButton
                            onClick={toggleTheme}
                            color='inherit'
                            sx={{ mr: 1 }}
                        >
                            {mode === 'dark' ? (
                                <Brightness7Icon />
                            ) : (
                                <Brightness4Icon />
                            )}
                        </IconButton>
                    </Tooltip>

                    <Typography
                        variant='body2'
                        sx={{
                            display: { xs: 'none', sm: 'block' },
                            color: 'inherit',
                        }}
                    >
                        {user?.username}
                    </Typography>

                    <Tooltip title='Настройки аккаунта'>
                        <IconButton
                            size='large'
                            aria-label='аккаунт пользователя'
                            aria-controls='menu-appbar'
                            aria-haspopup='true'
                            onClick={handleMenu}
                            color='inherit'
                        >
                            <Avatar
                                sx={{
                                    width: 32,
                                    height: 32,
                                    bgcolor: 'primary.dark',
                                }}
                            >
                                {user?.username?.charAt(0).toUpperCase()}
                            </Avatar>
                        </IconButton>
                    </Tooltip>

                    <Menu
                        id='menu-appbar'
                        anchorEl={anchorEl}
                        anchorOrigin={{
                            vertical: 'bottom',
                            horizontal: 'right',
                        }}
                        keepMounted
                        transformOrigin={{
                            vertical: 'top',
                            horizontal: 'right',
                        }}
                        open={Boolean(anchorEl)}
                        onClose={handleClose}
                    >
                        <MenuItem onClick={handleProfile}>
                            <AccountCircleIcon sx={{ mr: 1 }} />
                            Профиль
                        </MenuItem>
                        <MenuItem onClick={handleLogout}>
                            <LogoutIcon sx={{ mr: 1 }} />
                            Выйти
                        </MenuItem>
                    </Menu>
                </Box>
            </Toolbar>
        </AppBar>
    );
}
