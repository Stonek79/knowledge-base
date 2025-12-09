import { expect, test } from '@playwright/test'

test.describe('Authentication', () => {
    test('should allow user to login', async ({ page }) => {
        await page.goto('/login')

        // Fill in credentials (assuming seed data or mock)
        // Note: In a real environment, we should seed the DB before tests
        // For now, we'll assume the 'admin' user exists from seed
        await page.fill('input[name="username"]', 'admin')
        await page.fill('input[name="password"]', 'admin')

        await page.click('button[type="submit"]')

        // Expect to be redirected to dashboard or home
        await expect(page).toHaveURL('/')
        await expect(page.getByText('Admin User')).toBeVisible()
    })

    test('should show error on invalid credentials', async ({ page }) => {
        await page.goto('/login')

        await page.fill('input[name="username"]', 'wrong')
        await page.fill('input[name="password"]', 'wrong')

        await page.click('button[type="submit"]')

        await expect(page.getByText('Неверный пароль')).toBeVisible()
    })
})
