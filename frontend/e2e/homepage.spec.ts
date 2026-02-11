import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('should display the homepage with title and links', async ({ page }) => {
    await page.goto('/')

    // Check title
    await expect(page.getByRole('heading', { name: 'Why' })).toBeVisible()

    // Check description
    await expect(page.getByText('A messaging app with full observability')).toBeVisible()

    // Check navigation links
    await expect(page.getByRole('link', { name: 'Sign up' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible()
  })

  test('should navigate to signup page', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('link', { name: 'Sign up' }).click()

    await expect(page).toHaveURL('/signup')
    await expect(page.getByText('Create your account')).toBeVisible()
  })

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('link', { name: 'Log in' }).click()

    await expect(page).toHaveURL('/login')
    await expect(page.getByText('Sign in to your account')).toBeVisible()
  })
})
