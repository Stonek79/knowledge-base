import { SupportedMime } from '@/lib/types/mime';

export interface ConversionResult {
    buffer: Buffer;
    mimeType: SupportedMime;
    fileName?: string;
}

export interface ConversionService {
    convertToPdf(
        input: Buffer,
        sourceMime: SupportedMime
    ): Promise<ConversionResult>;
    convertToDocx?(
        input: Buffer,
        sourceMime: SupportedMime
    ): Promise<ConversionResult>;
    mergePdfs?(
        pdfBuffers: Array<{ buffer: Buffer; fileName: string }>,
        outputFileName: string
    ): Promise<ConversionResult>;
}
