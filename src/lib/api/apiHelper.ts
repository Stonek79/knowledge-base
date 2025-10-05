import type { ApiErrorPayload } from '@/lib/api/apiError';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | { [key: string]: JsonValue } | JsonValue[];

/** @internal */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** @internal */
function isStringArray(value: unknown): value is string[] {
    return (
        Array.isArray(value) && value.every(item => typeof item === 'string')
    );
}

/**
 * Нормализует тело ошибки к формату ApiErrorPayload.
 * Источник сообщения: data.message → data.error → fallbackMessage.
 * Поле errors приводится к Record<string, string[]> (если возможно), иначе null.
 * Если тело пустое или некорректно — возвращает fallbackMessage и errors=null.
 */
function extractPayload(
    data: JsonValue | null,
    fallbackMessage: string
): ApiErrorPayload {
    const payload: ApiErrorPayload = {
        message: fallbackMessage || 'Request failed',
        errors: null,
    };

    if (!isRecord(data)) return payload;

    const msg = data['message'];
    const alt = data['error'];
    if (typeof msg === 'string') {
        payload.message = msg;
    } else if (typeof alt === 'string') {
        payload.message = alt;
    }

    const err = data['errors'];
    if (isRecord(err)) {
        const normalized: Record<string, string[]> = {};
        for (const [key, val] of Object.entries(err)) {
            if (isStringArray(val)) normalized[key] = val;
        }
        payload.errors = Object.keys(normalized).length ? normalized : null;
    }

    return payload;
}

/**
 * Клиентский HTTP-хелпер для единообразной работы с API.
 *
 * Особенности:
 * - Всегда отправляет запросы с credentials: 'include' (куки/сессии)
 * - Автоматически парсит JSON (или безопасно пропускает, если тело пустое)
 * - Единый формат ошибок: ApiHttpError со структурой, совместимой с серверным ApiErrorPayload
 * - Утилита makeSWRFetcher для удобной интеграции с SWR, с опцией returnNullOn401
 *
 * Контракт ошибок API (сервер → клиент):
 * {
 *   "message": string,
 *   "errors"?: Record<string, string[]> | null
 * }
 *
 * Серверная сторона гарантирует этот формат через handleApiError(ApiError | ZodError | unknown).
 * Данный хелпер приводит клиентские ошибки к ApiHttpError с payload указанной формы.
 */

/**
 * Клиентская ошибка HTTP-запроса (UI-слой).
 * Соответствует формату, возвращаемому сервером (ApiErrorPayload).
 *
 * @example
 * try {
 *   await api.get('/api/documents');
 * } catch (e) {
 *   if (e instanceof ApiHttpError) {
 *     console.error(e.status, e.payload.message, e.payload.errors);
 *   }
 * }
 */
export class ApiHttpError extends Error {
    constructor(
        public status: number,
        public payload: ApiErrorPayload
    ) {
        super(payload.message);
        this.name = 'ApiHttpError';
    }
}

/**
 * Безопасно парсит JSON-тело ответа.
 * Возвращает null, если тело пустое или не JSON.
 * @internal
 */
async function parseJsonSafe(res: Response): Promise<JsonValue | null> {
    try {
        return await res.json();
    } catch {
        return null;
    }
}

/**
 * Базовая функция запроса.
 * - Всегда отправляет credentials: 'include'
 * - Устанавливает Content-Type: application/json (если body не FormData)
 * - Возвращает результат парсинга JSON или undefined для 204
 * - Бросает ApiHttpError с payload { message, errors? } для любых не-2xx
 *
 * @param url - конечная точка API
 * @param init - стандартный RequestInit (метод, заголовки и т.д.)
 * @throws ApiHttpError - при статусе не в диапазоне 200–299
 */
export async function request<T>(
    url: string,
    init: RequestInit = {}
): Promise<T> {
    const headersInit = init.headers;
    const headers: Record<string, string> = {};
    if (headersInit instanceof Headers) {
        headersInit.forEach((v, k) => {
            headers[k] = v;
        });
    } else if (Array.isArray(headersInit)) {
        for (const [k, v] of headersInit) headers[k] = v;
    } else if (headersInit && typeof headersInit === 'object') {
        for (const [k, v] of Object.entries(headersInit)) {
            if (typeof v === 'string') headers[k] = v;
        }
    }

    const isFormData =
        typeof FormData !== 'undefined' && init.body instanceof FormData;
    const hasContentType = Object.keys(headers).some(
        h => h.toLowerCase() === 'content-type'
    );
    if (!isFormData && !hasContentType) {
        headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, {
        credentials: 'include',
        headers,
        ...init,
    });

    if (res.status === 204) return undefined as unknown as T;

    const data = await parseJsonSafe(res);
    if (!res.ok) {
        const payload = extractPayload(
            data,
            res.statusText || 'Request failed'
        );
        throw new ApiHttpError(res.status, payload);
    }

    return (data ?? undefined) as T;
}

