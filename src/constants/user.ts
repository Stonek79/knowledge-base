export const USER_ROLES = {
    ADMIN: 'ADMIN',
    USER: 'USER',
    GUEST: 'GUEST',
} as const;

export const USER_ROLES_LABELS = {
    [USER_ROLES.ADMIN]: 'Администратор',
    [USER_ROLES.USER]: 'Пользователь',
    [USER_ROLES.GUEST]: 'Гость',
};

export const USER_STATUSES = {
    ACTIVE: 'ACTIVE',
    PLACEHOLDER: 'PLACEHOLDER',
} as const;

export const USER_STATUSES_LABELS = {
    [USER_STATUSES.ACTIVE]: 'Активный',
    [USER_STATUSES.PLACEHOLDER]: 'Временный',
};
