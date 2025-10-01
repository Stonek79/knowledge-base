import { Role, User, UserStatus } from '@prisma/client';

import { ApiError } from '@/lib/api';
import { prisma } from '@/lib/prisma';

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
    public static async findOrCreateAuthor(name: string): Promise<User> {
        const trimmedName = name.trim();
        if (!trimmedName) {
            throw new ApiError('Имя автора не может быть пустым', 400);
        }

        // Поиск существующего пользователя без учета регистра
        const existingUser = await prisma.user.findFirst({
            where: {
                username: {
                    equals: trimmedName,
                    mode: 'insensitive',
                },
            },
        });

        if (existingUser) {
            return existingUser;
        }

        // Если не найден, создаем нового пользователя-плейсхолдера
        const newUser = await prisma.user.create({
            data: {
                username: trimmedName,
                password: null, // У плейсхолдера нет пароля
                role: Role.USER,
                status: UserStatus.PLACEHOLDER,
                enabled: false,
                profile: {
                    create: {
                        fullName: trimmedName, // Используем имя как fullName по умолчанию
                    },
                },
            },
        });

        return newUser;
    }

    // TODO: В будущем сюда можно будет перенести остальную логику управления пользователями
    // (создание полноценных пользователей, обновление, удаление и т.д.)
}
