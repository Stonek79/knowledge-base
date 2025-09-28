import { STORAGE_BASE_PATHS } from '@/constants/app';
import { MIME } from '@/constants/mime';
import { FileStorageService, getFileStorageService } from '@/lib/services/FileStorageService';
import type { SupportedMime } from '@/lib/types/mime';
import { FileUtils } from '@/utils/files';
import { isSupportedMime } from '@/utils/mime';

import { ConversionService } from './ConversionService';
import { textExtractorService } from './TextExtractorService';

export interface ProcessResult {
    original: { path: string; mimeType: SupportedMime; fileName: string };
    derivativePdf?: { path: string };
    extractedText?: string;
    storage?: { originalKey: string; pdfKey?: string };
    attachments?: Array<{
        path: string;
        fileName: string;
        mimeType: SupportedMime;
    }>;
}

/**
 * Оркестратор загрузки документа:
 * - сохраняет оригинал,
 * - пытается получить PDF-дериват,
 * - извлекает текст (DOCX → Mammoth; PDF → ocr; DOC → конвертация).
 * Ошибки конвертации/извлечения логируются; документ создаётся всегда.
 */
export class DocumentProcessor {
    private storage: FileStorageService;

    constructor(
        private readonly conversion: ConversionService,
    ) {
        this.storage = getFileStorageService();
    }

    /**
     * Полный цикл обработки одного файла.
     * @param input Буфер файла
     * @param mimeType MIME исходного файла
     * @param originalName Оригинальное имя файла
     * @param options Опции обработки
     * @param options.enableOcr Включить OCR для PDF
     * @returns Пути к оригиналу/деривату и извлечённый текст (если удалось)
     */
    async processUpload(
        input: Buffer,
        mimeType: SupportedMime,
        originalName: string,
        options?: { enableOcr?: boolean }
    ): Promise<ProcessResult> {
        // 1) Сохраняем оригинал
        const safeName = FileUtils.generateSafeFileName(originalName);

        let originalKey: string | undefined;
        if (this.storage) {
            try {
                const { key } = await this.storage.uploadDocument(
                    input,
                    { originalName: safeName, mimeType, size: input.length },
                    { basePath: STORAGE_BASE_PATHS.ORIGINAL }
                );
                originalKey = key;
            } catch (e) {
                console.warn(
                    'Original file upload failed:',
                    e instanceof Error ? e.message : e
                );
            }
        }

        if (!originalKey) {
            throw new Error('Original file upload failed');
        }

        // 2) Пытаемся получить PDF-дериват
        let pdfBuffer: Buffer | null = null;
        if (mimeType === MIME.PDF) {
            pdfBuffer = input;
        } else {
            try {
                const pdfRes = await this.conversion.convertToPdf(
                    input,
                    mimeType
                );
                pdfBuffer = pdfRes.buffer;
            } catch (e) {
                console.warn(
                    'PDF conversion failed:',
                    e instanceof Error ? e.message : e
                );
            }
        }

        let pdfKey: string | undefined;
        if (pdfBuffer && mimeType !== MIME.PDF) {
            const pdfName = safeName.replace(/\.[^.]+$/, '.pdf');
            try {
                const res = await this.storage.uploadDocument(
                    pdfBuffer,
                    {
                        originalName: pdfName,
                        mimeType: MIME.PDF,
                        size: pdfBuffer.length,
                    },
                    { basePath: STORAGE_BASE_PATHS.CONVERTED }
                );
                pdfKey = res.key;
            } catch (e) {
                console.warn(
                    'PDF upload failed:',
                    e instanceof Error ? e.message : e
                );
            }
        }

        // 3) Извлекаем текст с помощью нового сервиса
        let extractedText = await textExtractorService.extractText(
            input,
            mimeType
        );

        // OCR-хук: если текста нет и включен OCR — постановка в очередь/лог
        if (!extractedText && options?.enableOcr && pdfBuffer) {
            // TODO: Реализовать OCR очередь:
            // 1. Добавить в Redis очередь OCR задач
            // 2. Воркер обрабатывает очередь через Tesseract.js
            // 3. Результат сохраняется в БД и переиндексируется
            console.info('OCR requested for PDF without text layer', {
                originalName,
            });
        }

        // Нормализация и ограничение размера извлечённого текста
        if (extractedText) {
            extractedText = extractedText
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 100_000);
        }

        return {
            original: { path: originalKey, mimeType, fileName: originalName },
            derivativePdf: pdfKey ? { path: pdfKey } : undefined,
            extractedText,
            storage: { originalKey, pdfKey },
        };
    }

    /**
     * Обрабатывает загрузку документа с приложениями
     * @param mainFile Основной файл
     * @param attachments Приложения к документу
     * @param options Опции обработки
     */
    async processUploadWithAttachments(
        mainFile: { buffer: Buffer; mimeType: SupportedMime; fileName: string },
        attachments: Array<{
            buffer: Buffer;
            mimeType: SupportedMime;
            fileName: string;
        }> = [],
        options?: { enableOcr?: boolean }
    ): Promise<ProcessResult> {
        // 1. Обрабатываем основной файл
        const mainResult = await this.processUpload(
            mainFile.buffer,
            mainFile.mimeType,
            mainFile.fileName,
            options
        );

        // 2. Обрабатываем приложения
        const attachmentResults: ProcessResult['attachments'] = [];

        const tasks = attachments.map(async att => {
            if (!isSupportedMime(att.mimeType)) return;
            const result = await this.processUpload(
                att.buffer,
                att.mimeType,
                att.fileName,
                options
            );
            attachmentResults.push({
                path: result.original.path,
                fileName: result.original.fileName,
                mimeType: result.original.mimeType,
            });
        });
        await Promise.allSettled(tasks);

        return {
            ...mainResult,
            attachments: attachmentResults,
        };
    }
}