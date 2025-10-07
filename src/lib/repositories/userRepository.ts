import { profileVisibilityDefaults } from '@/constants/user';
import { prisma } from '@/lib/prisma';
import { PrismaProfile, Profile, ProfileUpdate } from '@/lib/types/profile';
import {
    BaseUser,
    CreateUserData,
    UserResponse,
    UserWithProfile,
} from '@/lib/types/user';

import {
    profileSchema,
    profileVisibilitySettingsSchema,
} from '../schemas/profile';

const normalizeVisibilitySettings = (
    rawSettings: unknown
): Record<string, boolean> => {
    const parsed = profileVisibilitySettingsSchema
        .partial()
        .parse(rawSettings ?? {});

    return {
        ...profileVisibilityDefaults,
        ...parsed,
    };
};

const mapPrismaProfile = (profile: PrismaProfile | null): Profile | null => {
    if (!profile) {
        return null;
    }

    const visibilitySettings = normalizeVisibilitySettings(
        profile.visibilitySettings
    );

    return profileSchema.parse({
        ...profile,
        visibilitySettings,
    });
};

/**
 * UserRepository инкапсулирует логику прямого доступа к данным для моделей User и Profile.
 */
export class UserRepository {
    /**
     * Находит пользователя по имени (без учета регистра).
     * @param username - Имя пользователя.
     */
    public static async findByUsername(
        username: string
    ): Promise<BaseUser | null> {
        return prisma.user.findFirst({
            where: {
                username: {
                    equals: username,
                    mode: 'insensitive',
                },
            },
        });
    }

    /**
     * Создает нового пользователя.
     * @param data - Данные для создания пользователя.
     */
    public static async createUser(
        data: CreateUserData
    ): Promise<UserResponse> {
        return prisma.user.create({ data });
    }

    /**
     * Находит пользователя и его профиль по ID пользователя.
     * Гарантирует, что возвращаемый объект соответствует типам приложения.
     * @param userId - ID пользователя.
     */
    public static async findUserWithProfile(
        userId: string
    ): Promise<UserWithProfile | null> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                profile: true,
            },
        });

        if (!user) {
            return null;
        }

        const mappedProfile = mapPrismaProfile(user.profile);

        const userWithProfile: UserWithProfile = {
            ...user,
            profile: mappedProfile,
        };

        return userWithProfile;
    }

    /**
     * Обновляет или создает профиль пользователя.
     * @param userId - ID пользователя.
     * @param data - Данные для обновления.
     */
    public static async upsertProfile(
        userId: string,
        data: ProfileUpdate
    ): Promise<Profile> {
        const { visibilitySettings, ...restOfData } = data;

        const existingProfile = await prisma.profile.findUnique({
            where: { userId },
            select: { visibilitySettings: true },
        });

        const persistedSettings = normalizeVisibilitySettings(
            existingProfile?.visibilitySettings
        );

        const incomingSettings = visibilitySettings
            ? profileVisibilitySettingsSchema
                  .partial()
                  .parse(visibilitySettings)
            : {};

        const mergedSettings = {
            ...persistedSettings,
            ...incomingSettings,
        };

        const profileDataForDb = {
            ...restOfData,
            visibilitySettings: mergedSettings,
        };

        const result = await prisma.profile.upsert({
            where: { userId },
            update: profileDataForDb,
            create: {
                userId,
                ...profileDataForDb,
            },
        });

        const mappedProfile = mapPrismaProfile(result);

        if (!mappedProfile) {
            throw new Error('Не удалось собрать профиль пользователя');
        }

        return mappedProfile;
    }
}
