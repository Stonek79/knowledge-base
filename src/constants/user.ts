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
