import { type NextRequest, NextResponse } from 'next/server';

import {
    ADMIN_PREFIX,
    API_DOCUMENTS_PATH,
    API_LOGIN_PATH,
    API_PREFIX,
    API_USERS_PATH,
    DOCUMENTS_PAGE_PATH,
    HOME_PATH,
    LOGIN_PAGE_PATH,
} from './constants/api';
import { COOKIE_NAME } from './constants/app';

// interface UserJWTPayload extends JWTPayload {
//     id: string;
//     username: string;
//     role: 'USER' | 'ADMIN' | 'GUEST';
// }

// async function verifyAndDecodeToken(
//     token: string
// ): Promise<UserJWTPayload | null> {
//     if (!JWT_SECRET) {
//         console.error('JWT_SECRET is not set in environment variables');
//         return null;
//     }

//     // sanitize: убираем кавычки и пробелы
//     const compact = token.trim().replace(/^"|"$/g, '');

//     // быстрый валидатор формата "x.y.z"
//     const isCompactJws =
//         /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(compact);
//     if (!isCompactJws) {
//         console.warn('JWT verification failed: non-compact token value');
//         console.log('[middleware] verifyAndDecodeToken compact', compact);
//         return null;
//     }

//     try {
//         const secret = new TextEncoder().encode(JWT_SECRET);

//         const { payload } = await jwtVerify(compact, secret, { clockTolerance: 5 });

//         return payload as UserJWTPayload;
//     } catch (error: unknown) {
//         console.warn(
//             'JWT verification failed:',
//             error instanceof Error ? error.message : 'Unknown error'
//         );
//         return null;
//     }
// }

type UserJWTPayload = {
    id: string;
    username: string;
    role: 'USER' | 'ADMIN' | 'GUEST';
};

function unsafeDecodePayload<T = UserJWTPayload>(token: string): T | null {
    try {
        const parts = token.trim().replace(/^"|"$/g, '').split('.');
        if (parts.length !== 3) return null;
        const body = parts[1]?.replace(/-/g, '+').replace(/_/g, '/');
        if (!body) return null;
        const padded = body + '==='.slice((body.length + 3) % 4);
        const json = atob(padded);
        return JSON.parse(json) as T;
    } catch {
        return null;
    }
}

export async function middleware(request: NextRequest) {
    const { pathname, origin } = request.nextUrl;
    const token = request.cookies.get(COOKIE_NAME)?.value;

    // 1. Пропускаем системные маршруты и статические файлы
    if (
        pathname.startsWith('/_next') ||
        pathname.includes('.') ||
        pathname.startsWith('/api/trpc')
    ) {
        return NextResponse.next();
    }

    // 2. Пропускаем публичные маршруты
    const publicRoutes = [LOGIN_PAGE_PATH, API_LOGIN_PATH];

    if (publicRoutes.includes(pathname)) {
        return NextResponse.next();
    }

    // 3. Проверка аутентификации
    const isAuthenticated = Boolean(token);
    const payload = token ? unsafeDecodePayload<UserJWTPayload>(token) : null;
    const userRole = payload?.role;

    if (!isAuthenticated && pathname === HOME_PATH) {
        return NextResponse.next();
    }

    // 4. Логика для аутентифицированных пользователей
    if (isAuthenticated) {
        // 4.1. Редирект с гостевых маршрутов
        if (pathname === LOGIN_PAGE_PATH || pathname === HOME_PATH) {
            return NextResponse.redirect(new URL(DOCUMENTS_PAGE_PATH, origin));
        }

        // 4.2. Проверка доступа к админским маршрутам
        const isAdminRoute = pathname.startsWith(ADMIN_PREFIX);
        if (isAdminRoute && userRole !== 'ADMIN') {
            console.warn(
                `User ${payload?.username ?? 'unknown'} with role ${userRole} tried to access admin route: ${pathname}`
            );
            return NextResponse.redirect(new URL(DOCUMENTS_PAGE_PATH, origin));
        }

        // 4.3. Проверка доступа для GUEST (только чтение документов)
        const isGuestRoute =
            pathname.startsWith(API_USERS_PATH) ||
            (pathname.startsWith(API_DOCUMENTS_PATH) &&
                request.method !== 'GET');
        if (userRole === 'GUEST' && isGuestRoute) {
            console.warn(
                `Guest user ${payload?.username ?? 'unknown'} tried to access restricted route: ${pathname}`
            );
            return NextResponse.redirect(new URL(DOCUMENTS_PAGE_PATH, origin));
        }

        return NextResponse.next();
    }

    // 5. Логика для неаутентифицированных пользователей
    // 5.1. Для API маршрутов возвращаем 401 вместо редиректа
    if (pathname.startsWith(ADMIN_PREFIX)) {
        if (!isAuthenticated) {
            const loginUrl = new URL(LOGIN_PAGE_PATH, origin);
            loginUrl.searchParams.set('returnTo', pathname);
            return NextResponse.redirect(loginUrl);
        }
        if (userRole !== 'ADMIN') {
            return NextResponse.redirect(new URL(DOCUMENTS_PAGE_PATH, origin));
        }
        return NextResponse.next();
    }

    if (pathname.startsWith(API_PREFIX)) {
        if (!isAuthenticated) {
            return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        // Пример: запрет для GUEST на мутациях пользователей/документов
        const isGuestRestricted =
            pathname.startsWith(API_USERS_PATH) ||
            (pathname.startsWith(API_DOCUMENTS_PATH) &&
                request.method !== 'GET');
        if (userRole === 'GUEST' && isGuestRestricted) {
            return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        return NextResponse.next();
    }

    // 5.2. Редирект на страницу входа с сохранением целевого URL
    if (!isAuthenticated) {
        const loginUrl = new URL(LOGIN_PAGE_PATH, origin);
        loginUrl.searchParams.set('returnTo', pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/).*)',
        '/api/:path*',
    ],
};
