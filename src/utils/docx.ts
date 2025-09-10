import mammoth from 'mammoth';

export class DocxProcessor {
    static async extractText(buffer: Buffer): Promise<string> {
        try {
            const result = await mammoth.extractRawText({ buffer });
            return result.value;
        } catch (error) {
            console.error(error);
            throw new Error('Ошибка при извлечении текста из DOCX файла');
        }
    }
}
