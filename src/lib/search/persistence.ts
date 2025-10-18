import {
    FLEXSEARCH_DOCS_DUMP_KEY,
    FLEXSEARCH_INDEX_DUMP_KEY,
} from '@/constants/search'
import { getFileStorageService } from '@/lib/services/FileStorageService'
import type { SearchDocument } from '@/lib/types/document'

type IndexDump = Record<string, string>
type DocsDump = Record<string, SearchDocument>

// Универсальная функция для сохранения JSON-объекта в MinIO
async function saveObjectToMinio(key: string, data: object): Promise<void> {
    try {
        const buffer = Buffer.from(JSON.stringify(data))
        await getFileStorageService().uploadByKey(
            key,
            buffer,
            'application/json'
        )
    } catch (error) {
        console.error(
            `Failed to upload object to MinIO with key ${key}:`,
            error
        )
        throw error
    }
}

// Универсальная функция для загрузки JSON-объекта из MinIO
async function loadObjectFromMinio(key: string): Promise<unknown | null> {
    try {
        const buf = await getFileStorageService().downloadDocument(key)
        return JSON.parse(buf.toString('utf-8'))
    } catch (e) {
        if (isNoSuchKey(e)) return null // нет дампа — это нормально
        // остальное — реальная ошибка
        throw e
    }
}

function isNoSuchKey(err: unknown): boolean {
    return (
        typeof err === 'object' &&
        err !== null &&
        (err as { code?: string }).code === 'NoSuchKey'
    )
}

export const saveIndexDump = async (dump: IndexDump): Promise<void> => {
    await saveObjectToMinio(FLEXSEARCH_INDEX_DUMP_KEY, dump)
}

export async function loadIndexDump(): Promise<Record<string, string>> {
    return (
        ((await loadObjectFromMinio(FLEXSEARCH_INDEX_DUMP_KEY)) as IndexDump) ??
        {}
    )
}

export const saveDocs = async (
    docs: Record<string, unknown>
): Promise<void> => {
    await saveObjectToMinio(FLEXSEARCH_DOCS_DUMP_KEY, docs)
}

export async function loadDocs(): Promise<Record<string, unknown>> {
    return (
        ((await loadObjectFromMinio(FLEXSEARCH_DOCS_DUMP_KEY)) as DocsDump) ??
        {}
    )
}

export const clearIndexDump = async (): Promise<void> => {
    // Очищаем оба хранилища, записывая в них пустые объекты
    await Promise.all([
        saveObjectToMinio(FLEXSEARCH_INDEX_DUMP_KEY, {}),
        saveObjectToMinio(FLEXSEARCH_DOCS_DUMP_KEY, {}),
    ])
}
