import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ReplyForm from '../ReplyForm'
import * as api from '@/lib/api'

jest.mock('@/lib/api')

describe('ReplyForm', () => {
  const mockOnSuccess = jest.fn()
  const mockMessageId = 'message-123'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render form elements', () => {
    render(<ReplyForm messageId={mockMessageId} onSuccess={mockOnSuccess} />)

    expect(screen.getByPlaceholderText('Write a reply...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reply/i })).toBeInTheDocument()

    const fileInput = document.querySelector('input[type="file"]')
    expect(fileInput).toBeInTheDocument()
  })

  it('should update textarea value on input', async () => {
    const user = userEvent.setup()
    render(<ReplyForm messageId={mockMessageId} onSuccess={mockOnSuccess} />)

    const textarea = screen.getByPlaceholderText('Write a reply...')
    await user.type(textarea, 'New reply content')

    expect(textarea).toHaveValue('New reply content')
  })

  it('should disable submit button when content is empty', () => {
    render(<ReplyForm messageId={mockMessageId} onSuccess={mockOnSuccess} />)

    const submitButton = screen.getByRole('button', { name: /reply/i })
    expect(submitButton).toBeDisabled()
  })

  it('should enable submit button when content is not empty', async () => {
    const user = userEvent.setup()
    render(<ReplyForm messageId={mockMessageId} onSuccess={mockOnSuccess} />)

    const textarea = screen.getByPlaceholderText('Write a reply...')
    await user.type(textarea, 'New reply')

    const submitButton = screen.getByRole('button', { name: /reply/i })
    expect(submitButton).not.toBeDisabled()
  })

  it('should submit reply successfully without media', async () => {
    const user = userEvent.setup()
    ;(api.createReply as jest.Mock).mockResolvedValue({
      id: '1',
      message_id: mockMessageId,
      content: 'New reply',
      user_id: '1',
      media_urls: [],
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    })

    render(<ReplyForm messageId={mockMessageId} onSuccess={mockOnSuccess} />)

    const textarea = screen.getByPlaceholderText('Write a reply...')
    await user.type(textarea, 'New reply')

    const submitButton = screen.getByRole('button', { name: /reply/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(api.createReply).toHaveBeenCalledWith(mockMessageId, 'New reply', [])
      expect(mockOnSuccess).toHaveBeenCalled()
    })
  })

  it('should submit reply with uploaded media', async () => {
    const user = userEvent.setup()
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

    ;(api.uploadMedia as jest.Mock).mockResolvedValue('http://example.com/test.jpg')
    ;(api.createReply as jest.Mock).mockResolvedValue({
      id: '1',
      message_id: mockMessageId,
      content: 'Reply with image',
      user_id: '1',
      media_urls: ['http://example.com/test.jpg'],
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    })

    render(<ReplyForm messageId={mockMessageId} onSuccess={mockOnSuccess} />)

    const textarea = screen.getByPlaceholderText('Write a reply...')
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

    await user.type(textarea, 'Reply with image')
    await user.upload(fileInput, mockFile)

    expect(screen.getByText('1 file(s) selected')).toBeInTheDocument()

    const submitButton = screen.getByRole('button', { name: /reply/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(api.uploadMedia).toHaveBeenCalledWith(mockFile)
      expect(api.createReply).toHaveBeenCalledWith(mockMessageId, 'Reply with image', ['http://example.com/test.jpg'])
      expect(mockOnSuccess).toHaveBeenCalled()
    })
  })

  it('should show loading state during submission', async () => {
    const user = userEvent.setup()
    ;(api.createReply as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    )

    render(<ReplyForm messageId={mockMessageId} onSuccess={mockOnSuccess} />)

    const textarea = screen.getByPlaceholderText('Write a reply...')
    await user.type(textarea, 'New reply')

    const submitButton = screen.getByRole('button', { name: /reply/i })
    await user.click(submitButton)

    expect(screen.getByRole('button', { name: /replying/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /replying/i })).toBeDisabled()
  })

  it('should display error message on submission failure', async () => {
    const user = userEvent.setup()
    ;(api.createReply as jest.Mock).mockRejectedValue(new Error('Failed to post reply'))

    render(<ReplyForm messageId={mockMessageId} onSuccess={mockOnSuccess} />)

    const textarea = screen.getByPlaceholderText('Write a reply...')
    await user.type(textarea, 'New reply')

    const submitButton = screen.getByRole('button', { name: /reply/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Failed to post reply')).toBeInTheDocument()
    })

    expect(mockOnSuccess).not.toHaveBeenCalled()
  })

  it('should clear form after successful submission', async () => {
    const user = userEvent.setup()
    ;(api.createReply as jest.Mock).mockResolvedValue({
      id: '1',
      message_id: mockMessageId,
      content: 'New reply',
      user_id: '1',
      media_urls: [],
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    })

    render(<ReplyForm messageId={mockMessageId} onSuccess={mockOnSuccess} />)

    const textarea = screen.getByPlaceholderText('Write a reply...')
    await user.type(textarea, 'New reply')

    const submitButton = screen.getByRole('button', { name: /reply/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(textarea).toHaveValue('')
    })
  })

  it('should not submit when content is only whitespace', async () => {
    const user = userEvent.setup()
    render(<ReplyForm messageId={mockMessageId} onSuccess={mockOnSuccess} />)

    const textarea = screen.getByPlaceholderText('Write a reply...')
    await user.type(textarea, '   ')

    const submitButton = screen.getByRole('button', { name: /reply/i })
    expect(submitButton).toBeDisabled()
  })

  it('should handle multiple file uploads', async () => {
    const user = userEvent.setup()
    const mockFiles = [
      new File(['test1'], 'test1.jpg', { type: 'image/jpeg' }),
      new File(['test2'], 'test2.png', { type: 'image/png' })
    ]

    ;(api.uploadMedia as jest.Mock)
      .mockResolvedValueOnce('http://example.com/test1.jpg')
      .mockResolvedValueOnce('http://example.com/test2.png')
    ;(api.createReply as jest.Mock).mockResolvedValue({
      id: '1',
      message_id: mockMessageId,
      content: 'Reply with images',
      user_id: '1',
      media_urls: ['http://example.com/test1.jpg', 'http://example.com/test2.png'],
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    })

    render(<ReplyForm messageId={mockMessageId} onSuccess={mockOnSuccess} />)

    const textarea = screen.getByPlaceholderText('Write a reply...')
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

    await user.type(textarea, 'Reply with images')
    await user.upload(fileInput, mockFiles)

    expect(screen.getByText('2 file(s) selected')).toBeInTheDocument()

    const submitButton = screen.getByRole('button', { name: /reply/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(api.uploadMedia).toHaveBeenCalledTimes(2)
      expect(api.createReply).toHaveBeenCalledWith(mockMessageId, 'Reply with images', [
        'http://example.com/test1.jpg',
        'http://example.com/test2.png'
      ])
    })
  })

  it('should pass correct messageId to API', async () => {
    const user = userEvent.setup()
    const customMessageId = 'custom-message-id'

    ;(api.createReply as jest.Mock).mockResolvedValue({
      id: '1',
      message_id: customMessageId,
      content: 'Test reply',
      user_id: '1',
      media_urls: [],
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    })

    render(<ReplyForm messageId={customMessageId} onSuccess={mockOnSuccess} />)

    const textarea = screen.getByPlaceholderText('Write a reply...')
    await user.type(textarea, 'Test reply')

    const submitButton = screen.getByRole('button', { name: /reply/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(api.createReply).toHaveBeenCalledWith(customMessageId, 'Test reply', [])
    })
  })
})