/**
 * Упрощённые методы поверх request для типовых операций.
 *
 * @method get - GET запрос
 * @method post - POST запрос (поддерживает FormData как body, иначе JSON)
 * @method put - PUT запрос (JSON)
 * @method patch - PATCH запрос (JSON)
 * @method del - DELETE запрос
 *
 * @example
 * const { user } = await api.post<{ user: UserResponse }>('/api/auth/login', { username, password });
 */
export const api = {
    get: <T>(url: string, init?: RequestInit) =>
        request<T>(url, { ...init, method: 'GET' }),
    post: <T>(url: string, body?: unknown, init?: RequestInit) =>
        request<T>(url, {
            ...init,
            method: 'POST',
            body: body instanceof FormData ? body : JSON.stringify(body),
        }),
    put: <T>(url: string, body?: unknown, init?: RequestInit) =>
        request<T>(url, { ...init, method: 'PUT', body: JSON.stringify(body) }),
    patch: <T>(url: string, body?: unknown, init?: RequestInit) =>
        request<T>(url, {
            ...init,
            method: 'PATCH',
            body: JSON.stringify(body),
        }),
    del: <T>(url: string, init?: RequestInit) =>
        request<T>(url, { ...init, method: 'DELETE' }),
};

/**
 * Фабрика fetcher для SWR.
 * Если returnNullOn401=true — возвращает null при 401, иначе пробрасывает ApiHttpError.
 *
 * @example
 * const fetcher = makeSWRFetcher({ returnNullOn401: true });
 * const { data } = useSWR<UserResponse | null>('/api/auth/me', fetcher);
 */
/** SWR-совместимый fetcher. Если returnNullOn401=true — вернёт null на 401 вместо throw. */
export const makeSWRFetcher =
    (opts?: { returnNullOn401?: boolean } | undefined) =>
    async <T>(url: string) => {
        try {
            return await api.get<T>(url);
        } catch (e) {
            if (e instanceof ApiHttpError && e.status === 401) {
                if (opts?.returnNullOn401) return null as unknown as T;
                return Promise.reject(e);
            }
            throw e;
        }
    };

/**
 * Скачивает бинарный файл и инициирует сохранение в браузере.
 * Извлекает имя файла из Content-Disposition, при наличии.
 *
 * @param url - ссылка для скачивания (с куками)
 * @param fallbackFileName - имя файла, если заголовок не задан
 * @param init - дополнительные опции запроса (без credentials — они уже добавлены)
 * @throws ApiHttpError если статус не 2xx
 */
