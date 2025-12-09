import { FileUtils } from './files'

describe('FileUtils', () => {
    describe('generateSafeFileName', () => {
        it('should generate a file name with the correct extension', () => {
            const originalName = 'test.docx'
            const safeName = FileUtils.generateSafeFileName(originalName)
            expect(safeName).toMatch(/\.docx$/)
        })

        it('should generate a unique name', () => {
            const originalName = 'test.docx'
            const safeName1 = FileUtils.generateSafeFileName(originalName)
            const safeName2 = FileUtils.generateSafeFileName(originalName)
            expect(safeName1).not.toBe(safeName2)
        })

        it('should handle files without extension', () => {
            const originalName = 'testfile'
            const safeName = FileUtils.generateSafeFileName(originalName)
            expect(safeName).toMatch(/\.bin$/)
        })
    })
})
