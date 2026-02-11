import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MessagesPage from '../page'
import * as auth from '@/lib/auth'
import * as api from '@/lib/api'
import { useRouter } from 'next/navigation'

jest.mock('@/lib/auth')
jest.mock('@/lib/api')
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}))

describe('MessagesPage', () => {
  const mockPush = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('should redirect to login if not authenticated', () => {
    ;(auth.isAuthenticated as jest.Mock).mockReturnValue(false)

    render(<MessagesPage />)

    expect(mockPush).toHaveBeenCalledWith('/login')
  })

  it('should show loading state initially', () => {
    ;(auth.isAuthenticated as jest.Mock).mockReturnValue(true)
    ;(api.listMessages as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )

    render(<MessagesPage />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('should load and display messages', async () => {
    ;(auth.isAuthenticated as jest.Mock).mockReturnValue(true)
    ;(api.listMessages as jest.Mock).mockResolvedValue([
      {
        id: '1',
        user_id: 'user-1',
        content: 'First message',
        media_urls: [],
        created_at: '2024-01-01T12:00:00Z',
        updated_at: '2024-01-01T12:00:00Z'
      },
      {
        id: '2',
        user_id: 'user-2',
        content: 'Second message',
        media_urls: [],
        created_at: '2024-01-02T12:00:00Z',
        updated_at: '2024-01-02T12:00:00Z'
      }
    ])

    render(<MessagesPage />)

    await waitFor(() => {
      expect(screen.getByText('First message')).toBeInTheDocument()
      expect(screen.getByText('Second message')).toBeInTheDocument()
    })
  })

  it('should display empty state when no messages', async () => {
    ;(auth.isAuthenticated as jest.Mock).mockReturnValue(true)
    ;(api.listMessages as jest.Mock).mockResolvedValue([])

    render(<MessagesPage />)

    await waitFor(() => {
      expect(screen.getByText(/no messages yet/i)).toBeInTheDocument()
      expect(screen.getByText(/be the first to post/i)).toBeInTheDocument()
    })
  })

  it('should display error message on load failure', async () => {
    ;(auth.isAuthenticated as jest.Mock).mockReturnValue(true)
    ;(api.listMessages as jest.Mock).mockRejectedValue(new Error('Failed to load messages'))

    render(<MessagesPage />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load messages')).toBeInTheDocument()
    })
  })

  it('should render app header with title and logout button', async () => {
    ;(auth.isAuthenticated as jest.Mock).mockReturnValue(true)
    ;(api.listMessages as jest.Mock).mockResolvedValue([])

    render(<MessagesPage />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /why/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument()
    })
  })

  it('should render MessageForm component', async () => {
    ;(auth.isAuthenticated as jest.Mock).mockReturnValue(true)
    ;(api.listMessages as jest.Mock).mockResolvedValue([])

    render(<MessagesPage />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText("What's on your mind?")).toBeInTheDocument()
    })
  })

  it('should handle logout and redirect to home', async () => {
    const user = userEvent.setup()
    ;(auth.isAuthenticated as jest.Mock).mockReturnValue(true)
    ;(api.listMessages as jest.Mock).mockResolvedValue([])

    render(<MessagesPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument()
    })

    const logoutButton = screen.getByRole('button', { name: /log out/i })
    await user.click(logoutButton)

    expect(auth.logout).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('should handle null messages response', async () => {
    ;(auth.isAuthenticated as jest.Mock).mockReturnValue(true)
    ;(api.listMessages as jest.Mock).mockResolvedValue(null)

    render(<MessagesPage />)

    await waitFor(() => {
      expect(screen.getByText(/no messages yet/i)).toBeInTheDocument()
    })
  })

  it('should reload messages after successful message creation', async () => {
    const user = userEvent.setup()
    let callCount = 0

    ;(auth.isAuthenticated as jest.Mock).mockReturnValue(true)
    ;(api.listMessages as jest.Mock).mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve([])
      }
      return Promise.resolve([
        {
          id: '1',
          user_id: 'user-1',
          content: 'New message',
          media_urls: [],
          created_at: '2024-01-01T12:00:00Z',
          updated_at: '2024-01-01T12:00:00Z'
        }
      ])
    })
    ;(api.createMessage as jest.Mock).mockResolvedValue({
      id: '1',
      user_id: 'user-1',
      content: 'New message',
      media_urls: [],
      created_at: '2024-01-01T12:00:00Z',
      updated_at: '2024-01-01T12:00:00Z'
    })

    render(<MessagesPage />)

    await waitFor(() => {
      expect(screen.getByText(/no messages yet/i)).toBeInTheDocument()
    })

    const textarea = screen.getByPlaceholderText("What's on your mind?")
    await user.type(textarea, 'New message')

    const postButton = screen.getByRole('button', { name: /post/i })
    await user.click(postButton)

    await waitFor(() => {
      expect(screen.getByText('New message')).toBeInTheDocument()
      expect(api.listMessages).toHaveBeenCalledTimes(2)
    })
  })

  it('should display generic error message when error has no message', async () => {
    ;(auth.isAuthenticated as jest.Mock).mockReturnValue(true)
    ;(api.listMessages as jest.Mock).mockRejectedValue('Some error')

    render(<MessagesPage />)

    await waitFor(() => {
      expect(screen.getByText(/failed to load messages/i)).toBeInTheDocument()
    })
  })
})
