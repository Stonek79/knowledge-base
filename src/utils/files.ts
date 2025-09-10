import { createHash, randomUUID } from 'crypto';
import { access, mkdir, readFile, stat, unlink, writeFile } from 'fs/promises';
import { extname, join } from 'path';

import { MAGIC_SIGNATURES, MIME } from '@/constants/mime';
import { SupportedMime } from '@/lib/types/mime';

export class FileUtils {
    static async validateDocxFile(
        file: File
    ): Promise<{ valid: boolean; error?: string }> {
        // Проверка MIME типа
        if (file.type !== MIME.DOCX) {
            return { valid: false, error: 'Поддерживаются только DOCX файлы' };
        }

        // Проверка размера (2MB)
        if (file.size > 2 * 1024 * 1024) {
            return {
                valid: false,
                error: 'Размер файла не должен превышать 2MB',
            };
        }

        return { valid: true };
    }

    static async generateFileHash(buffer: Buffer): Promise<string> {
        const hash = createHash('sha256');
        hash.update(buffer);
        return hash.digest('hex');
    }

    static async saveFile(
        buffer: Buffer,
        fileName: string,
        subdir: 'original' | 'pdf' = 'original'
    ): Promise<string> {
        const storageDir = join(process.cwd(), 'storage', subdir);
        await mkdir(storageDir, { recursive: true });
        const filePath = join(storageDir, fileName);
        await writeFile(filePath, buffer);
        return filePath;
    }

    // новая сигнатурная проверка
    static async validateFile(
        buffer: Buffer,
        mimeType: SupportedMime
    ): Promise<{ valid: boolean; error?: string }> {
        const headerHex = buffer.subarray(0, 8).toString('hex');
        const isZip = headerHex.startsWith(
            MAGIC_SIGNATURES.ZIP_PDF_DOC_CF.ZIP_PREFIX_HEX
        );
        const isPdf =
            buffer.subarray(0, 4).toString() ===
            MAGIC_SIGNATURES.ZIP_PDF_DOC_CF.PDF_PREFIX_STR;
        const isDoc = headerHex.startsWith(
            MAGIC_SIGNATURES.ZIP_PDF_DOC_CF.DOC_PREFIX_HEX
        );

        const allowed =
            (mimeType === MIME.DOCX && isZip) ||
            (mimeType === MIME.PDF && isPdf) ||
            (mimeType === MIME.DOC && isDoc);

        if (!allowed)
            return { valid: false, error: 'Неподдерживаемый формат файла' };
        return { valid: true };
    }

    // безопасное имя файла (UUID + расширение)
    static generateSafeFileName(originalName: string): string {
        const ext = extname(originalName || '').toLowerCase() || '.bin';
        return `${randomUUID()}${ext}`;
    }

    /**
     * Проверяет существование файла
     */
    static async fileExists(filePath: string): Promise<boolean> {
        try {
            await access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Читает файл и возвращает Buffer
     */
    static async readFile(filePath: string): Promise<Buffer> {
        return readFile(filePath);
    }

    /**
     * Получает размер файла в байтах
     */
    static async getFileSize(filePath: string): Promise<number> {
        const stats = await stat(filePath);
        return stats.size;
    }

    /**
     * Удаляет файл
     */
    static async deleteFile(filePath: string): Promise<void> {
        await unlink(filePath);
    }
}
