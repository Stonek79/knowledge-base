import type { ActionType } from '@/lib/types/audit-log'

export const ACTION_TYPE = {
    USER_LOGIN: 'USER_LOGIN',
    USER_LOGOUT: 'USER_LOGOUT',
    USER_LOGIN_FAILED: 'USER_LOGIN_FAILED',
    USER_CREATED: 'USER_CREATED',
    USER_UPDATED: 'USER_UPDATED',
    USER_DELETED: 'USER_DELETED',
    USER_PASSWORD_CHANGED: 'USER_PASSWORD_CHANGED',
    PROFILE_UPDATED: 'PROFILE_UPDATED',
    DOCUMENT_CREATED: 'DOCUMENT_CREATED',
    DOCUMENT_UPDATED: 'DOCUMENT_UPDATED',
    DOCUMENT_VIEWED: 'DOCUMENT_VIEWED',
    DOCUMENT_DOWNLOADED: 'DOCUMENT_DOWNLOADED',
    DOCUMENT_DELETED_SOFT: 'DOCUMENT_DELETED_SOFT',
    DOCUMENT_DELETED_HARD: 'DOCUMENT_DELETED_HARD',
    DOCUMENT_RESTORED: 'DOCUMENT_RESTORED',
    DOCUMENT_ACCESS_GRANTED: 'DOCUMENT_ACCESS_GRANTED',
    DOCUMENT_ACCESS_REVOKED: 'DOCUMENT_ACCESS_REVOKED',
    CATEGORY_CREATED: 'CATEGORY_CREATED',
    CATEGORY_UPDATED: 'CATEGORY_UPDATED',
    CATEGORY_DELETED: 'CATEGORY_DELETED',
    SYSTEM_SETTINGS_UPDATED: 'SYSTEM_SETTINGS_UPDATED',
} as const

export const ACTION_TYPE_VALUES = Object.values(ACTION_TYPE)

export const TARGET_TYPE = {
    USER: 'USER',
    DOCUMENT: 'DOCUMENT',
    CATEGORY: 'CATEGORY',
    SYSTEM: 'SYSTEM',
} as const

export const TARGET_TYPE_LABELS = {
    USER: 'Пользователь',
    DOCUMENT: 'Документ',
    CATEGORY: 'Категория',
    SYSTEM: 'Системный',
} as const

export const TARGET_TYPE_VALUES = Object.values(TARGET_TYPE)

// Человекочитаемые метки для каждого типа действия в логе
export const AUDIT_LOG_ACTION_LABELS: Record<ActionType, string> = {
    // Пользователи и Авторизация
    USER_LOGIN: 'Вход пользователя',
    USER_LOGOUT: 'Выход пользователя',
    USER_LOGIN_FAILED: 'Неудачная попытка входа',
    USER_CREATED: 'Создание пользователя',
    USER_UPDATED: 'Обновление пользователя',
    USER_DELETED: 'Удаление пользователя',
    USER_PASSWORD_CHANGED: 'Смена пароля',
    PROFILE_UPDATED: 'Обновление профиля',

    // Документы
    DOCUMENT_CREATED: 'Создание документа',
    DOCUMENT_UPDATED: 'Обновление документа',
    DOCUMENT_VIEWED: 'Просмотр документа',
    DOCUMENT_DOWNLOADED: 'Скачивание документа',
    DOCUMENT_DELETED_SOFT: 'Документ перемещен в корзину',
    DOCUMENT_DELETED_HARD: 'Документ удален навсегда',
    DOCUMENT_RESTORED: 'Документ восстановлен',

    // Управление доступом
    DOCUMENT_ACCESS_GRANTED: 'Предоставление доступа к документу',
    DOCUMENT_ACCESS_REVOKED: 'Отзыв доступа к документу',

    // Категории и Системные настройки (админ)
    CATEGORY_CREATED: 'Создание категории',
    CATEGORY_UPDATED: 'Обновление категории',
    CATEGORY_DELETED: 'Удаление категории',
    SYSTEM_SETTINGS_UPDATED: 'Обновление настроек системы',
}

// Поля, по которым можно будет сортировать список логов
export const AUDIT_LOG_SORTABLE_FIELDS = {
    TIMESTAMP: 'timestamp',
    ACTION: 'action',
    USER: 'user', // Подразумевает сортировку по имени пользователя
} as const

export const AUDIT_LOG_FIELD_LABELS: Record<string, string> = {
    // Document fields
    title: 'Заголовок',
    description: 'Описание',
    authorId: 'Автор',
    categories: 'Категории',
    keywords: 'Ключевые слова',
    isConfidential: 'Конфиденциальность',
    isSecret: 'Секретность',
    mainFile: 'Основной файл',
    attachmentsAdded: 'Добавленные вложения',
    attachmentsDeleted: 'Удаленные вложения',
    attachmentsReordered: 'Порядок вложений',
    confidentialAccess: 'Доступ',

    // User fields
    username: 'Имя пользователя',
    role: 'Роль',
    status: 'Статус',
    enabled: 'Активация',

    // Profile fields
    fullName: 'Полное имя',
    jobTitle: 'Должность',
    email: 'Email',
    phoneCity: 'Городской телефон',
    phoneInternal: 'Внутренний телефон',
    phoneMobile: 'Мобильный телефон',
    manager: 'Руководитель',
    birthday: 'Дата рождения',
    aboutMe: 'О себе',
}
