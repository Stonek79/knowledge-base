// Типы скопированы из библиотеки pdfjs-dist для ускорения и простоты, подумать над другим решением для более правильного подхода

/**
 * Page text content part.
 */
export type TextItem = {
    /**
     * - Text content.
     */
    str: string
    /**
     * - Text direction: 'ttb', 'ltr' or 'rtl'.
     */
    dir: string
    /**
     * - Transformation matrix.
     */
    transform: number[]
    /**
     * - Width in device space.
     */
    width: number
    /**
     * - Height in device space.
     */
    height: number
    /**
     * - Font name used by PDF.js for converted font.
     */
    fontName: string
    /**
     * - Indicating if the text content is followed by a
     * line-break.
     */
    hasEOL: boolean
}
/**
 * Page text marked content part.
 */
export type TextMarkedContent = {
    /**
     * - Either 'beginMarkedContent',
     * 'beginMarkedContentProps', or 'endMarkedContent'.
     */
    type: string
    /**
     * - The marked content identifier. Only used for type
     * 'beginMarkedContentProps'.
     */
    id: string
}
/**
 * Text style.
 */
export type TextStyle = {
    /**
     * - Font ascent.
     */
    ascent: number
    /**
     * - Font descent.
     */
    descent: number
    /**
     * - Whether or not the text is in vertical mode.
     */
    vertical: boolean
    /**
     * - The possible font family.
     */
    fontFamily: string
}
/**
 * Page text content.
 */
export type TextContent = {
    /**
     * - Array of
     * {@link TextItem } and {@link TextMarkedContent } objects. TextMarkedContent
     * items are included when includeMarkedContent is true.
     */
    items: Array<TextItem | TextMarkedContent>
    /**
     * - {@link TextStyle } objects,
     * indexed by font name.
     */
    styles: {
        [x: string]: TextStyle
    }
}

function isTextItem(item: TextContent['items'][number]): item is TextItem {
    return typeof (item as { str?: unknown }).str === 'string'
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
        const pdfjsDistPath = 'pdfjs-dist/build/pdf.js'
        const { getDocument } = await import(pdfjsDistPath)

        const loadingTask = getDocument({ data: buffer })
        type PDFDocumentProxy = Awaited<typeof loadingTask.promise>

        const doc: PDFDocumentProxy = await loadingTask.promise
        const numPages = doc.numPages
        const parts: string[] = []

        for (let pageNum = 1; pageNum <= numPages; pageNum += 1) {
            const page = await doc.getPage(pageNum)
            const content = await page.getTextContent()
            const text = content.items
                .filter(isTextItem)
                .map(item => item.str)
                .join(' ')
            if (text.trim().length > 0) parts.push(text)
        }

        return parts.join('\n')
    }
}
