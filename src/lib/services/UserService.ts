import bcrypt from 'bcryptjs'

import { USER_ROLES, USER_STATUSES } from '@/constants/user'
import { ApiError } from '@/lib/api'
import { UserRepository } from '@/lib/repositories/userRepository'
import type { ProfileUpdate } from '@/lib/types/profile'
import type { BaseUser } from '@/lib/types/user'

/**
 * UserService инкапсулирует бизнес-логику для работы с пользователями.
 */
export class UserService {
    /**
     * Находит пользователя по имени или создает нового "пользователя-плейсхолдера",
     * если такой не найден.
     * @param name - Имя пользователя для поиска или создания.
     * @returns - Найденный или созданный объект пользователя.
     */
    public static async findOrCreateAuthor(name: string): Promise<BaseUser> {
        const trimmedName = name.trim()
        if (!trimmedName) {
            throw new ApiError('Имя автора не может быть пустым', 400)
        }

        const existingUser = await UserRepository.findByUsername(trimmedName)

        if (existingUser) {
            return existingUser
        }

        // Если не найден, создаем нового пользователя-плейсхолдера
        return UserRepository.createUser({
            username: trimmedName,
            password: undefined, // У плейсхолдера нет пароля
            role: USER_ROLES.USER,
            status: USER_STATUSES.PLACEHOLDER,
            enabled: false,
        })
    }

    /**
     * Получает профиль пользователя.
     * @param userId - ID пользователя.
     */
    public static async getProfile(userId: string) {
        const userWithProfile = await UserRepository.findUserWithProfile(userId)
        if (!userWithProfile) {
            throw new ApiError('Пользователь не найден', 404)
        }
        return userWithProfile
    }

    /**
     * Обновляет профиль пользователя.
     * @param userId - ID пользователя.
     * @param data - Данные для обновления.
     */
    public static async updateProfile(userId: string, data: ProfileUpdate) {
        return UserRepository.upsertProfile(userId, data)
    }

    /**
     * Изменяет пароль пользователя.
     * @param userId - ID пользователя.
     * @param newPassword - Новый пароль.
     */
    public static async changePassword(
        userId: string,
        oldPassword: string,
        newPassword: string
    ) {
        const user = await UserRepository.findById(userId)
        if (!user?.password) {
            // потенциальная, но крайне невероятная ситуация для пользователя со статусом PLACEHOLDER
            throw new ApiError('Пользователь не имеет пароля', 400)
        }

        const isPasswordCorrect = await bcrypt.compare(
            oldPassword,
            user.password
        )

        if (!isPasswordCorrect) {
            throw new ApiError('Неправильный текущий пароль', 400)
        }

        const newHashedPassword = await bcrypt.hash(newPassword, 12)

        return UserRepository.updatePassword(userId, newHashedPassword)
    }
}
