import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should display login form', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: 'Why' })).toBeVisible()
    await expect(page.getByText('Sign in to your account')).toBeVisible()
    await expect(page.getByLabel('Email address')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })

  test('should display signup form', async ({ page }) => {
    await page.goto('/signup')

    await expect(page.getByRole('heading', { name: 'Why' })).toBeVisible()
    await expect(page.getByText('Create your account')).toBeVisible()
    await expect(page.getByLabel('Email address')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign up' })).toBeVisible()
    await expect(page.getByText('At least 8 characters')).toBeVisible()
  })

  test('should show validation for empty login form', async ({ page }) => {
    await page.goto('/login')

    const submitButton = page.getByRole('button', { name: 'Sign in' })
    await submitButton.click()

    // HTML5 validation should prevent submission
    // Check that we're still on the login page
    await expect(page).toHaveURL('/login')
  })

  test('should navigate between login and signup', async ({ page }) => {
    await page.goto('/login')

    await page.getByRole('link', { name: 'Sign up' }).click()
    await expect(page).toHaveURL('/signup')
    await expect(page.getByText('Create your account')).toBeVisible()

    await page.getByRole('link', { name: 'Log in' }).click()
    await expect(page).toHaveURL('/login')
    await expect(page.getByText('Sign in to your account')).toBeVisible()
  })

  test('should require minimum password length on signup', async ({ page }) => {
    await page.goto('/signup')

    const passwordInput = page.getByLabel('Password')
    await expect(passwordInput).toHaveAttribute('minlength', '8')
  })
})
