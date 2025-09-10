import { useRouter, useSearchParams } from 'next/navigation';

import {
    ADMIN_PREFIX,
    API_PREFIX,
    DOCUMENTS_PAGE_PATH,
    HOME_PATH,
    LOGIN_PAGE_PATH,
    REGISTER_PAGE_PATH,
} from '@/constants/api';
import { USER_ROLES } from '@/constants/user';
import { UserRole } from '@/lib/types/user';

// Список путей на которые нельзя редиректить
const forbiddenRedirectPaths = [
    LOGIN_PAGE_PATH, // /auth/login
    REGISTER_PAGE_PATH, // /auth/register
    HOME_PATH, // / (главная страница)
];

interface UseAuthRedirectReturn {
    redirectAfterAuth: (userRole: UserRole) => void;
    getRedirectPath: (userRole: UserRole) => string;
}

/**
 * Хук для редиректа после авторизации
 * @returns {UseAuthRedirectReturn}
 */
export function useAuthRedirect(): UseAuthRedirectReturn {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Проверяем, можно ли редиректить на указанный путь
    const isValidRedirectPath = (path: string, userRole: UserRole): boolean => {
        // Нельзя редиректить на запрещенные пути
        if (forbiddenRedirectPaths.includes(path)) {
            return false;
        }

        // Проверяем права доступа к админским маршрутам
        if (path.startsWith(ADMIN_PREFIX) && userRole !== USER_ROLES.ADMIN) {
            return false;
        }

        // Проверяем права доступа для GUEST (только GET запросы)
        if (
            userRole === USER_ROLES.GUEST &&
            path.startsWith(API_PREFIX) &&
            !path.includes(DOCUMENTS_PAGE_PATH)
        ) {
            return false;
        }

        // Путь должен начинаться с /
        if (!path.startsWith('/')) {
            return false;
        }

        return true;
    };

    // Получаем безопасный путь для редиректа
    const getRedirectPath = (userRole: UserRole): string => {
        const returnTo = searchParams.get('returnTo');

        // Если есть returnTo и он валиден - используем его
        if (returnTo && isValidRedirectPath(returnTo, userRole)) {
            return returnTo;
        }

        // Иначе используем дефолтный путь в зависимости от роли
        if (userRole === USER_ROLES.ADMIN) {
            // Админы могут идти в админку или к документам
            return ADMIN_PREFIX;
        }

        if (userRole === USER_ROLES.GUEST) {
            return DOCUMENTS_PAGE_PATH; // Гости идут к документам
        }

        // Обычные пользователи идут к документам
        return DOCUMENTS_PAGE_PATH;
    };

    // Функция для выполнения редиректа
    const redirectAfterAuth = (userRole: UserRole): void => {
        const redirectPath = getRedirectPath(userRole);

        router.replace(redirectPath);
    };

    return {
        redirectAfterAuth,
        getRedirectPath,
    };
}
