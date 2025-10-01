import type { Prisma, Role, User } from '@prisma/client';
import { z } from 'zod';

import {
    createUserSchema,
    updateUserSchema,
    userResponseSchema,
} from '../schemas/user';

// Типы для API запросов
export type CreateUserData = z.infer<typeof createUserSchema>;
export type UpdateUserData = z.infer<typeof updateUserSchema>;
export type UsersListParams = {
    page: number;
    limit: number;
    search?: string;
    role?: Role;
    sortBy?: keyof User;
    sortOrder?: 'asc' | 'desc';
};

// Базовые типы пользователя
export type UserResponse = z.infer<typeof userResponseSchema>;
export type BaseUser = Pick<UserResponse, 'id' | 'username' | 'role'>;
export type UserCheckResponse = Pick<UserResponse, 'id' | 'role'>;
export type UserLoginInput = Pick<CreateUserData, 'username' | 'password'>;
export type UserRole = Role;
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
