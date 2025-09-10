// import { type PDFDocumentProxy, getDocument } from 'pdfjs-dist';
// import 'pdfjs-dist/build/pdf.worker.mjs';
import type { TextContent, TextItem } from 'pdfjs-dist/types/src/display/api';

function isTextItem(item: TextContent['items'][number]): item is TextItem {
    return typeof (item as { str?: unknown }).str === 'string';
}

/**
 * Извлекает плоский текст из PDF для индексации.
 * Основано на pdfjs-dist (getTextContent). Не выполняет OCR.
 * Подходит для документов с текстовым слоем.
 */
export class PdfProcessor {
    /**
     * Извлечение текста из PDF:
     * - обходит все страницы;
     * - собирает текстовые фрагменты (TextItem.str);
     * - склеивает строки.
     *
     * @param buffer Буфер PDF-файла
     * @returns Плоский текст, склеенный по страницам
     */
    static async extractText(buffer: Buffer): Promise<string> {
        // const loadingTask = getDocument({ data: buffer });
        const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');

        const loadingTask = getDocument({ data: buffer });
        type PDFDocumentProxy = Awaited<typeof loadingTask.promise>;

        const doc: PDFDocumentProxy = await loadingTask.promise;
        const numPages = doc.numPages;
        const parts: string[] = [];

        for (let pageNum = 1; pageNum <= numPages; pageNum += 1) {
            const page = await doc.getPage(pageNum);
            const content = await page.getTextContent();
            const text = content.items
                .filter(isTextItem)
                .map(item => item.str)
                .join(' ');
            if (text.trim().length > 0) parts.push(text);
        }

        return parts.join('\n');
    }
}
