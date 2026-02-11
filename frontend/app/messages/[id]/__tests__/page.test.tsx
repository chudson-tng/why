import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MessageDetailPage from '../page'
import * as auth from '@/lib/auth'
import * as api from '@/lib/api'
import { useRouter, useParams } from 'next/navigation'

jest.mock('@/lib/auth')
jest.mock('@/lib/api')
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn()
}))

describe('MessageDetailPage', () => {
  const mockPush = jest.fn()
  const mockMessageId = 'message-123'

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    ;(useParams as jest.Mock).mockReturnValue({ id: mockMessageId })
  })

  it('should redirect to login if not authenticated', () => {
    ;(auth.isAuthenticated as jest.Mock).mockReturnValue(false)

    render(<MessageDetailPage />)

    expect(mockPush).toHaveBeenCalledWith('/login')
  })

  it('should show loading state initially', () => {
    ;(auth.isAuthenticated as jest.Mock).mockReturnValue(true)
    ;(api.getMessage as jest.Mock).mockImplementation(() => new Promise(() => {}))
    ;(api.listReplies as jest.Mock).mockImplementation(() => new Promise(() => {}))

    render(<MessageDetailPage />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('should load and display message and replies', async () => {
    ;(auth.isAuthenticated as jest.Mock).mockReturnValue(true)
    ;(api.getMessage as jest.Mock).mockResolvedValue({
      id: mockMessageId,
      user_id: 'user-1',
      content: 'Original message content',
      media_urls: [],
      created_at: '2024-01-01T12:00:00Z',
      updated_at: '2024-01-01T12:00:00Z'
    })
    ;(api.listReplies as jest.Mock).mockResolvedValue([
      {
        id: 'reply-1',
        message_id: mockMessageId,
        user_id: 'user-2',
        content: 'First reply',
        media_urls: [],
        created_at: '2024-01-01T13:00:00Z',
        updated_at: '2024-01-01T13:00:00Z'
      }
    ])

    render(<MessageDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Original message content')).toBeInTheDocument()
      expect(screen.getByText('First reply')).toBeInTheDocument()
    })
  })

  it('should display back to messages link', async () => {
    ;(auth.isAuthenticated as jest.Mock).mockReturnValue(true)
    ;(api.getMessage as jest.Mock).mockResolvedValue({
      id: mockMessageId,
      user_id: 'user-1',
      content: 'Test message',
      media_urls: [],
      created_at: '2024-01-01T12:00:00Z',
      updated_at: '2024-01-01T12:00:00Z'
    })
    ;(api.listReplies as jest.Mock).mockResolvedValue([])

    render(<MessageDetailPage />)

    await waitFor(() => {
      const backLink = screen.getAllByRole('link', { name: /back to messages/i })[0]
      expect(backLink).toBeInTheDocument()
      expect(backLink).toHaveAttribute('href', '/messages')
    })
  })

  it('should display empty state when no replies', async () => {
    ;(auth.isAuthenticated as jest.Mock).mockReturnValue(true)
    ;(api.getMessage as jest.Mock).mockResolvedValue({
      id: mockMessageId,
      user_id: 'user-1',
      content: 'Message without replies',
      media_urls: [],
      created_at: '2024-01-01T12:00:00Z',
      updated_at: '2024-01-01T12:00:00Z'
    })
    ;(api.listReplies as jest.Mock).mockResolvedValue([])

    render(<MessageDetailPage />)

    await waitFor(() => {
      expect(screen.getByText(/no replies yet/i)).toBeInTheDocument()
      expect(screen.getByText(/be the first to reply/i)).toBeInTheDocument()
    })
  })

  it('should display error when message load fails', async () => {
    ;(auth.isAuthenticated as jest.Mock).mockReturnValue(true)
    ;(api.getMessage as jest.Mock).mockRejectedValue(new Error('Failed to load message'))
    ;(api.listReplies as jest.Mock).mockResolvedValue([])

    render(<MessageDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load message')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /back to messages/i })).toBeInTheDocument()
    })
  })

  it('should display message not found when message is null', async () => {
    ;(auth.isAuthenticated as jest.Mock).mockReturnValue(true)
    ;(api.getMessage as jest.Mock).mockResolvedValue(null)
    ;(api.listReplies as jest.Mock).mockResolvedValue([])

    render(<MessageDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('Message not found')).toBeInTheDocument()
    })
  })

  it('should render ReplyForm component', async () => {
    ;(auth.isAuthenticated as jest.Mock).mockReturnValue(true)
    ;(api.getMessage as jest.Mock).mockResolvedValue({
      id: mockMessageId,
      user_id: 'user-1',
      content: 'Test message',
      media_urls: [],
      created_at: '2024-01-01T12:00:00Z',
      updated_at: '2024-01-01T12:00:00Z'
    })
    ;(api.listReplies as jest.Mock).mockResolvedValue([])

    render(<MessageDetailPage />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Write a reply...')).toBeInTheDocument()
    })
  })

  it('should display message with images', async () => {
    ;(auth.isAuthenticated as jest.Mock).mockReturnValue(true)
    ;(api.getMessage as jest.Mock).mockResolvedValue({
      id: mockMessageId,
      user_id: 'user-1',
      content: 'Message with image',
      media_urls: ['http://example.com/image.jpg'],
      created_at: '2024-01-01T12:00:00Z',
      updated_at: '2024-01-01T12:00:00Z'
    })
    ;(api.listReplies as jest.Mock).mockResolvedValue([])

    render(<MessageDetailPage />)

    await waitFor(() => {
      expect(screen.getByRole('img', { name: /media 1/i })).toHaveAttribute('src', 'http://example.com/image.jpg')
    })
  })

  it('should display message with video', async () => {
    ;(auth.isAuthenticated as jest.Mock).mockReturnValue(true)
    ;(api.getMessage as jest.Mock).mockResolvedValue({
      id: mockMessageId,
      user_id: 'user-1',
      content: 'Message with video',
      media_urls: ['http://example.com/video.mp4'],
      created_at: '2024-01-01T12:00:00Z',
      updated_at: '2024-01-01T12:00:00Z'
    })
    ;(api.listReplies as jest.Mock).mockResolvedValue([])

    render(<MessageDetailPage />)

    await waitFor(() => {
      const videoElement = document.querySelector('video')
      expect(videoElement).toBeInTheDocument()
      expect(videoElement).toHaveAttribute('src', 'http://example.com/video.mp4')
    })
  })

  it('should display replies with media', async () => {
    ;(auth.isAuthenticated as jest.Mock).mockReturnValue(true)
    ;(api.getMessage as jest.Mock).mockResolvedValue({
      id: mockMessageId,
      user_id: 'user-1',
      content: 'Test message',
      media_urls: [],
      created_at: '2024-01-01T12:00:00Z',
      updated_at: '2024-01-01T12:00:00Z'
    })
    ;(api.listReplies as jest.Mock).mockResolvedValue([
      {
        id: 'reply-1',
        message_id: mockMessageId,
        user_id: 'user-2',
        content: 'Reply with image',
        media_urls: ['http://example.com/reply-image.jpg'],
        created_at: '2024-01-01T13:00:00Z',
        updated_at: '2024-01-01T13:00:00Z'
      }
    ])

    render(<MessageDetailPage />)

    await waitFor(() => {
      expect(screen.getByRole('img', { name: /media 1/i })).toHaveAttribute('src', 'http://example.com/reply-image.jpg')
    })
  })

  it('should reload message and replies after successful reply', async () => {
    const user = userEvent.setup()
    let repliesCallCount = 0

    ;(auth.isAuthenticated as jest.Mock).mockReturnValue(true)
    ;(api.getMessage as jest.Mock).mockResolvedValue({
      id: mockMessageId,
      user_id: 'user-1',
      content: 'Test message',
      media_urls: [],
      created_at: '2024-01-01T12:00:00Z',
      updated_at: '2024-01-01T12:00:00Z'
    })
    ;(api.listReplies as jest.Mock).mockImplementation(() => {
      repliesCallCount++
      if (repliesCallCount === 1) {
        return Promise.resolve([])
      }
      return Promise.resolve([
        {
          id: 'reply-1',
          message_id: mockMessageId,
          user_id: 'user-2',
          content: 'New reply',
          media_urls: [],
          created_at: '2024-01-01T13:00:00Z',
          updated_at: '2024-01-01T13:00:00Z'
        }
      ])
    })
    ;(api.createReply as jest.Mock).mockResolvedValue({
      id: 'reply-1',
      message_id: mockMessageId,
      user_id: 'user-2',
      content: 'New reply',
      media_urls: [],
      created_at: '2024-01-01T13:00:00Z',
      updated_at: '2024-01-01T13:00:00Z'
    })

    render(<MessageDetailPage />)

    await waitFor(() => {
      expect(screen.getByText(/no replies yet/i)).toBeInTheDocument()
    })

    const textarea = screen.getByPlaceholderText('Write a reply...')
    await user.type(textarea, 'New reply')

    const replyButton = screen.getByRole('button', { name: /reply/i })
    await user.click(replyButton)

    await waitFor(() => {
      expect(screen.getByText('New reply')).toBeInTheDocument()
      expect(api.listReplies).toHaveBeenCalledTimes(2)
    })
  })

  it('should handle null replies response', async () => {
    ;(auth.isAuthenticated as jest.Mock).mockReturnValue(true)
    ;(api.getMessage as jest.Mock).mockResolvedValue({
      id: mockMessageId,
      user_id: 'user-1',
      content: 'Test message',
      media_urls: [],
      created_at: '2024-01-01T12:00:00Z',
      updated_at: '2024-01-01T12:00:00Z'
    })
    ;(api.listReplies as jest.Mock).mockResolvedValue(null)

    render(<MessageDetailPage />)

    await waitFor(() => {
      expect(screen.getByText(/no replies yet/i)).toBeInTheDocument()
    })
  })

  it('should format dates correctly', async () => {
    ;(auth.isAuthenticated as jest.Mock).mockReturnValue(true)
    ;(api.getMessage as jest.Mock).mockResolvedValue({
      id: mockMessageId,
      user_id: 'user-1',
      content: 'Test message',
      media_urls: [],
      created_at: '2024-01-15T14:30:00Z',
      updated_at: '2024-01-15T14:30:00Z'
    })
    ;(api.listReplies as jest.Mock).mockResolvedValue([])

    render(<MessageDetailPage />)

    await waitFor(() => {
      // Check that the date is rendered (format may vary by locale)
      expect(screen.getByText(/15.*2024/)).toBeInTheDocument()
    })
  })
})
