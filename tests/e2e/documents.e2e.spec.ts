import { expect, test } from '@playwright/test'

test.describe('Documents', () => {
    test.beforeEach(async ({ page }) => {
        // Login before each test
        await page.goto('/login')
        await page.fill('input[name="username"]', 'admin')
        await page.fill('input[name="password"]', 'admin')
        await page.click('button[type="submit"]')
        await expect(page).toHaveURL('/')
    })

    test('should display document list', async ({ page }) => {
        await page.goto('/documents')
        await expect(
            page.getByRole('heading', { name: 'Документы' })
        ).toBeVisible()
    })

    test('should allow uploading a document', async ({ page }) => {
        await page.goto('/documents/upload')

        await page.fill('input[name="title"]', 'E2E Test Document')

        // Create a dummy file for upload
        const fileContent = 'This is a test document content for E2E testing.'
        const fileName = 'test-doc.txt'
        const buffer = Buffer.from(fileContent)

        // Upload file
        const fileInput = page.locator('input[type="file"]')
        await fileInput.setInputFiles({
            name: fileName,
            mimeType: 'text/plain',
            buffer: buffer,
        })

        await page.click('button[type="submit"]')

        // Expect redirection to document list or details
        // Adjust expectation based on actual app behavior
        await expect(page).toHaveURL(/\/documents/)
        await expect(page.getByText('E2E Test Document')).toBeVisible()
    })
})
