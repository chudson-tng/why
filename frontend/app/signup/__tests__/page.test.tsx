import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SignupPage from '../page'
import * as auth from '@/lib/auth'
import { useRouter } from 'next/navigation'

jest.mock('@/lib/auth')
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}))

describe('SignupPage', () => {
  const mockPush = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('should render signup form', () => {
    render(<SignupPage />)

    expect(screen.getByRole('heading', { name: /why/i })).toBeInTheDocument()
    expect(screen.getByText(/create your account/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument()
  })

  it('should render link to login page', () => {
    render(<SignupPage />)
    const loginLink = screen.getByRole('link', { name: /log in/i })
    expect(loginLink).toBeInTheDocument()
    expect(loginLink).toHaveAttribute('href', '/login')
  })

  it('should show password requirement hint', () => {
    render(<SignupPage />)
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument()
  })

  it('should update email input', async () => {
    const user = userEvent.setup()
    render(<SignupPage />)

    const emailInput = screen.getByLabelText(/email address/i)
    await user.type(emailInput, 'newuser@example.com')

    expect(emailInput).toHaveValue('newuser@example.com')
  })

  it('should update password input', async () => {
    const user = userEvent.setup()
    render(<SignupPage />)

    const passwordInput = screen.getByLabelText(/password/i)
    await user.type(passwordInput, 'password123')

    expect(passwordInput).toHaveValue('password123')
  })

  it('should submit signup successfully', async () => {
    const user = userEvent.setup()
    ;(auth.signup as jest.Mock).mockResolvedValue({
      token: 'new-token',
      user: { id: '1', email: 'newuser@example.com' }
    })

    render(<SignupPage />)

    await user.type(screen.getByLabelText(/email address/i), 'newuser@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(auth.signup).toHaveBeenCalledWith('newuser@example.com', 'password123')
      expect(mockPush).toHaveBeenCalledWith('/messages')
    })
  })

  it('should show loading state during signup', async () => {
    const user = userEvent.setup()
    let resolvePromise: () => void
    const promise = new Promise<void>((resolve) => {
      resolvePromise = resolve
    })

    ;(auth.signup as jest.Mock).mockReturnValue(promise)

    render(<SignupPage />)

    await user.type(screen.getByLabelText(/email address/i), 'newuser@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    expect(screen.getByRole('button', { name: /creating account/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /creating account/i })).toBeDisabled()

    // Clean up - resolve the promise to prevent it from interfering with other tests
    await act(async () => {
      resolvePromise!()
      await promise
    })
  })

  it('should display error message on signup failure', async () => {
    const user = userEvent.setup()
    ;(auth.signup as jest.Mock).mockRejectedValue(new Error('Email already exists'))

    render(<SignupPage />)

    await user.type(screen.getByLabelText(/email address/i), 'existing@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(screen.getByText('Email already exists')).toBeInTheDocument()
    })

    expect(mockPush).not.toHaveBeenCalled()
  })

  it('should display generic error when error has no message', async () => {
    const user = userEvent.setup()
    ;(auth.signup as jest.Mock).mockRejectedValue('Some error')

    render(<SignupPage />)

    await user.type(screen.getByLabelText(/email address/i), 'newuser@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(screen.getByText('Signup failed')).toBeInTheDocument()
    })
  })

  it('should clear error when submitting again', async () => {
    const user = userEvent.setup()
    ;(auth.signup as jest.Mock)
      .mockRejectedValueOnce(new Error('Email already exists'))
      .mockResolvedValueOnce({ token: 'new-token', user: { id: '1', email: 'newuser@example.com' } })

    render(<SignupPage />)

    await user.type(screen.getByLabelText(/email address/i), 'existing@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(screen.getByText('Email already exists')).toBeInTheDocument()
    })

    await user.clear(screen.getByLabelText(/email address/i))
    await user.type(screen.getByLabelText(/email address/i), 'newuser@example.com')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(screen.queryByText('Email already exists')).not.toBeInTheDocument()
    })
  })

  it('should have required email and password fields', () => {
    render(<SignupPage />)

    expect(screen.getByLabelText(/email address/i)).toBeRequired()
    expect(screen.getByLabelText(/password/i)).toBeRequired()
  })

  it('should have minimum length requirement for password', () => {
    render(<SignupPage />)

    const passwordInput = screen.getByLabelText(/password/i)
    expect(passwordInput).toHaveAttribute('minLength', '8')
  })

  it('should have email type for email input', () => {
    render(<SignupPage />)

    expect(screen.getByLabelText(/email address/i)).toHaveAttribute('type', 'email')
  })

  it('should have password type for password input', () => {
    render(<SignupPage />)

    expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password')
  })

  it('should have new-password autocomplete for password field', () => {
    render(<SignupPage />)

    expect(screen.getByLabelText(/password/i)).toHaveAttribute('autocomplete', 'new-password')
  })
})
