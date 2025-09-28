import { GOTENBERG_URL, STORAGE_BASE_PATHS } from '@/constants/app';
import { MIME } from '@/constants/mime';
import { GotenbergAdapter } from '@/core/documents/GotenbergAdapter';
import type { SupportedMime } from '@/lib/types/mime';
import type { PdfCombineRequest, PdfCombineResult } from '@/lib/types/pdf';

import { attachmentService } from './AttachmentService';
import { getFileStorageService, FileStorageService } from './FileStorageService';

/**
 * Сервис для объединения PDF документов с приложениями
 * Создает единый PDF из основного документа и всех приложений
 */
export class PDFCombiner {
    private gotenberg: GotenbergAdapter;
    private storage: FileStorageService;

    constructor(
        private readonly attachments: typeof attachmentService,
        gotenbergUrl: string
    ) {
        this.gotenberg = new GotenbergAdapter(gotenbergUrl);
        this.storage = getFileStorageService();
    }
    /**
     * Обеспечивает PDF формат (конвертирует если нужно)
     * @param filePath Путь к файлу
     * @param mimeType MIME тип файла
     * @returns PDF буфер
     */
    private async ensurePdfFormat(
        filePath: string,
        mimeType: SupportedMime
    ): Promise<Buffer> {
        try {
            const fileBuffer = await this.storage.downloadDocument(filePath);

            // Если уже PDF - возвращаем как есть
            if (mimeType === MIME.PDF) {
                return fileBuffer;
            }

            // Если Office документ - конвертируем через Gotenberg
            if (mimeType === MIME.DOCX || mimeType === MIME.DOC) {
                const result = await this.gotenberg.convertToPdf(
                    fileBuffer,
                    mimeType
                );
                return result.buffer;
            }

            // Для остальных типов - предполагаем что уже PDF
            return fileBuffer;
        } catch (error) {
            console.error(
                `Failed to ensure PDF format for ${filePath}:`,
                error
            );
            throw new Error(`Cannot process file: ${filePath}`);
        }
    }

    /**
     * Объединяет PDF через Gotenberg
     * @param pdfBuffers Массив PDF буферов с именами
     * @param outputFileName Имя итогового PDF
     * @returns Объединённый PDF буфер
     */
    private async mergePdfsWithGotenberg(
        pdfBuffers: Array<{ buffer: Buffer; fileName: string }>,
        outputFileName: string
    ): Promise<Buffer | null> {
        try {
            if (pdfBuffers.length === 0 || !pdfBuffers[0]) return null;
            if (pdfBuffers.length === 1) return pdfBuffers[0]!.buffer;

            const result = await this.gotenberg.mergePdfs(
                pdfBuffers,
                outputFileName
            );
            return result.buffer;
        } catch (error) {
            console.error('Gotenberg PDF merge failed:', error);
            return null;
        }
    }

    /**
     * Полный цикл: конвертация + объединение + сохранение
     */
    async combineWithAttachments(
        request: PdfCombineRequest,
        originalDocumentName: string
    ): Promise<PdfCombineResult> {
        try {
            // 1. Конвертация основного документа в PDF
            const mainPdfBuffer = await this.ensurePdfFormat(
                request.mainDocumentPath,
                request.mainDocumentMimeType
            );
            const mainPdfName = this.generatePdfName(request.mainDocumentPath);

            // 2. Конвертация приложений в PDF
            const sortedAttachments = request.attachments.sort(
                (a, b) => a.order - b.order
            );
            const attachmentPdfBuffers: Array<{
                buffer: Buffer;
                fileName: string;
            }> = [];

            for (const attachment of sortedAttachments) {
                try {
                    const pdfBuffer = await this.ensurePdfFormat(
                        attachment.filePath,
                        attachment.mimeType
                    );
                    const pdfName = this.generatePdfName(attachment.filePath);
                    attachmentPdfBuffers.push({
                        buffer: pdfBuffer,
                        fileName: pdfName,
                    });
                } catch (error) {
                    console.warn(
                        `Failed to convert attachment ${attachment.fileName}:`,
                        error
                    );
                }
            }

            // 3. Объединение всех PDF через Gotenberg
            const allPdfs = [
                { buffer: mainPdfBuffer, fileName: `000-${mainPdfName}` },
                ...attachmentPdfBuffers.reverse().map((p, i) => ({
                    buffer: p.buffer,
                    fileName: `${String(i + 1).padStart(3, '0')}-${p.fileName}`,
                })),
            ];

            const outputFileName =
                this.generateCombinedFileName(originalDocumentName);
            const combinedPdf = await this.mergePdfsWithGotenberg(
                allPdfs,
                outputFileName
            );

            if (!combinedPdf) {
                return {
                    success: false,
                    error: 'Failed to merge PDFs with Gotenberg',
                };
            }

            // 4. Сохранение итогового PDF в MinIO
            const result = await this.storage.uploadDocument(
                combinedPdf,
                {
                    originalName: outputFileName,
                    mimeType: MIME.PDF,
                    size: combinedPdf.length,
                },
                { basePath: STORAGE_BASE_PATHS.COMBINED }
            );

            return {
                success: true,
                combinedPdfPath: result.key,
                combinedPdfKey: result.key,
                fileSize: result.size,
                originalName: outputFileName,
            };
        } catch (error) {
            console.error('PDF combination failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Генерирует имя для PDF на основе исходного файла
     * @param filePath Путь к исходному файлу
     * @returns Имя для PDF
     */
    private generatePdfName(filePath: string): string {
        const fileName = filePath.split('/').pop() || new Date().toISOString();
        const baseName = fileName.replace(/\.[^.]+$/, '');
        return `${baseName}.pdf`;
    }

    /**
     * Генерирует имя для объединённого PDF
     * @param originalName Исходное имя документа
     * @returns Имя для итогового PDF
     */
    private generateCombinedFileName(originalName: string): string {
        const baseName = originalName.replace(/\.[^.]+$/, '');
        return `${baseName}-with-attachments.pdf`;
    }
}

// Экспорт экземпляра сервиса
export const pdfCombiner = new PDFCombiner(
    attachmentService,
    process.env.GOTENBERG_URL || GOTENBERG_URL
);