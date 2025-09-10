import { z } from 'zod';

import {
    attachmentMetadataSchema,
    attachmentUploadSchema,
    baseAttachmentSchema,
} from '../schemas/attachment';

export type BaseAttachment = z.infer<typeof baseAttachmentSchema>;
export type AttachmentMetadata = z.infer<typeof attachmentMetadataSchema>;
export type AttachmentUploadResult = z.infer<typeof attachmentUploadSchema>;
