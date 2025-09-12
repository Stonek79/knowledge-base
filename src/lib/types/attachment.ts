import { z } from 'zod';

import {
    attachmentMetadataSchema,
    attachmentUploadSchema,
    baseAttachmentSchema,
    createAttachmentSchema,
} from '../schemas/attachment';

export type BaseAttachment = z.infer<typeof baseAttachmentSchema>;
export type AttachmentMetadata = z.infer<typeof attachmentMetadataSchema>;
export type AttachmentUploadResult = z.infer<typeof attachmentUploadSchema>;
export type CreateAttachmentData = z.infer<typeof createAttachmentSchema>;