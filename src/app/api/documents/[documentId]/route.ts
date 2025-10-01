import { NextRequest, NextResponse } from 'next/server';

import { USER_ROLES } from '@/constants/user';
import { getCurrentUser } from '@/lib/actions/users';
import { handleApiError } from '@/lib/api/apiError';
import { updateDocumentSchema } from '@/lib/schemas/document';
import { DocumentCommandService } from '@/lib/services/documents/DocumentCommandService';
import { DocumentQueryService } from '@/lib/services/documents/DocumentQueryService';
import { UserService } from '@/lib/services/UserService';

/**
 * @api {GET} /api/documents/:documentId Получение документа
 * @apiName GetDocument
 * @apiGroup Documents
 * @apiVersion 1.0.0
 *
 * @apiParam {string} documentId Уникальный идентификатор документа
 *
 * @apiSuccess {Object} document Документ с метаданными
 * @apiSuccess {string} document.id ID документа
 * @apiSuccess {string} document.title Заголовок документа
 * @apiSuccess {string} document.description Описание документа
 * @apiSuccess {string} document.fileName Имя файла
 * @apiSuccess {string} document.mimeType MIME тип файла
 * @apiSuccess {number} document.fileSize Размер файла в байтах
 * @apiSuccess {string} document.author.username Имя автора
 * @apiSuccess {Object[]} document.categories Категории документа
 * @apiSuccess {number} document.viewCount Количество просмотров
 * @apiSuccess {Date} document.createdAt Дата создания
 *
 * @apiError {Object} 401 Unauthorized - Пользователь не авторизован
 * @apiError {Object} 403 Forbidden - Доступ запрещен (GUEST к неопубликованному)
 * @apiError {Object} 404 Not Found - Документ не найден
 *
 * @apiDescription
 * Получает документ по ID с увеличением счетчика просмотров.
 * GUEST пользователи могут видеть только опубликованные документы.
 *
 * @apiExample {curl} Получение документа:
 *     curl -H "Authorization: Bearer {token}"
 *          "http://localhost:3000/api/documents/{documentId}"
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { documentId: string } }
) {
    const { documentId } = await params;

    try {
        const user = await getCurrentUser(request);

        if (!user) {
            return NextResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const document = await DocumentQueryService.getDocumentById(
            documentId,
            user
        );

        if (!document) {
            return NextResponse.json(
                { message: 'Документ не найден' },
                { status: 404 }
            );
        }

        return NextResponse.json({ document });
    } catch (error) {
        return handleApiError(error);
    }
}

/**
 * @api {PUT} /api/documents/:documentId Обновление документа
 * @apiName UpdateDocument
 * @apiGroup Documents
 * @apiVersion 1.0.0
 *
 * @apiParam {string} documentId Уникальный идентификатор документа
 * @apiBody {Object} body Данные для обновления
 * @apiBody {string} [body.title] Новый заголовок документа
 * @apiBody {string} [body.description] Новое описание документа
 * @apiBody {string} [body.keywords] Ключевые слова (через запятую)
 * @apiBody {string[]} [body.categoryIds] ID категорий документа
 *
 * @apiSuccess {Object} document Обновленный документ
 * @apiSuccess {string} message Сообщение об успешном обновлении
 *
 * @apiError {Object} 400 Bad Request - Неверные данные валидации
 * @apiError {Object} 401 Unauthorized - Пользователь не авторизован
 * @apiError {Object} 403 Forbidden - Нет прав на редактирование
 * @apiError {Object} 404 Not Found - Документ не найден
 *
 * @apiDescription
 * Обновляет метаданные документа. USER может редактировать только свои документы.
 * ADMIN может редактировать любые документы. После обновления документ переиндексируется.
 *
 * @apiExample {curl} Обновление документа:
 *     curl -X PUT -H "Authorization: Bearer {token}"
 *          -H "Content-Type: application/json"
 *          -d '{"title":"Новый заголовок","keywords":"новое, ключевое, слово"}'
 *          "http://localhost:3000/api/documents/{documentId}"
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: { documentId: string } }
) {
    const { documentId } = await params;

    try {
        const user = await getCurrentUser(request);
        if (!user || user.role === USER_ROLES.GUEST) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const validation = updateDocumentSchema.safeParse(body);
        if (!validation.success) {
            return handleApiError(validation.error);
        }

        let authorId: string | undefined = undefined;

        if (validation.data.authorId) {
            authorId = validation.data.authorId;
        } else if (validation.data.username) {
            const author = await UserService.findOrCreateAuthor(
                validation.data.username
            );
            authorId = author.id;
        }

        const updatedDocument = await DocumentCommandService.updateDocument(
            documentId,
            validation.data,
            user,
            authorId
        );

        return NextResponse.json({
            message: 'Документ успешно обновлен',
            document: updatedDocument,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

/**
 * @api {DELETE} /api/documents/:documentId Удаление документа
 * @apiName DeleteDocument
 * @apiGroup Documents
 * @apiVersion 1.0.0
 *
 * @apiParam {string} documentId Уникальный идентификатор документа
 *
 * @apiSuccess {Object} message Сообщение об успешном удалении
 *
 * @apiError {Object} 401 Unauthorized - Пользователь не авторизован
 * @apiError {Object} 403 Forbidden - Только ADMIN может удалять документы
 * @apiError {Object} 404 Not Found - Документ не найден
 *
 * @apiDescription
 * Полностью удаляет документ и все связанные файлы. Процесс выполняется в транзакции:
 * 1) Собираются ключи всех файлов (оригинал + конвертированные версии)
 * 2) Атомарно удаляются записи из БД
 * 3) Удаляются файлы из MinIO/локального хранилища
 * 4) Удаляется из поискового индекса
 *
 * @apiExample {curl} Удаление документа:
 *     curl -X DELETE -H "Authorization: Bearer {token}"
 *          "http://localhost:3000/api/documents/{documentId}"
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: { documentId: string } }
) {
    const { documentId } = await params;

    try {
        const user = await getCurrentUser(request);
        if (!user || user.role !== USER_ROLES.ADMIN) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        await DocumentCommandService.deleteDocument(documentId, user);

        return NextResponse.json({
            message: 'Документ успешно удален',
        });
    } catch (error) {
        return handleApiError(error);
    }
}
