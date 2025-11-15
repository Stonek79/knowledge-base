export const NAVIGATION = {
    // Названия разделов
    SECTIONS: {
        DASHBOARD: 'Дашборд',
        USERS: 'Пользователи',
        DOCUMENTS: 'Документы',
        SETTINGS: 'Настройки',
        CATEGORIES: 'Категории',
        LOGS: 'Логи',
        DOCS: 'API документация'
    },

    // Пути
    PATHS: {
        DASHBOARD: '/admin',
        USERS: '/admin/users',
        DOCUMENTS: '/admin/documents',
        SETTINGS: '/admin/settings',
        CATEGORIES: '/admin/categories',
        LOGS: '/admin/logs',
        DOCS: '/admin/api-docs'
    },

    // Иконки (для Sidebar)
    ICONS: {
        DASHBOARD: 'DashboardIcon',
        USERS: 'PeopleIcon',
        DOCUMENTS: 'DescriptionIcon',
        SETTINGS: 'SettingsIcon',
        CATEGORIES: 'CategoriesIcon',
        LOGS: 'LogsIcon',
        DOCS: 'ApiDocsIcon'
    },
} as const
