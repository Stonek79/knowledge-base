'use client'

import ApiIcon from '@mui/icons-material/Api'
import CategoryIcon from '@mui/icons-material/Category'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import DashboardIcon from '@mui/icons-material/Dashboard'
import DescriptionIcon from '@mui/icons-material/Description'
import PeopleIcon from '@mui/icons-material/People'
import SettingsIcon from '@mui/icons-material/Settings'
import { useMediaQuery, useTheme } from '@mui/material'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Toolbar from '@mui/material/Toolbar'
import { usePathname, useRouter } from 'next/navigation'
import { NAVIGATION } from '@/constants/navigation'

const DRAWER_WIDTH = 240

interface SidebarProps {
    open: boolean
    onToggle: () => void
}

export function Sidebar({ open, onToggle }: SidebarProps) {
    const router = useRouter()
    const pathname = usePathname()
    const theme = useTheme()
    const isMobile = useMediaQuery(theme.breakpoints.down('md'))

    const menuItems = [
        {
            text: NAVIGATION.SECTIONS.DASHBOARD,
            icon: <DashboardIcon />,
            path: NAVIGATION.PATHS.DASHBOARD,
        },
        {
            text: NAVIGATION.SECTIONS.USERS,
            icon: <PeopleIcon />,
            path: NAVIGATION.PATHS.USERS,
        },
        {
            text: NAVIGATION.SECTIONS.DOCUMENTS,
            icon: <DescriptionIcon />,
            path: NAVIGATION.PATHS.DOCUMENTS,
        },
        {
            text: NAVIGATION.SECTIONS.SETTINGS,
            icon: <SettingsIcon />,
            path: NAVIGATION.PATHS.SETTINGS,
        },
        {
            text: NAVIGATION.SECTIONS.CATEGORIES,
            icon: <CategoryIcon />,
            path: NAVIGATION.PATHS.CATEGORIES,
        },
        {
            text: NAVIGATION.SECTIONS.DOCS,
            icon: <ApiIcon />,
            path: NAVIGATION.PATHS.DOCS
        },
    ]

    const handleNavigation = (path: string) => {
        router.push(path)
        // Закрываем drawer на мобильных после навигации
        if (isMobile) {
            onToggle()
        }
    }

    const drawerContent = (
        <>
            <Toolbar
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    px: [1],
                }}
            >
                <IconButton onClick={onToggle}>
                    <ChevronLeftIcon />
                </IconButton>
            </Toolbar>
            <Divider />
            <List>
                {menuItems.map(item => (
                    <ListItem key={item.text} disablePadding>
                        <ListItemButton
                            selected={pathname === item.path}
                            onClick={() => handleNavigation(item.path)}
                            sx={{
                                '&.Mui-selected': {
                                    backgroundColor: 'primary.light',
                                    '&:hover': {
                                        backgroundColor: 'primary.light',
                                    },
                                },
                            }}
                        >
                            <ListItemIcon sx={{ color: 'inherit' }}>
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText primary={item.text} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
        </>
    )

    return (
        <>
            {/* Мобильный Drawer */}
            <Drawer
                variant='temporary'
                open={open && isMobile}
                onClose={onToggle}
                ModalProps={{
                    keepMounted: true, // Лучшая производительность на мобильных
                }}
                sx={{
                    display: { xs: 'block', md: 'none' },
                    '& .MuiDrawer-paper': {
                        boxSizing: 'border-box',
                        width: DRAWER_WIDTH,
                    },
                }}
            >
                {drawerContent}
            </Drawer>

            {/* Десктопный Drawer */}
            <Drawer
                variant='permanent'
                sx={{
                    display: { xs: 'none', md: 'block' },
                    '& .MuiDrawer-paper': {
                        boxSizing: 'border-box',
                        width: DRAWER_WIDTH,
                    },
                }}
                open
            >
                {drawerContent}
            </Drawer>
        </>
    )
}
