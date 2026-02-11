import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from '../page'
import * as auth from '@/lib/auth'
import { useRouter } from 'next/navigation'

jest.mock('@/lib/auth')
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}))

describe('LoginPage', () => {
  const mockPush = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('should render login form', () => {
    render(<LoginPage />)

    expect(screen.getByRole('heading', { name: /why/i })).toBeInTheDocument()
    expect(screen.getByText(/sign in to your account/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('should render link to signup page', () => {
    render(<LoginPage />)
    const signupLink = screen.getByRole('link', { name: /sign up/i })
    expect(signupLink).toBeInTheDocument()
    expect(signupLink).toHaveAttribute('href', '/signup')
  })

  it('should update email input', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    const emailInput = screen.getByLabelText(/email address/i)
    await user.type(emailInput, 'test@example.com')

    expect(emailInput).toHaveValue('test@example.com')
  })

  it('should update password input', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    const passwordInput = screen.getByLabelText(/password/i)
    await user.type(passwordInput, 'password123')

    expect(passwordInput).toHaveValue('password123')
  })

  it('should submit login successfully', async () => {
    const user = userEvent.setup()
    ;(auth.login as jest.Mock).mockResolvedValue({
      token: 'test-token',
      user: { id: '1', email: 'test@example.com' }
    })

    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(auth.login).toHaveBeenCalledWith('test@example.com', 'password123')
      expect(mockPush).toHaveBeenCalledWith('/messages')
    })
  })

  it('should show loading state during login', async () => {
    const user = userEvent.setup()
    let resolvePromise: () => void
    const promise = new Promise<void>((resolve) => {
      resolvePromise = resolve
    })

    ;(auth.login as jest.Mock).mockReturnValue(promise)

    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()

    // Clean up - resolve the promise to prevent it from interfering with other tests
    await act(async () => {
      resolvePromise!()
      await promise
    })
  })

  it('should display error message on login failure', async () => {
    const user = userEvent.setup()
    ;(auth.login as jest.Mock).mockRejectedValue(new Error('Invalid credentials'))

    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    })

    expect(mockPush).not.toHaveBeenCalled()
  })

  it('should display generic error when error has no message', async () => {
    const user = userEvent.setup()
    ;(auth.login as jest.Mock).mockRejectedValue('Some error')

    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText('Login failed')).toBeInTheDocument()
    })
  })

  it('should clear error when submitting again', async () => {
    const user = userEvent.setup()
    ;(auth.login as jest.Mock)
      .mockRejectedValueOnce(new Error('Invalid credentials'))
      .mockResolvedValueOnce({ token: 'test-token', user: { id: '1', email: 'test@example.com' } })

    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    })

    await user.clear(screen.getByLabelText(/password/i))
    await user.type(screen.getByLabelText(/password/i), 'correctpassword')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.queryByText('Invalid credentials')).not.toBeInTheDocument()
    })
  })

  it('should have required email and password fields', () => {
    render(<LoginPage />)

    expect(screen.getByLabelText(/email address/i)).toBeRequired()
    expect(screen.getByLabelText(/password/i)).toBeRequired()
  })

  it('should have email type for email input', () => {
    render(<LoginPage />)

    expect(screen.getByLabelText(/email address/i)).toHaveAttribute('type', 'email')
  })

  it('should have password type for password input', () => {
    render(<LoginPage />)

    expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password')
  })
})