export async function downloadBlob(
    url: string,
    fallbackFileName?: string,
    init?: Omit<RequestInit, 'credentials'>
): Promise<void> {
    const res = await fetch(url, { credentials: 'include', ...init });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new ApiHttpError(res.status, {
            message: text || res.statusText,
            errors: null,
        });
    }

    const blob = await res.blob();
    const cd = res.headers.get('Content-Disposition') ?? '';
    const m = cd.match(/filename\*?=(?:UTF-8''|)["']?([^;"']+)/i);
    const fileName = m?.[1]
        ? decodeURIComponent(m[1])
        : (fallbackFileName ?? 'download');

    const a = document.createElement('a');
    const objectUrl = URL.createObjectURL(blob);
    a.href = objectUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
}

type QueryPrimitive = string | number | boolean | null | undefined | Date;
type QueryValue = QueryPrimitive | QueryPrimitive[];

/**
 * Собирает query-строку из объекта параметров.
 * - Date сериализуется в ISO 8601
 * - Массивы превращаются в повторяющиеся ключи: ?tag=a&tag=b
 * - null/undefined пропускаются
 */
export function buildQuery(params: Record<string, QueryValue>): string {
    const sp = new URLSearchParams();

    const append = (key: string, v: QueryPrimitive): void => {
        if (v === null || v === undefined) return;
        const val = v instanceof Date ? v.toISOString() : String(v);
        sp.append(key, val);
    };

    for (const [k, v] of Object.entries(params)) {
        if (Array.isArray(v)) {
            v.forEach(item => append(k, item));
        } else {
            append(k, v);
        }
    }
    return sp.toString();
}

/**
 * Выполняет функцию с ретраями по экспоненциальной схеме.
 *
 * @param fn - операция (например, () => api.get(...))
 * @param opts.retries - число повторов (по умолчанию 3)
 * @param opts.baseMs - базовая задержка (по умолчанию 200мс)
 * @param opts.maxMs - максимальная задержка (по умолчанию 2000мс)
 * @param opts.jitter - случайный разброс задержки (по умолчанию true)
 * @param opts.retryOn - предикат, нужно ли повторять для данной ошибки
 *
 * По умолчанию повторяет на сетевых ошибках, 429 и 5xx.
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    opts?: {
        retries?: number;
        baseMs?: number;
        maxMs?: number;
        jitter?: boolean;
        retryOn?: (err: unknown) => boolean;
    }
): Promise<T> {
    const retries = opts?.retries ?? 3;
    const baseMs = opts?.baseMs ?? 200;
    const maxMs = opts?.maxMs ?? 2000;
    const jitter = opts?.jitter ?? true;
    const retryOn =
        opts?.retryOn ??
        ((err: unknown) => {
            if (err instanceof ApiHttpError) {
                return (
                    err.status === 429 ||
                    (err.status >= 500 && err.status <= 599)
                );
            }
            // сетевые/транзиентные ошибки
            return true;
        });

    let attempt = 0;
     
    while (true) {
        try {
            return await fn();
        } catch (e) {
            if (attempt >= retries || !retryOn(e)) throw e;
            const exp = Math.min(maxMs, baseMs * 2 ** attempt);
            const delay = jitter ? Math.random() * exp : exp;
            await new Promise(r => setTimeout(r, delay));
            attempt += 1;
        }
    }
}

/**
 * Загружает FormData с индикацией прогресса (только браузер).
 * Использует XMLHttpRequest, т.к. fetch не даёт upload-progress.
 *
 * @param url - конечная точка
 * @param formData - FormData (файлы/поля)
 * @param onProgress - колбэк прогресса [0..100]
 * @param opts.method - POST|PUT|PATCH (по умолчанию POST)
 * @param opts.withCredentials - передавать куки (по умолчанию true)
 * @param opts.headers - дополнительные заголовки (кроме Content-Type)
 * @param opts.signal - AbortController.signal для отмены
 *
 * @throws ApiHttpError при статусе не 2xx
 */
export function uploadFormDataWithProgress<T>(
    url: string,
    formData: FormData,
    onProgress?: (percent: number) => void,
    opts?: {
        method?: 'POST' | 'PUT' | 'PATCH';
        withCredentials?: boolean;
        headers?: Record<string, string>;
        signal?: AbortSignal;
    }
): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(opts?.method ?? 'POST', url, true);
        xhr.withCredentials = opts?.withCredentials ?? true;

        // Content-Type для FormData выставляет сам браузер (boundary)
        if (opts?.headers) {
            for (const [k, v] of Object.entries(opts.headers))
                xhr.setRequestHeader(k, v);
        }

        if (xhr.upload && onProgress) {
            xhr.upload.onprogress = ev => {
                if (!ev.lengthComputable) return;
                const pct = Math.round((ev.loaded / ev.total) * 100);
                onProgress(pct);
            };
        }

        if (opts?.signal) {
            const abort = () => {
                xhr.abort();
                reject(
                    new ApiHttpError(499, {
                        message: 'Request aborted',
                        errors: null,
                    })
                );
            };
            if (opts.signal.aborted) return abort();
            opts.signal.addEventListener('abort', abort, { once: true });
        }

        xhr.onreadystatechange = () => {
            if (xhr.readyState !== 4) return;
            const ct = xhr.getResponseHeader('Content-Type') ?? '';
            const isJson = ct.includes('application/json');
            const parse = (): unknown => {
                try {
                    return isJson
                        ? JSON.parse(xhr.responseText)
                        : xhr.responseText;
                } catch {
                    return null;
                }
            };

            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(parse() as T);
            } else {
                const data = parse();
                const payload: ApiErrorPayload = {
                    message:
                        isRecord(data) && typeof data.message === 'string'
                            ? data.message
                            : xhr.statusText || 'Request failed',
                    errors:
                        isRecord(data) && isRecord(data.errors)
                            ? (Object.fromEntries(
                                  Object.entries(data.errors).filter(([, v]) =>
                                      isStringArray(v)
                                  )
                              ) as Record<string, string[]>)
                            : null,
                };
                reject(new ApiHttpError(xhr.status, payload));
            }
        };

        xhr.onerror = () => {
            reject(
                new ApiHttpError(0, { message: 'Network error', errors: null })
            );
        };

        xhr.send(formData);
    });
}
