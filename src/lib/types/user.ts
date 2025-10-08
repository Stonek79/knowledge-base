import type {
    Prisma,
    UserStatus as PrismaUserStatus,
    Role,
    User,
} from '@prisma/client';
import { z } from 'zod';

import { USER_SORTABLE_FIELDS } from '@/constants/user';

import {
    createUserSchema,
    updateUserSchema,
    userResponseSchema,
} from '../schemas/user';
import type { Profile } from './profile';

// Типы для API запросов
export type CreateUserData = z.infer<typeof createUserSchema>;
export type UpdateUserData = z.infer<typeof updateUserSchema>;
export type UserSortableFields =
    (typeof USER_SORTABLE_FIELDS)[keyof typeof USER_SORTABLE_FIELDS];
export type UsersListParams = {
    page?: number;
    limit?: number;
    search?: string;
    role?: Role;
    sortBy?: UserSortableFields;
    sortOrder?: 'asc' | 'desc';
    status?: string;
};

// Базовые типы пользователя
export type UserResponse = z.infer<typeof userResponseSchema>;
export type BaseUser = Pick<UserResponse, 'id' | 'username' | 'role'>;
export type UserCheckResponse = Pick<UserResponse, 'id' | 'role'>;
export type UserLoginInput = Pick<CreateUserData, 'username' | 'password'>;
export type UserRole = Role;
export type UserStatus = PrismaUserStatus;
export type UserWithDocuments = UserResponse & {
    _count: {
        authoredDocuments: number;
    };
    authoredDocuments: Array<{
        id: string;
        title: string;
        createdAt: Date;
    }>;
};

export type UserWithProfile = User & {
    profile: Profile | null;
};

// Типы для Prisma запросов
export type UserWhereInput = Prisma.UserWhereInput;
export type UserSelect = Prisma.UserSelect;
export type UserOrderByWithRelationInput = Prisma.UserOrderByWithRelationInput;
export type UserCreateInput = Prisma.UserCreateInput;
export type UserUpdateInput = Prisma.UserUpdateInput;

// Типы для API ответов
export type UsersListResponse = {
    users: UserWithDocuments[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
    stats: {
        totalUsers: number;
        oldestUser: Date | null;
        newestUser: Date | null;
    };
};

export type CreateUserResponse = {
    message: string;
    user: UserResponse & {
        _count: {
            authoredDocuments: number;
        };
    };
};

export type UpdateUserResponse = {
    message: string;
    user: UserResponse & {
        _count: {
            authoredDocuments: number;
        };
    };
};

export type DeleteUserResponse = {
    message: string;
};
