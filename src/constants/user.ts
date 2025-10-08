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

export const profileVisibilityDefaults = {
    fullName: true,
    jobTitle: true,
    email: true,
    phoneCity: true,
    phoneInternal: true,
    phoneMobile: true,
    manager: true,
    birthday: true,
    aboutMe: true,
};

export const USER_SORTABLE_FIELDS = {
    CREATED_AT: 'createdAt',
    ROLE: 'role',
    STATUS: 'status',
    USERNAME: 'username',
    ACTIONS: 'actions',
} as const;

export const USER_SORTABLE_FIELDS_LABELS = {
    [USER_SORTABLE_FIELDS.CREATED_AT]: 'Дата создания',
    [USER_SORTABLE_FIELDS.ROLE]: 'Роль',
    [USER_SORTABLE_FIELDS.STATUS]: 'Статус',
    [USER_SORTABLE_FIELDS.USERNAME]: 'Имя пользователя',
    [USER_SORTABLE_FIELDS.ACTIONS]: 'Действия',
};
