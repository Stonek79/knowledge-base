import { type DeepMockProxy, mockDeep } from 'jest-mock-extended'
import { USER_ROLES } from '@/constants/user'
import type { DocumentProcessor } from '@/core/documents/DocumentProcessor'
import { ApiError } from '@/lib/api/errors'
import type { DocumentRepositoryV2 } from '@/lib/repositories/DocumentRepositoryV2'
import type { AuditLogServiceV2 } from '@/lib/services/AuditLogServiceV2'
import type { FileStorageService } from '@/lib/services/FileStorageService'
import type { SettingsService } from '@/lib/services/SettingsService'
import { DocumentServiceV2 } from './DocumentServiceV2'

// Mock indexing queue
jest.mock('@/lib/queues/indexing', () => ({
    indexingQueue: {
        add: jest.fn(),
    },
}))

// Mock FileUtils
jest.mock('@/utils/files', () => ({
    FileUtils: {
        validateFile: jest.fn().mockResolvedValue({ valid: true }),
        generateFileHash: jest.fn().mockResolvedValue('hash123'),
        generateSafeFileName: jest.fn(),
    },
}))

describe('DocumentServiceV2', () => {
    let service: DocumentServiceV2
    let docRepoMock: DeepMockProxy<DocumentRepositoryV2>
    let auditServiceMock: DeepMockProxy<AuditLogServiceV2>
    let storageServiceMock: DeepMockProxy<FileStorageService>
    let settingsServiceMock: DeepMockProxy<SettingsService>
    let processorMock: DeepMockProxy<DocumentProcessor>

    const mockAdmin = {
        id: 'admin1',
        role: USER_ROLES.ADMIN,
        username: 'admin',
        createdAt: new Date(),
        enabled: true,
    }

    const mockUser = {
        id: 'user1',
        role: USER_ROLES.USER,
        username: 'user',
        createdAt: new Date(),
        enabled: true,
    }

    const mockGuest = {
        id: 'guest1',
        role: USER_ROLES.GUEST,
        username: 'guest',
        createdAt: new Date(),
        enabled: true,
    }

    beforeEach(() => {
        docRepoMock = mockDeep<DocumentRepositoryV2>()
        auditServiceMock = mockDeep<AuditLogServiceV2>()
        storageServiceMock = mockDeep<FileStorageService>()
        settingsServiceMock = mockDeep<SettingsService>()
        processorMock = mockDeep<DocumentProcessor>()

        service = new DocumentServiceV2(
            docRepoMock,
            auditServiceMock,
            storageServiceMock,
            settingsServiceMock,
            processorMock
        )

        // Default settings
        settingsServiceMock.getMaxFileSize.mockResolvedValue(2 * 1024 * 1024)
        settingsServiceMock.getAllowedMimeTypes.mockResolvedValue([
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/pdf',
        ])
    })

    describe('createDocument', () => {
        // Создаем Mock File с правильными методами
        const createMockFile = () => {
            const file = new File(['content'], 'test.docx', {
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            })
            // Переопределяем arrayBuffer для теста
            file.arrayBuffer = jest
                .fn()
                .mockResolvedValue(Buffer.from('content').buffer)
            return file
        }

        const mockData = {
            file: createMockFile(),
            authorId: 'user1',
            creatorId: 'user1',
            title: 'Test Doc',
            description: 'Test description',
            categoryIds: [],
            keywords: '',
        }

        it('should throw if user is guest', async () => {
            const data = { ...mockData, file: createMockFile() }
            await expect(
                service.createDocument(data, mockGuest)
            ).rejects.toThrow(ApiError)
        })

        it('should create document with valid data', async () => {
            // Мокаем storageService.getFileInfo
            storageServiceMock.getFileInfo.mockResolvedValue({
                size: 2048,
            } as Awaited<ReturnType<typeof storageServiceMock.getFileInfo>>)

            const mockProcessed = {
                extractedText: 'Extracted text content',
                original: { path: '/path/to/file.docx' },
                pdf: { path: '/path/to/file.pdf', size: 2048 },
                storage: {
                    originalKey: 'documents/original/abc123.docx',
                    pdfKey: 'documents/converted/abc123.pdf',
                },
            }

            const mockCreatedDoc = {
                id: 'doc1',
                title: 'Test Doc',
                description: 'Test description',
                content: 'Extracted text content',
                hash: 'hash123',
                author: {
                    id: 'user1',
                    username: 'user',
                    role: USER_ROLES.USER,
                },
                categories: [],
            }

            processorMock.processUpload.mockResolvedValue(
                mockProcessed as unknown as Awaited<
                    ReturnType<typeof processorMock.processUpload>
                >
            )
            docRepoMock.findUnique.mockResolvedValue(null)
            docRepoMock.interactiveTransaction.mockImplementation(
                async callback => {
                    const txClient = {
                        document: {
                            create: jest.fn().mockResolvedValue(mockCreatedDoc),
                            update: jest.fn(),
                        },
                        category: {
                            create: jest.fn(),
                            update: jest.fn(),
                        },
                        documentCategory: {
                            create: jest.fn(),
                            update: jest.fn(),
                        },
                    }
                    // Мокаем createConvertedDocument на txRepo
                    docRepoMock.createConvertedDocument.mockResolvedValue({
                        id: 'conv1',
                    } as Awaited<
                        ReturnType<typeof docRepoMock.createConvertedDocument>
                    >)

                    return callback(
                        docRepoMock,
                        txClient as unknown as Awaited<
                            Parameters<typeof callback>[1]
                        >
                    )
                }
            )
            docRepoMock.create.mockResolvedValue(
                mockCreatedDoc as unknown as Awaited<
                    ReturnType<typeof docRepoMock.create>
                >
            )

            const data = { ...mockData, file: createMockFile() }
            const result = await service.createDocument(data, mockUser)

            expect(result).toEqual(mockCreatedDoc)
            expect(processorMock.processUpload).toHaveBeenCalled()
            expect(docRepoMock.create).toHaveBeenCalled()
            expect(auditServiceMock.log).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: mockUser.id,
                    action: 'DOCUMENT_CREATED',
                }),
                expect.anything()
            )
        })
    })

    describe('updateDocument', () => {
        it('should allow author to update their document', async () => {
            const mockDocBefore = {
                title: 'Old Title',
                description: 'Old Desc',
                authorId: 'user1',
                creatorId: 'user1',
                categories: [],
            }

            const mockUpdatedDoc = {
                id: 'doc1',
                title: 'New Title',
                description: 'New Desc',
                author: mockUser,
                creator: mockUser,
                categories: [],
            }

            docRepoMock.interactiveTransaction.mockImplementation(
                async callback => {
                    return callback(
                        docRepoMock,
                        {} as unknown as Awaited<Parameters<typeof callback>[1]>
                    )
                }
            )
            docRepoMock.findUnique.mockResolvedValue(
                mockDocBefore as unknown as Awaited<
                    ReturnType<typeof docRepoMock.findUnique>
                >
            )
            docRepoMock.update.mockResolvedValue(
                mockUpdatedDoc as unknown as Awaited<
                    ReturnType<typeof docRepoMock.update>
                >
            )

            const result = await service.updateDocument(
                'doc1',
                { title: 'New Title', description: 'New Desc' },
                mockUser,
                undefined
            )

            expect(result.title).toBe('New Title')
            expect(docRepoMock.update).toHaveBeenCalled()
            expect(auditServiceMock.log).toHaveBeenCalled()
        })

        it('should throw if USER tries to update others document', async () => {
            const mockDocBefore = {
                title: 'Old Title',
                description: 'Old Desc',
                authorId: 'other-user',
                creatorId: 'other-user',
                categories: [],
            }

            docRepoMock.interactiveTransaction.mockImplementation(
                async callback => {
                    return callback(
                        docRepoMock,
                        {} as unknown as Awaited<Parameters<typeof callback>[1]>
                    )
                }
            )
            docRepoMock.findUnique.mockResolvedValue(
                mockDocBefore as unknown as Awaited<
                    ReturnType<typeof docRepoMock.findUnique>
                >
            )

            await expect(
                service.updateDocument(
                    'doc1',
                    { title: 'New Title' },
                    mockUser,
                    undefined
                )
            ).rejects.toThrow('Можно редактировать только свои документы')
        })
    })

    describe('softDeleteDocument', () => {
        it('should allow author to soft delete their document', async () => {
            const mockDoc = {
                title: 'Test Doc',
                authorId: 'user1',
                creatorId: 'user1',
            }

            docRepoMock.interactiveTransaction.mockImplementation(
                async callback => {
                    return callback(
                        docRepoMock,
                        {} as unknown as Awaited<Parameters<typeof callback>[1]>
                    )
                }
            )
            docRepoMock.findUnique.mockResolvedValue(
                mockDoc as unknown as Awaited<
                    ReturnType<typeof docRepoMock.findUnique>
                >
            )
            docRepoMock.update.mockResolvedValue(
                {} as unknown as Awaited<ReturnType<typeof docRepoMock.update>>
            )

            await service.softDeleteDocument('doc1', mockUser)

            expect(docRepoMock.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'doc1' },
                    data: expect.objectContaining({
                        deletedAt: expect.any(Date),
                        isPublished: false,
                    }),
                })
            )
            expect(auditServiceMock.log).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: mockUser.id,
                    action: 'DOCUMENT_DELETED_SOFT',
                }),
                expect.anything()
            )
        })

        it('should throw if USER tries to delete others document', async () => {
            const mockDoc = {
                title: 'Test Doc',
                authorId: 'other-user',
                creatorId: 'other-user',
            }

            docRepoMock.interactiveTransaction.mockImplementation(
                async callback => {
                    return callback(
                        docRepoMock,
                        {} as unknown as Awaited<Parameters<typeof callback>[1]>
                    )
                }
            )
            docRepoMock.findUnique.mockResolvedValue(
                mockDoc as unknown as Awaited<
                    ReturnType<typeof docRepoMock.findUnique>
                >
            )

            await expect(
                service.softDeleteDocument('doc1', mockUser)
            ).rejects.toThrow('Вы можете удалять только свои документы')
        })
    })

    describe('hardDeleteDocument', () => {
        it('should allow ADMIN to hard delete any document', async () => {
            const mockDoc = {
                id: 'doc1',
                title: 'Test Doc',
                filePath: 'documents/test.pdf',
                author: {
                    id: 'user1',
                    username: 'user',
                    role: USER_ROLES.USER,
                },
                creatorId: 'user1',
                mainPdf: null,
                attachments: [],
                convertedVersions: [],
            }

            docRepoMock.interactiveTransaction.mockImplementation(
                async callback => {
                    const txClient = {
                        convertedDocument: {
                            findMany: jest.fn().mockResolvedValue([]),
                            deleteMany: jest
                                .fn()
                                .mockResolvedValue({ count: 0 }),
                        },
                        documentCategory: {
                            deleteMany: jest
                                .fn()
                                .mockResolvedValue({ count: 0 }),
                        },
                        attachment: {
                            deleteMany: jest
                                .fn()
                                .mockResolvedValue({ count: 0 }),
                        },
                        document: {
                            delete: jest.fn().mockResolvedValue({}),
                        },
                    }
                    return callback(
                        docRepoMock,
                        txClient as unknown as Awaited<
                            Parameters<typeof callback>[1]
                        >
                    )
                }
            )
            docRepoMock.findUnique.mockResolvedValue(
                mockDoc as unknown as Awaited<
                    ReturnType<typeof docRepoMock.findUnique>
                >
            )

            await service.hardDeleteDocument('doc1', mockAdmin)

            expect(auditServiceMock.log).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: mockAdmin.id,
                    action: 'DOCUMENT_DELETED_HARD',
                }),
                expect.anything()
            )
        })

        it('should throw if USER tries to hard delete others document', async () => {
            const mockDoc = {
                id: 'doc1',
                title: 'Test Doc',
                filePath: 'documents/test.pdf',
                author: {
                    id: 'other-user',
                    username: 'other',
                    role: USER_ROLES.USER,
                },
                creatorId: 'other-user',
                mainPdf: null,
                attachments: [],
                convertedVersions: [],
            }

            docRepoMock.interactiveTransaction.mockImplementation(
                async callback => {
                    return callback(
                        docRepoMock,
                        {} as unknown as Awaited<Parameters<typeof callback>[1]>
                    )
                }
            )
            docRepoMock.findUnique.mockResolvedValue(
                mockDoc as unknown as Awaited<
                    ReturnType<typeof docRepoMock.findUnique>
                >
            )

            await expect(
                service.hardDeleteDocument('doc1', mockUser)
            ).rejects.toThrow('Вы можете удалять только свои документы')
        })
    })
})
