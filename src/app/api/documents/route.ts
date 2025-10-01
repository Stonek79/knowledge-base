
import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/actions/users';
import { ApiError, handleApiError } from '@/lib/api/apiError';
import { documentListSchema, uploadFormSchema } from '@/lib/schemas/document';
import { UserService } from '@/lib/services/UserService';
import { DocumentCommandService } from '@/lib/services/documents/DocumentCommandService';
import { DocumentQueryService } from '@/lib/services/documents/DocumentQueryService';

/**
 * Получает список документов с пагинацией, фильтрацией и поиском
 * @param request - Next.js request объект
 * @returns Список документов с метаданными пагинации
 *
 * Поддерживаемые query параметры:
 * - page: номер страницы (по умолчанию 1)
 * - limit: количество документов на странице (по умолчанию 10)
 * - categoryIds: ID категорий через запятую
 * - sortBy: поле для сортировки (по умолчанию createdAt)
 * - sortOrder: порядок сортировки asc/desc (по умолчанию desc)
 * - q: поисковый запрос по title и content
 * - authorId: ID автора документа
 *
 * Авторизация: требуется аутентификация
 * Гости видят только опубликованные документы
 */
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser(request);

        if (!user) {
            return NextResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);

        const validation = documentListSchema.safeParse({
            page: parseInt(searchParams.get('page') || '1'),
            limit: parseInt(searchParams.get('limit') || '10'),
            categoryIds: searchParams.get('categoryIds')?.split(','),
            sortBy: searchParams.get('sortBy') || 'createdAt',
            sortOrder: searchParams.get('sortOrder') || 'desc',
            authorId: searchParams.get('authorId') || '',
            q: searchParams.get('q') || '',
            dateFrom: searchParams.get('dateFrom') || '',
            dateTo: searchParams.get('dateTo') || '',
        });

        if (!validation.success) {
            return handleApiError(validation.error);
        }

        const result = await DocumentQueryService.searchDocuments(
            validation?.data,
            user
        );
        return NextResponse.json(result);
    } catch (error) {
        return handleApiError(error);
    }
}

/**
 * Загружает и обрабатывает новый документ
 * @param request - Next.js request объект с FormData
 * @returns Созданный документ с метаданными
 *
 * FormData поля:
 * - file: файл документа (DOCX, DOC, PDF)
 * - authorId: ID автора документа
 * - title: название документа
 * - description: описание документа
 * - categoryIds: JSON массив ID категорий
 * - keywords: ключевые слова через запятую
 *
 * Авторизация: требуется роль выше GUEST
 * Валидация: размер файла, MIME тип, дубликаты
 * Обработка: конвертация в PDF, извлечение текста, индексация
 */
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser(request);
        if (!user) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const formData = await request.formData();

        const rawData = Object.fromEntries(formData.entries());
        if (typeof rawData.categoryIds === 'string') {
            rawData.categoryIds = JSON.parse(rawData.categoryIds);
        }

        const validation = uploadFormSchema.safeParse(rawData);

        if (!validation.success) {
            return handleApiError(validation.error);
        }

        let authorId: string;
        if (validation.data.authorId) {
            authorId = validation.data.authorId;
        } else if (validation.data.username) {
            const author = await UserService.findOrCreateAuthor(
                validation.data.username
            );
            authorId = author.id;
        } else {
            authorId = user.id;
        }

        const documentData = {
            ...validation.data,
            file: formData.get('file') as File,
            creatorId: user.id, // Текущий юзер - это создатель
            authorId: authorId, // Автор - тот, кого нашли или создали
        };

        const document = await DocumentCommandService.createDocument(
            documentData,
            user
        );

        return NextResponse.json(
            {
                message: 'Документ успешно создан',
                document,
            },
            { status: 201 }
        );
    } catch (error) {
        return handleApiError(error);
    }
}
