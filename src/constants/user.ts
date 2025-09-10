import { Role } from '@prisma/client';

export const USER_ROLES = Role;
export const USER_ROLES_LABELS = {
    [Role.ADMIN]: 'Администратор',
    [Role.USER]: 'Пользователь',
    [Role.GUEST]: 'Гость',
};
