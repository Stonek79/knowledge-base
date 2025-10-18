import type { z } from 'zod'

import type {
    pdfCombineRequestSchema,
    pdfCombineResultSchema,
} from '../schemas/pdf'

export type PdfCombineRequest = z.infer<typeof pdfCombineRequestSchema>
export type PdfCombineResult = z.infer<typeof pdfCombineResultSchema>
