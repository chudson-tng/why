import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MessageForm from '../MessageForm'
import * as api from '@/lib/api'

jest.mock('@/lib/api')

describe('MessageForm', () => {
  const mockOnSuccess = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render form elements', () => {
    render(<MessageForm onSuccess={mockOnSuccess} />)

    expect(screen.getByPlaceholderText("What's on your mind?")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /post/i })).toBeInTheDocument()

    const fileInput = document.querySelector('input[type="file"]')
    expect(fileInput).toBeInTheDocument()
  })

  it('should update textarea value on input', async () => {
    const user = userEvent.setup()
    render(<MessageForm onSuccess={mockOnSuccess} />)

    const textarea = screen.getByPlaceholderText("What's on your mind?")
    await user.type(textarea, 'New message content')

    expect(textarea).toHaveValue('New message content')
  })

  it('should disable submit button when content is empty', () => {
    render(<MessageForm onSuccess={mockOnSuccess} />)

    const submitButton = screen.getByRole('button', { name: /post/i })
    expect(submitButton).toBeDisabled()
  })

  it('should enable submit button when content is not empty', async () => {
    const user = userEvent.setup()
    render(<MessageForm onSuccess={mockOnSuccess} />)

    const textarea = screen.getByPlaceholderText("What's on your mind?")
    await user.type(textarea, 'New message')

    const submitButton = screen.getByRole('button', { name: /post/i })
    expect(submitButton).not.toBeDisabled()
  })

  it('should submit message successfully without media', async () => {
    const user = userEvent.setup()
    ;(api.createMessage as jest.Mock).mockResolvedValue({
      id: '1',
      content: 'New message',
      user_id: '1',
      media_urls: [],
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    })

    render(<MessageForm onSuccess={mockOnSuccess} />)

    const textarea = screen.getByPlaceholderText("What's on your mind?")
    await user.type(textarea, 'New message')

    const submitButton = screen.getByRole('button', { name: /post/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(api.createMessage).toHaveBeenCalledWith('New message', [])
      expect(mockOnSuccess).toHaveBeenCalled()
    })
  })

  it('should submit message with uploaded media', async () => {
    const user = userEvent.setup()
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

    ;(api.uploadMedia as jest.Mock).mockResolvedValue('http://example.com/test.jpg')
    ;(api.createMessage as jest.Mock).mockResolvedValue({
      id: '1',
      content: 'New message',
      user_id: '1',
      media_urls: ['http://example.com/test.jpg'],
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    })

    render(<MessageForm onSuccess={mockOnSuccess} />)

    const textarea = screen.getByPlaceholderText("What's on your mind?")
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

    await user.type(textarea, 'New message with image')
    await user.upload(fileInput, mockFile)

    expect(screen.getByText('1 file(s) selected')).toBeInTheDocument()

    const submitButton = screen.getByRole('button', { name: /post/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(api.uploadMedia).toHaveBeenCalledWith(mockFile)
      expect(api.createMessage).toHaveBeenCalledWith('New message with image', ['http://example.com/test.jpg'])
      expect(mockOnSuccess).toHaveBeenCalled()
    })
  })

  it('should show loading state during submission', async () => {
    const user = userEvent.setup()
    let resolvePromise: () => void
    const promise = new Promise<void>((resolve) => {
      resolvePromise = resolve
    })

    ;(api.createMessage as jest.Mock).mockReturnValue(promise)

    render(<MessageForm onSuccess={mockOnSuccess} />)

    const textarea = screen.getByPlaceholderText("What's on your mind?")
    await user.type(textarea, 'New message')

    const submitButton = screen.getByRole('button', { name: /post/i })
    await user.click(submitButton)

    expect(screen.getByRole('button', { name: /posting/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /posting/i })).toBeDisabled()

    // Clean up - resolve the promise to prevent it from interfering with other tests
    resolvePromise!()
    await promise
  })

  it('should display error message on submission failure', async () => {
    const user = userEvent.setup()
    ;(api.createMessage as jest.Mock).mockRejectedValue(new Error('Failed to create message'))

    render(<MessageForm onSuccess={mockOnSuccess} />)

    const textarea = screen.getByPlaceholderText("What's on your mind?")
    await user.type(textarea, 'New message')

    const submitButton = screen.getByRole('button', { name: /post/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Failed to create message')).toBeInTheDocument()
    })

    expect(mockOnSuccess).not.toHaveBeenCalled()
  })

  it('should clear form after successful submission', async () => {
    const user = userEvent.setup()
    ;(api.createMessage as jest.Mock).mockResolvedValue({
      id: '1',
      content: 'New message',
      user_id: '1',
      media_urls: [],
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    })

    render(<MessageForm onSuccess={mockOnSuccess} />)

    const textarea = screen.getByPlaceholderText("What's on your mind?")
    await user.type(textarea, 'New message')

    const submitButton = screen.getByRole('button', { name: /post/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(textarea).toHaveValue('')
    })
  })

  it('should not submit when content is only whitespace', async () => {
    const user = userEvent.setup()
    render(<MessageForm onSuccess={mockOnSuccess} />)

    const textarea = screen.getByPlaceholderText("What's on your mind?")
    await user.type(textarea, '   ')

    const submitButton = screen.getByRole('button', { name: /post/i })
    expect(submitButton).toBeDisabled()
  })

  it('should handle multiple file uploads', async () => {
    const user = userEvent.setup()
    const mockFiles = [
      new File(['test1'], 'test1.jpg', { type: 'image/jpeg' }),
      new File(['test2'], 'test2.jpg', { type: 'image/jpeg' })
    ]

    ;(api.uploadMedia as jest.Mock)
      .mockResolvedValueOnce('http://example.com/test1.jpg')
      .mockResolvedValueOnce('http://example.com/test2.jpg')
    ;(api.createMessage as jest.Mock).mockResolvedValue({
      id: '1',
      content: 'New message',
      user_id: '1',
      media_urls: ['http://example.com/test1.jpg', 'http://example.com/test2.jpg'],
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    })

    render(<MessageForm onSuccess={mockOnSuccess} />)

    const textarea = screen.getByPlaceholderText("What's on your mind?")
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

    await user.type(textarea, 'New message')
    await user.upload(fileInput, mockFiles)

    expect(screen.getByText('2 file(s) selected')).toBeInTheDocument()

    const submitButton = screen.getByRole('button', { name: /post/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(api.uploadMedia).toHaveBeenCalledTimes(2)
      expect(api.createMessage).toHaveBeenCalledWith('New message', [
        'http://example.com/test1.jpg',
        'http://example.com/test2.jpg'
      ])
    })
  })
})
