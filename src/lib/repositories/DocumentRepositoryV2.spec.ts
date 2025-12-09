import type { PrismaClient } from '@prisma/client'
import { type DeepMockProxy, mockDeep } from 'jest-mock-extended'
import { DocumentRepositoryV2 } from './DocumentRepositoryV2'

describe('DocumentRepositoryV2', () => {
    let prismaMock: DeepMockProxy<PrismaClient>
    let repository: DocumentRepositoryV2

    beforeEach(() => {
        prismaMock = mockDeep<PrismaClient>()
        repository = new DocumentRepositoryV2(prismaMock)
    })

    it('should find many documents', async () => {
        const mockDocs = [{ id: '1', title: 'Test Doc' }]
        prismaMock.document.findMany.mockResolvedValue(
            mockDocs as unknown as Awaited<
                ReturnType<typeof prismaMock.document.findMany>
            >
        )

        const result = await repository.findMany({})
        expect(result).toEqual(mockDocs)
        expect(prismaMock.document.findMany).toHaveBeenCalledWith({})
    })

    it('should create a document', async () => {
        const mockDoc = {
            id: '1',
            title: 'New Doc',
            content: 'Test content',
            filePath: '/path/to/file.pdf',
            fileName: 'file.pdf',
            fileSize: 1024,
            mimeType: 'application/pdf',
            hash: 'abc123',
        }
        prismaMock.document.create.mockResolvedValue(
            mockDoc as unknown as Awaited<
                ReturnType<typeof prismaMock.document.create>
            >
        )

        const result = await repository.create({
            data: {
                title: 'New Doc',
                content: 'Test content',
                filePath: '/path/to/file.pdf',
                fileName: 'file.pdf',
                fileSize: 1024,
                mimeType: 'application/pdf',
                hash: 'abc123',
                creator: { connect: { id: 'user-1' } },
                author: { connect: { id: 'user-1' } },
            },
        })
        expect(result).toEqual(mockDoc)
    })
})
