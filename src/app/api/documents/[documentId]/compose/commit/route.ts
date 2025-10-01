import { NextRequest, NextResponse } from 'next/server';

import { STORAGE_BASE_PATHS } from '@/constants/app';
import { USER_ROLES } from '@/constants/user';
import { getCurrentUser } from '@/lib/actions/users';
import { ApiError, handleApiError } from '@/lib/api/apiError';
import { prisma } from '@/lib/prisma';
import { indexingQueue } from '@/lib/queues/indexing';
import { composeChangeSetSchema } from '@/lib/schemas/compose';
import { getFileStorageService } from '@/lib/services/FileStorageService';
import { pdfCombiner } from '@/lib/services/PDFCombiner';
import { DocumentComposeService } from '@/lib/services/documents/DocumentComposeService';
import type { SupportedMime } from '@/lib/types/mime';
import { hashPassword } from '@/utils/auth';
import { isSupportedMime } from '@/utils/mime';
import { UserService } from '@/lib/services/UserService';

export async function POST(
    request: NextRequest,
    { params }: { params: { documentId: string } }
) {
    // подготовка списков для компенсаций/очистки
    // const promoted: string[] = []; // новые ключи, созданные в процессе (удаляем при rollback)
    // const tempKeys: string[] = []; // временные ключи (чистятся promote'ом; на всякий случай чистим после)
    // const cleanupOnSuccess: string[] = []; // старые ключи, которые надо удалить после успешного коммита

    try {
        const user = await getCurrentUser(request);
        if (!user)
            return NextResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            );

        const { documentId } = await params;
        const body = await request.json();
        const validation = composeChangeSetSchema.safeParse(body);

        if (!validation.success) {
            return handleApiError(validation.error);
        }

        let authorId: string | undefined = undefined;
        const metadata = validation.data.metadata;

        if (metadata?.authorId) {
            authorId = metadata.authorId;
        } else if (metadata?.username) {
            const author = await UserService.findOrCreateAuthor(
                metadata.username
            );
            authorId = author.id;
        }
        // const parsed = composeChangeSetSchema.parse(body);

        // const result = await prisma.$transaction(
        //     async tx => {
        //         // 0) загрузить документ и проверить права
        //         const existing = await tx.document.findUnique({
        //             where: { id: documentId },
        //             select: {
        //                 id: true,
        //                 authorId: true,
        //                 filePath: true,
        //                 fileName: true,
        //                 mimeType: true,
        //                 mainPdf: { select: { id: true, filePath: true } },
        //             },
        //         });
        //         if (!existing) {
        //             return NextResponse.json(
        //                 { message: 'Document not found' },
        //                 { status: 404 }
        //             );
        //         }
        //         // USER может менять только свои документы
        //         if (
        //             user.role !== USER_ROLES.ADMIN &&
        //             existing.authorId !== user.id
        //         ) {
        //             return NextResponse.json(
        //                 { message: 'Forbidden' },
        //                 { status: 403 }
        //             );
        //         }

        //         // 1) metadata
        //         if (parsed.metadata) {
        //             const keywords =
        //                 parsed.metadata.keywords
        //                     ?.split(',')
        //                     .map(s => s.trim())
        //                     .filter(Boolean) ?? undefined;

        //             await tx.document.update({
        //                 where: { id: documentId },
        //                 data: {
        //                     title: parsed.metadata.title,
        //                     description: parsed.metadata.description,
        //                     keywords,
        //                     isConfidential: parsed.metadata.isConfidential,
        //                     isSecret: parsed.metadata.isSecret,
        //                     accessCodeHash: parsed.metadata.accessCode
        //                         ? await hashPassword(parsed.metadata.accessCode)
        //                         : undefined,
        //                     categories: parsed.metadata.categoryIds
        //                         ? {
        //                               deleteMany: {},
        //                               create: parsed.metadata.categoryIds.map(
        //                                   id => ({ categoryId: id })
        //                               ),
        //                           }
        //                         : undefined,
        //                 },
        //             });

        //             // Синхронизируем список доступа для конфиденциальных документов
        //             if (
        //                 parsed.metadata.isConfidential &&
        //                 parsed.metadata.confidentialAccessUserIds
        //             ) {
        //                 await tx.confidentialDocumentAccess.deleteMany({
        //                     where: { documentId: documentId },
        //                 });
        //                 await tx.confidentialDocumentAccess.createMany({
        //                     data: parsed.metadata.confidentialAccessUserIds.map(
        //                         userId => ({
        //                             documentId: documentId,
        //                             userId: userId,
        //                         })
        //                     ),
        //                 });
        //             } else if (parsed.metadata.isConfidential === false) {
        //                 // Если документ перестал быть конфиденциальным, чистим список доступа
        //                 await tx.confidentialDocumentAccess.deleteMany({
        //                     where: { documentId: documentId },
        //                 });
        //             }
        //         }

        //         // 2) replaceMain (опционально)
        //         if (parsed.replaceMain) {
        //             if (!isSupportedMime(parsed.replaceMain.mimeType)) {
        //                 return NextResponse.json(
        //                     { message: 'Unsupported main file type' },
        //                     { status: 415 }
        //                 );
        //             }
        //             const mainMime: SupportedMime = parsed.replaceMain.mimeType;
        //             tempKeys.push(parsed.replaceMain.tempKey);

        //             const promotedMain =
        //                 await getFileStorageService().promoteFromTemp(
        //                     parsed.replaceMain.tempKey,
        //                     STORAGE_BASE_PATHS.ORIGINAL
        //                 );
        //             promoted.push(promotedMain.key);

        //             // пометим старый mainPdf на удаление после успеха
        //             if (existing.mainPdf?.filePath) {
        //                 cleanupOnSuccess.push(existing.mainPdf.filePath);
        //             }

        //             // обновить поля документа (оригинал)
        //             await tx.document.update({
        //                 where: { id: documentId },
        //                 data: {
        //                     filePath: promotedMain.key,
        //                     fileName: parsed.replaceMain.originalName,
        //                     fileSize: promotedMain.size,
        //                     mimeType: mainMime,
        //                 },
        //             });
        //         }

        //         const clientIdToAttachmentId: Record<string, string> = {};

        //         // 3) addAttachments (опционально)
        //         if (parsed.addAttachments?.length) {
        //             for (const att of parsed.addAttachments) {
        //                 if (!isSupportedMime(att.mimeType)) {
        //                     return NextResponse.json(
        //                         {
        //                             message: `Unsupported attachment type: ${att.originalName}`,
        //                         },
        //                         { status: 415 }
        //                     );
        //                 }
        //                 const attMime: SupportedMime = att.mimeType;
        //                 tempKeys.push(att.tempKey);

        //                 const promotedAtt =
        //                     await getFileStorageService().promoteFromTemp(
        //                         att.tempKey,
        //                         STORAGE_BASE_PATHS.ATTACHMENTS
        //                     );
        //                 promoted.push(promotedAtt.key);

        //                 const newAttachment = await tx.attachment.create({
        //                     data: {
        //                         documentId,
        //                         fileName: att.originalName,
        //                         fileSize: promotedAtt.size,
        //                         mimeType: attMime,
        //                         filePath: promotedAtt.key,
        //                         order: -1,
        //                     },
        //                 });

        //                 clientIdToAttachmentId[att.clientId] = newAttachment.id;
        //             }
        //         }

        //         // 4) deleteAttachmentIds (опционально)
        //         if (parsed.deleteAttachmentIds?.length) {
        //             const toDelete = await tx.attachment.findMany({
        //                 where: {
        //                     id: { in: parsed.deleteAttachmentIds },
        //                     documentId,
        //                 },
        //                 select: { id: true, filePath: true },
        //             });
        //             for (const a of toDelete) {
        //                 if (a.filePath) cleanupOnSuccess.push(a.filePath);
        //             }
        //             await tx.attachment.deleteMany({
        //                 where: {
        //                     id: { in: parsed.deleteAttachmentIds },
        //                     documentId,
        //                 },
        //             });
        //         }

        //         // 5) reorder (опционально)
        //         if (parsed.reorder?.length) {
        //             const existingIdsFromClient = parsed.reorder
        //                 .map(item => item.attachmentId)
        //                 .filter((id): id is string => !!id);

        //             if (existingIdsFromClient.length > 0) {
        //                 const foundAttachments = await tx.attachment.findMany({
        //                     where: {
        //                         id: { in: existingIdsFromClient },
        //                         documentId: documentId,
        //                     },
        //                     select: { id: true },
        //                 });

        //                 if (
        //                     foundAttachments.length !==
        //                     existingIdsFromClient.length
        //                 ) {
        //                     throw new Error(
        //                         'Stale data: One or more attachments to reorder do not exist.'
        //                     );
        //                 }
        //             }

        //             for (const {
        //                 attachmentId,
        //                 clientId,
        //                 order,
        //             } of parsed.reorder) {
        //                 const finalId =
        //                     attachmentId ?? clientIdToAttachmentId[clientId];

        //                 if (finalId) {
        //                     await tx.attachment.update({
        //                         where: { id: finalId },
        //                         data: { order },
        //                     });
        //                 } else {
        //                     // Эта ситуация не должна возникать при корректном запросе с клиента
        //                     throw new Error(
        //                         `[compose/commit] Reorder failed: could not find attachmentId for clientId ${clientId}`
        //                     );
        //                 }
        //             }
        //         }

        //         // 6) собрать список приложений и пересобрать PDF
        //         const doc = await tx.document.findUnique({
        //             where: { id: documentId },
        //             select: {
        //                 id: true,
        //                 filePath: true,
        //                 fileName: true,
        //                 mimeType: true,
        //                 mainPdf: { select: { id: true, filePath: true } },
        //             },
        //         });
        //         if (!doc) {
        //             throw new Error('Document disappeared during transaction');
        //         }

        //         const attachments = await tx.attachment.findMany({
        //             where: { documentId },
        //             orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        //         });

        //         // только валидные MIME берём в сборку
        //         const valid = attachments
        //             .filter(a => isSupportedMime(a.mimeType))
        //             .map((a, idx) => ({
        //                 id: a.id,
        //                 filePath: a.filePath,
        //                 fileName: a.fileName,
        //                 mimeType: a.mimeType as SupportedMime,
        //                 order: idx,
        //             }));

        //         const pdf = await pdfCombiner.combineWithAttachments(
        //             {
        //                 mainDocumentPath: doc.filePath,
        //                 mainDocumentMimeType: doc.mimeType as SupportedMime,
        //                 attachments: valid,
        //             },
        //             doc.fileName
        //         );

        //         if (!pdf.success || !pdf.combinedPdfKey) {
        //             throw new Error(
        //                 pdf.error || 'Failed to build combined PDF'
        //             );
        //         }

        //         // записать новый mainPdf и снять старый
        //         const conv = await tx.convertedDocument.create({
        //             data: {
        //                 documentId: doc.id,
        //                 conversionType: 'PDF',
        //                 filePath: pdf.combinedPdfKey,
        //                 fileSize: pdf.fileSize ?? 0,
        //                 originalFile: doc.filePath,
        //             },
        //         });
        //         await tx.document.update({
        //             where: { id: doc.id },
        //             data: { mainPdfId: conv.id },
        //         });
        //         if (doc.mainPdf?.id) {
        //             await tx.convertedDocument.delete({
        //                 where: { id: doc.mainPdf.id },
        //             });
        //         }
        //         if (doc.mainPdf?.filePath) {
        //             cleanupOnSuccess.push(doc.mainPdf.filePath);
        //         }

        //         // ===== ИНДЕКСАЦИЯ (в фоне) =====
        //         const hasFileChanges =
        //             !!parsed.replaceMain ||
        //             !!parsed.addAttachments?.length ||
        //             !!parsed.deleteAttachmentIds?.length;

        //         // Ставим задачу в очередь для фоновой переиндексации
        //         if (doc.id) {
        //             if (hasFileChanges) {
        //                 // Если менялся состав файлов, запускаем полную пересборку контента
        //                 console.log(
        //                     `[API] Enqueuing job: 'update-content-and-reindex' for documentId: ${doc.id}`
        //                 );
        //                 await indexingQueue.add('update-content-and-reindex', {
        //                     documentId: doc.id,
        //                 });
        //             } else {
        //                 // Если менялись только метаданные, достаточно простой переиндексации
        //                 console.log(
        //                     `[API] Enqueuing job: 'index-document' for documentId: ${doc.id}`
        //                 );
        //                 await indexingQueue.add('index-document', {
        //                     documentId: doc.id,
        //                 });
        //             }
        //         }
        //         return { docId: doc.id };
        //     },
        //     {
        //         timeout: 60000,
        //         maxWait: 30000,
        //     }
        // );

        // // финализация (после коммита): удалить старые файлы и любые temp
        // for (const key of cleanupOnSuccess) {
        //     await getFileStorageService().safeDelete(key);
        // }
        // for (const t of tempKeys) {
        //     await getFileStorageService().safeDelete(t);
        // }

        const result = await DocumentComposeService.composeUpdateDocument(
            documentId,
            validation.data,
            user,
            authorId
        );

        return NextResponse.json({ status: 'ok', ...result });
    } catch (error) {
        // компенсации: удалить все продвинутые ключи

        console.warn(
            '[compose/update] rolling back promoted files due to error'
        );

        // for (const key of promoted) {
        //     await getFileStorageService().safeDelete(key);
        // }

        return handleApiError(error);
    }
}
