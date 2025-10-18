import axios from 'axios'
import FormData from 'form-data'

import { GOTENBERG_ENDPOINTS } from '@/constants/app'
import { MIME } from '@/constants/mime'
import type { SupportedMime } from '@/lib/types/mime'

import type { ConversionResult, ConversionService } from './ConversionService'

async function postMultipart(
    url: string,
    formData: FormData
): Promise<ArrayBuffer> {
    const res = await axios.post(url, formData, {
        responseType: 'arraybuffer',
        headers: {
            ...formData.getHeaders(),
        },
        timeout: 15000,
    })

    if (res.status !== 200) {
        throw new Error(`Gotenberg error: ${res.status} ${res.statusText}`)
    }

    return res.data
}

/**
 * Адаптер конвертации через Gotenberg (LibreOffice/Chromium).
 * Поддерживает DOC/DOCX/PDF → PDF и DOC → DOCX.
 * Взаимодействие по HTTP multipart.
 */
export class GotenbergAdapter implements ConversionService {
    private readonly baseUrl: string
    private metrics = {
        totalConversions: 0,
        successfulConversions: 0,
        failedConversions: 0,
        averageResponseTime: 0,
    }

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl.replace(/\/$/, '')
    }

    /**
     * Конвертация входного буфера в PDF.
     * DOC/DOCX идут через /forms/libreoffice/convert, PDF — через /forms/chromium/convert/document.
     * @param input Исходный буфер
     * @param sourceMime MIME исходного файла
     * @returns PDF-буфер и метаданные
     */
    async convertToPdf(
        input: Buffer,
        sourceMime: SupportedMime
    ): Promise<ConversionResult> {
        // DOCX/DOC/PDF → PDF (PDF passthrough для совместимости)
        const startTime = Date.now()
        this.metrics.totalConversions++

        try {
            const endpoint = this.resolveEndpointToPdf(sourceMime)
            const fd = new FormData()
            const fileName = this.suggestName(sourceMime)
            fd.append('files', input, fileName)

            const arr = await postMultipart(`${this.baseUrl}${endpoint}`, fd)

            this.metrics.successfulConversions++
            const endTime = Date.now()

            const conversionTime = endTime - startTime
            this.updateAverageTime(conversionTime)

            return {
                buffer: Buffer.from(arr),
                mimeType: MIME.PDF,
                fileName: fileName.replace(/\.[^.]+$/, '.pdf'),
            }
        } catch (e) {
            this.metrics.failedConversions++
            console.error('Gotenberg conversion error:', e)
            throw e
        }
    }

    /**
     * Конвертация DOC → DOCX (LibreOffice route).
     * @param input Исходный буфер
     * @param sourceMime MIME исходного файла (ожидается application/msword)
     * @returns DOCX-буфер и метаданные
     */
    async convertToDocx(
        input: Buffer,
        sourceMime: SupportedMime
    ): Promise<ConversionResult> {
        // DOC → DOCX (LibreOffice route)
        const endpoint = GOTENBERG_ENDPOINTS.libreofficeConvert
        const fd = new FormData()
        const fileName = this.suggestName(sourceMime)
        fd.append('files', input, fileName)
        fd.append('convertTo', 'docx')

        const arr = await postMultipart(`${this.baseUrl}${endpoint}`, fd)

        if (sourceMime === MIME.PDF) {
            return { buffer: input, mimeType: MIME.PDF, fileName: 'file.pdf' }
        }

        return {
            buffer: Buffer.from(arr),
            mimeType: MIME.DOCX,
            fileName: fileName.replace(/\.[^.]+$/, '.docx'),
        }
    }

    /**
     * Объединяет несколько PDF в один через Gotenberg
     * @param pdfBuffers Массив PDF буферов с именами
     * @param outputFileName Имя итогового PDF файла
     * @returns Объединённый PDF буфер
     */
    async mergePdfs(
        pdfBuffers: Array<{ buffer: Buffer; fileName: string }>,
        outputFileName: string
    ): Promise<ConversionResult> {
        if (pdfBuffers.length === 0 || !pdfBuffers[0]) {
            throw new Error('No PDFs to merge')
        }

        if (pdfBuffers.length === 1) {
            return {
                buffer: pdfBuffers[0].buffer,
                mimeType: MIME.PDF,
                fileName: outputFileName,
            }
        }

        const fd = new FormData()

        // Добавляем все PDF файлы с их именами
        pdfBuffers.forEach(({ buffer, fileName }) => {
            fd.append('files', buffer, fileName)
        })

        // Отправляем на объединение
        const arr = await postMultipart(
            `${this.baseUrl}${GOTENBERG_ENDPOINTS.pdfMerge}`,
            fd
        )

        return {
            buffer: Buffer.from(arr),
            mimeType: MIME.PDF,
            fileName: outputFileName,
        }
    }

    private resolveEndpointToPdf(mime: SupportedMime): string {
        // DOCX/DOC → /forms/libreoffice/convert (convertTo=pdf)
        // PDF → можно использовать passthrough chrome/pdf или оставить libreoffice (оба работают)
        switch (mime) {
            case MIME.PDF:
                return GOTENBERG_ENDPOINTS.chromiumDocument
            case MIME.DOC:
            case MIME.DOCX:
                // Для офисных документов используем LibreOffice
                return GOTENBERG_ENDPOINTS.libreofficeConvert
            default:
                // Ошибка типа меме
                throw new Error(
                    `Unsupported MIME type for PDF conversion: ${mime}`
                )
        }
    }

    private suggestName(mime: SupportedMime): string {
        if (mime === MIME.PDF) return 'file.pdf'
        if (mime === MIME.DOC) return 'file.doc'
        return 'file.docx'
    }

    private updateAverageTime(responseTime: number): void {
        const { totalConversions, averageResponseTime } = this.metrics
        this.metrics.averageResponseTime =
            (averageResponseTime * (totalConversions - 1) + responseTime) /
            totalConversions
    }

    getMetrics() {
        return { ...this.metrics }
    }
}
