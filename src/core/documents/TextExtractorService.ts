import { GOTENBERG_URL } from '@/constants/app'
import { MIME } from '@/constants/mime'
import type { SupportedMime } from '@/lib/types/mime'
import { DocxProcessor } from '@/utils/docx'
import { PdfProcessor } from '@/utils/pdf'

import { GotenbergAdapter } from './GotenbergAdapter'

/**
 * Сервис для инкапсуляции логики извлечения текста из различных форматов файлов.
 * Использует специализированные процессоры для каждого типа и Gotenberg для конвертации.
 */
export class TextExtractorService {
    private gotenberg: GotenbergAdapter

    constructor() {
        // Инициализируем адаптер для Gotenberg
        const gotenbergUrl = process.env.GOTENBERG_URL || GOTENBERG_URL
        this.gotenberg = new GotenbergAdapter(gotenbergUrl)
    }

    /**
     * Извлекает текст из буфера файла на основе его MIME-типа.
     * @param buffer - Буфер файла.
     * @param mimeType - MIME-тип файла.
     * @returns Извлеченный текст или пустую строку в случае неудачи.
     */
    async extractText(
        buffer: Buffer,
        mimeType: SupportedMime
    ): Promise<string> {
        try {
            // Для DOCX используем Mammoth
            if (mimeType === MIME.DOCX) {
                return (await DocxProcessor.extractText(buffer))?.trim() || ''
            }

            // Для PDF используем pdfjs-dist
            if (mimeType === MIME.PDF) {
                return (await PdfProcessor.extractText(buffer))?.trim() || ''
            }

            // Для других поддерживаемых типов (например, DOC) пробуем конвертировать в PDF и затем     извлечь текст
            const pdfConversionResult = await this.gotenberg.convertToPdf(
                buffer,
                mimeType
            )
            if (pdfConversionResult.buffer) {
                return (
                    (
                        await PdfProcessor.extractText(
                            pdfConversionResult.buffer
                        )
                    )?.trim() || ''
                )
            }
        } catch (error) {
            console.error(
                `[TextExtractorService] Failed to extract text for mime type ${mimeType}:`,
                error
            )
        }
        // Возвращаем пустую строку, если извлечение не удалось
        return ''
    }
}

// Экспортируем синглтон для удобного использования в других частях приложения
export const textExtractorService = new TextExtractorService()
