# Testing Guide

This document describes the testing setup for the Why frontend application.

## Test Stack

- **Unit & Integration Tests**: Jest + React Testing Library
- **E2E Tests**: Playwright
- **Coverage**: Jest Coverage Reports

## Running Tests

### Unit and Integration Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### E2E Tests

```bash
# Run E2E tests (headless)
npm run test:e2e

# Run E2E tests with UI mode (interactive)
npm run test:e2e:ui

# Run E2E tests in headed mode (see the browser)
npm run test:e2e:headed
```

## Test Structure

### Unit Tests

```
lib/__tests__/           # Utility function tests
  - auth.test.ts         # Authentication utilities
  - api.test.ts          # API client functions

components/__tests__/    # Component tests
  - MessageCard.test.tsx
  - MessageForm.test.tsx
  - ReplyForm.test.tsx

app/__tests__/           # Page tests
  - page.test.tsx        # Home page
  login/__tests__/
    - page.test.tsx      # Login page
  signup/__tests__/
    - page.test.tsx      # Signup page
  messages/__tests__/
    - page.test.tsx      # Messages list page
  messages/[id]/__tests__/
    - page.test.tsx      # Message detail page
```

### E2E Tests

```
e2e/
  - homepage.spec.ts     # Homepage navigation
  - auth.spec.ts         # Authentication flows
  - messages.spec.ts     # Messages functionality
```

## Test Coverage

The test suite covers:

### Utility Libraries (`lib/`)
- Token management (get, set, remove)
- Authentication (signup, login, logout)
- API calls (messages, replies, media upload)
- Error handling
- Request headers and authentication

### Components
- MessageCard: Rendering, date formatting, media display
- MessageForm: Input validation, submission, file uploads, error handling
- ReplyForm: Input validation, submission, file uploads, error handling

### Pages
- Home: Navigation links
- Login: Form validation, submission, error handling, routing
- Signup: Form validation, password requirements, submission
- Messages List: Authentication checks, loading states, message display
- Message Detail: Message and replies display, reply submission

### E2E Tests
- Homepage navigation
- Authentication form validation
- Login/Signup flow transitions
- Protected routes (authentication required)
- Message form interactions

## Writing New Tests

### Unit Test Example

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MyComponent from '../MyComponent'

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('should handle user interaction', async () => {
    const user = userEvent.setup()
    render(<MyComponent />)

    await user.click(screen.getByRole('button'))

    expect(screen.getByText('Clicked')).toBeInTheDocument()
  })
})
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test'

test('should complete user flow', async ({ page }) => {
  await page.goto('/my-page')

  await page.getByRole('button', { name: 'Click me' }).click()

  await expect(page.getByText('Success')).toBeVisible()
})
```

## Mocking

### API Mocking (Unit Tests)

API functions are mocked using Jest:

```typescript
import * as api from '@/lib/api'

jest.mock('@/lib/api')

// In your test
;(api.listMessages as jest.Mock).mockResolvedValue([...])
```

### Authentication Mocking (E2E Tests)

For E2E tests that require authentication:

```typescript
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('why_token', 'mock-token')
  })
})
```

## Best Practices

1. **Test Behavior, Not Implementation**: Focus on what the user experiences
2. **Use User Events**: Prefer `userEvent` over `fireEvent` for more realistic interactions
3. **Wait for Async Operations**: Use `waitFor` for async state changes
4. **Mock External Dependencies**: Mock API calls and external services
5. **Keep Tests Isolated**: Each test should be independent
6. **Use Descriptive Names**: Test names should clearly describe what they test
7. **Test Error Cases**: Don't just test the happy path

## Troubleshooting

### Tests Failing Due to Timeout

Increase the timeout in `jest.config.js` or use `waitFor` with a custom timeout:

```typescript
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument()
}, { timeout: 5000 })
```

### E2E Tests Not Finding Elements

- Ensure the dev server is running before E2E tests
- Use `page.getByRole()` for better accessibility-based selectors
- Check if the element is visible: `await expect(element).toBeVisible()`

### Mock Not Working

- Clear mocks between tests: `jest.clearAllMocks()` in `beforeEach`
- Ensure mock is defined before the component renders
- Check that the import path matches exactly

## CI/CD Integration

The test suite is designed to run in CI environments:

```bash
# Run all tests for CI
npm run test:coverage && npm run test:e2e
```

Playwright will automatically:
- Use headless mode in CI (when `CI=true`)
- Retry failed tests
- Generate HTML reports
