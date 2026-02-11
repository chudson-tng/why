import { test, expect } from '@playwright/test'

test.describe('Messages Flow (requires authentication)', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/messages')

    // Should be redirected to login
    await expect(page).toHaveURL('/login')
  })

  test('should redirect message detail to login when not authenticated', async ({ page }) => {
    await page.goto('/messages/some-message-id')

    // Should be redirected to login
    await expect(page).toHaveURL('/login')
  })
})

test.describe('Messages UI (mocked auth)', () => {
  test.beforeEach(async ({ page }) => {
    // Mock localStorage to simulate authenticated state
    await page.addInitScript(() => {
      localStorage.setItem('why_token', 'mock-token')
    })
  })

  test('should display messages page with navigation', async ({ page }) => {
    await page.goto('/messages')

    // Check header
    await expect(page.getByRole('heading', { name: 'Why' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible()

    // Check message form
    await expect(page.getByPlaceholder("What's on your mind?")).toBeVisible()
    await expect(page.getByRole('button', { name: 'Post' })).toBeVisible()
  })

  test('should disable post button when textarea is empty', async ({ page }) => {
    await page.goto('/messages')

    const postButton = page.getByRole('button', { name: 'Post' })
    await expect(postButton).toBeDisabled()
  })

  test('should enable post button when textarea has content', async ({ page }) => {
    await page.goto('/messages')

    const textarea = page.getByPlaceholder("What's on your mind?")
    await textarea.fill('This is a new message')

    const postButton = page.getByRole('button', { name: 'Post' })
    await expect(postButton).not.toBeDisabled()
  })

  test('should show file input for media upload', async ({ page }) => {
    await page.goto('/messages')

    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toBeVisible()
    await expect(fileInput).toHaveAttribute('accept', 'image/*,video/*')
    await expect(fileInput).toHaveAttribute('multiple')
  })
})
