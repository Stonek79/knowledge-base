import type { z } from '@/lib/zod'

import type {
    pdfCombineRequestSchema,
    pdfCombineResultSchema,
} from '../schemas/pdf'

export type PdfCombineRequest = z.infer<typeof pdfCombineRequestSchema>
export type PdfCombineResult = z.infer<typeof pdfCombineResultSchema>
