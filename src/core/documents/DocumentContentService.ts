import { prisma } from '@/lib/prisma';
import { getFileStorageService } from '@/lib/services/FileStorageService';
import { SupportedMime } from '@/lib/types/mime';
import { isSupportedMime } from '@/utils/mime';

import { textExtractorService } from './TextExtractorService';

/**
 * Сервис для управления контентом документа.
 * Отвечает за полное переизвлечение текста из основного файла и всех его вложений.
 */
class DocumentContentService {
    /**
     * Обновляет текстовое содержимое документа, извлекая его из всех связанных файлов.
     * @param documentId - ID документа для обновления.
     */
    async updateContent(documentId: string): Promise<void> {
        console.log(
            `[DocumentContentService] Starting content update for document ${documentId}`
        );
        // 1. Получаем документ и его вложения из БД
        const document = await prisma.document.findUnique({
            where: { id: documentId },
            include: {
                attachments: true,
            },
        });

        if (!document || !document.filePath) {
            throw new Error(
                `Document or its filePath not found for document ID: ${documentId}`
            );
        }

        // 2. Собираем информацию о всех файлах для обработки
        const filesToProcess: { key: string; mime: SupportedMime }[] = [];

        // Добавляем основной файл, если его тип поддерживается
        if (isSupportedMime(document.mimeType)) {
            filesToProcess.push({
                key: document.filePath,
                mime: document.mimeType,
            });
        }

        // Добавляем вложения, если их тип поддерживается
        for (const attachment of document.attachments) {
            if (attachment.filePath && isSupportedMime(attachment.mimeType)) {
                filesToProcess.push({
                    key: attachment.filePath,
                    mime: attachment.mimeType,
                });
            }
        }
        if (filesToProcess.length === 0) {
            console.log(`[DocumentContentService] No processable files found for document ${documentId}
       . Skipping.`);
            // Обновим контент на пустую строку, если обрабатываемых файлов нет
            await prisma.document.update({
                where: { id: documentId },
                data: { content: '' },
            });
            return;
        }

        // 3. Параллельно скачиваем все файлы
        const fileBuffers = await Promise.all(
            filesToProcess.map(file =>
                getFileStorageService().downloadDocument(file.key)
            )
        );

        // 4. Параллельно извлекаем текст из каждого файла
        const extractedTexts = await Promise.all(
            fileBuffers.map((buffer, index) =>
                textExtractorService.extractText(
                    buffer,
                    filesToProcess[index]!.mime
                )
            )
        );

        // 5. Объединяем весь извлеченный текст и обновляем документ в БД
        const combinedText = extractedTexts
            .filter(Boolean)
            .join('\n\n')
            .trim();

        await prisma.document.update({
            where: { id: documentId },
            data: { content: combinedText },
        });

        console.log(
            `[DocumentContentService] Successfully updated content for document ${documentId}`
        );
    }
}
export const documentContentService = new DocumentContentService();