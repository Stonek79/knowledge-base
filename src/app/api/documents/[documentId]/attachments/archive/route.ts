import { isAbsolute } from 'path';

import archiver from 'archiver';
import { NextRequest, NextResponse } from 'next/server';

import { USER_ROLES } from '@/constants/user';
import { getCurrentUser } from '@/lib/actions/users';
import { prisma } from '@/lib/prisma';
import { getFileStorageService } from '@/lib/services/FileStorageService';
import { FileUtils } from '@/utils/files';

/**
 * @swagger
 * /documents/{documentId}/attachments/archive:
 *   get:
 *     summary: Download all document attachments as a zip archive
 *     tags: [Attachments]
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: The document ID
 *     responses:
 *       200:
 *         description: A zip archive of the document and its attachments
 *         content:
 *           application/zip:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Document not found
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { documentId: string } }
) {
    const user = await getCurrentUser(request);

    const { documentId } = await params;

    if (!user)
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const doc = await prisma.document.findUnique({
        where: { id: documentId },
        select: {
            id: true,
            authorId: true,
            isPublished: true,
            fileName: true,
            filePath: true,
        },
    });
    if (!doc)
        return NextResponse.json(
            { message: 'Document not found' },
            { status: 404 }
        );

    // Доступ: ADMIN всё; USER — свои/опубликованные; GUEST — запрещено
    if (user.role === USER_ROLES.GUEST) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    if (
        user.role !== USER_ROLES.ADMIN &&
        doc.authorId !== user.id &&
        !doc.isPublished
    ) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const attachments = await prisma.attachment.findMany({
        where: { documentId },
        select: { fileName: true, filePath: true, order: true },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });

    const archive = archiver('zip', { zlib: { level: 9 } });
    const readable = new ReadableStream({
        start(controller) {
            archive.on('data', chunk =>
                controller.enqueue(new Uint8Array(chunk))
            );
            archive.on('end', () => controller.close());
            archive.on('error', err => controller.error(err));
        },
    });

    const fileStorageService = getFileStorageService();

    // основной оригинал
    {
        const name = doc.fileName;
        const keyOrPath = doc.filePath;
        const buf = !isAbsolute(keyOrPath)
            ? await fileStorageService.downloadDocument(keyOrPath)
            : await FileUtils.readFile(keyOrPath);
        archive.append(buf, { name });
    }

    // приложения (только оригиналы)
    for (const a of attachments) {
        const buf = !isAbsolute(a.filePath)
            ? await fileStorageService.downloadDocument(a.filePath)
            : await FileUtils.readFile(a.filePath);
        archive.append(buf, { name: a.fileName });
    }

    const fileName = doc.fileName.split('.').slice(0, -1).join('_');
    void archive.finalize();

    return new NextResponse(readable, {
        headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(
                `${fileName}.zip`
            )}"`,
            'Cache-Control': 'private, max-age=0, must-revalidate',
        },
    });
}