import { NextRequest, NextResponse } from 'next/server';

import { STORAGE_BASE_PATHS } from '@/constants/app';
import { getCurrentUser } from '@/lib/actions/users';
import { handleApiError } from '@/lib/api/apiError';
import { getFileStorageService } from '@/lib/services/FileStorageService';
import { settingsService } from '@/lib/services/SettingsService';
import type { SupportedMime } from '@/lib/types/mime';
import { isSupportedMime } from '@/utils/mime';

/**
 * @swagger
 * /documents/attachments/stage:
 *   post:
 *     summary: Stage a file for attachment
 *     tags: [Attachments]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: {
 *                 type: string,
 *                 format: binary
 *               }
 *     responses:
 *       200:
 *         description: File staged successfully, returns a temporary key
 *       400:
 *         description: Missing file
 *       401:
 *         description: Unauthorized
 *       413:
 *         description: File too large
 *       415:
 *         description: Unsupported file type
 */
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser(request);
        if (!user)
            return NextResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            );

        const form = await request.formData();
        const file = form.get('file') as File;
        if (!file)
            return NextResponse.json(
                { message: 'Missing file' },
                { status: 400 }
            );

        const [maxFileSize, allowedMimeTypes] = await Promise.all([
            settingsService.getMaxFileSize(),
            settingsService.getAllowedMimeTypes(),
        ]);

        if (file.size > maxFileSize || !allowedMimeTypes.includes(file.type)) {
            return NextResponse.json(
                { message: 'Unsupported file' },
                { status: 415 }
            );
        }

        if (!isSupportedMime(file.type)) {
            return NextResponse.json(
                { message: 'Unsupported file type' },
                { status: 415 }
            );
        }
        const mime: SupportedMime = file.type;

        const buffer = Buffer.from(await file.arrayBuffer());
        const upload = await getFileStorageService().uploadDocument(
            buffer,
            {
                originalName: file.name,
                mimeType: mime,
                size: buffer.byteLength,
            },
            { basePath: STORAGE_BASE_PATHS.TEMP }
        );

        return NextResponse.json({
            tempKey: upload.key,
            originalName: file.name,
            mimeType: file.type,
            size: buffer.byteLength,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
