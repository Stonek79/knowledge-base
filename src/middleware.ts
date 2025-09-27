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
import { JWT_SECRET } from './constants/auth';

type UserJWTPayload = {
    id: string;
    username: string;
    role: 'USER' | 'ADMIN' | 'GUEST';
    exp?: number; // Срок действия токена
};

async function verifyJwtSafe(token: string): Promise<UserJWTPayload | null> {
    try {
        const jwtSecret = process.env.JWT_SECRET || JWT_SECRET;
        if (!jwtSecret) {
            console.error('JWT_SECRET not set in environment variables');
            return null;
        }

        const parts = token.trim().replace(/^"|"$/g, '').split('.');
        if (parts.length !== 3) return null;

        const [headerB64, payloadB64, signatureB64] = parts;

        // Создаем ключ из секрета для HMAC-SHA256
        const secretKey = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(jwtSecret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );

        // Проверяем подпись
        const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
        const signature = Uint8Array.from(
            atob(signatureB64?.replace(/-/g, '+').replace(/_/g, '/') ?? ''),
            c => c.charCodeAt(0)
        );

        const isValid = await crypto.subtle.verify(
            'HMAC',
            secretKey,
            signature,
            data
        );

        if (!isValid) {
            console.warn('JWT signature verification failed');
            return null;
        }

        // Декодируем payload безопасно
        const payloadJson = atob(
            payloadB64?.replace(/-/g, '+').replace(/_/g, '/') ?? ''
        );
        const payload = JSON.parse(payloadJson) as UserJWTPayload;

        // Проверяем срок действия
        if (payload.exp && payload.exp < Date.now() / 1000) {
            console.warn('JWT token expired');
            return null;
        }

        return payload;
    } catch (error) {
        console.warn(
            'JWT verification failed:',
            error instanceof Error ? error.message : 'Unknown error'
        );
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
    const payload = token ? await verifyJwtSafe(token) : null;
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
