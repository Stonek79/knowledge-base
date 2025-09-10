import { z } from 'zod';

import {
    pdfCombineRequestSchema,
    pdfCombineResultSchema,
} from '../schemas/pdf';

export type PdfCombineRequest = z.infer<typeof pdfCombineRequestSchema>;
export type PdfCombineResult = z.infer<typeof pdfCombineResultSchema>;
