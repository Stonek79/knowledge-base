export class DocProcessor {
    static async extractText(_buffer: Buffer): Promise<string> {
        // Извлечение для .doc происходит через конвертацию (ConversionService):
        // DOC → PDF/DOCX → затем PdfProcessor/Mammoth. Здесь прямого извлечения нет.
        throw new Error('DOC conversion is not available');
    }
}
