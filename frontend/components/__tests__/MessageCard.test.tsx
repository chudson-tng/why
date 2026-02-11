import { render, screen } from '@testing-library/react'
import MessageCard from '../MessageCard'
import { Message } from '@/lib/types'

describe('MessageCard', () => {
  const mockMessage: Message = {
    id: '1',
    user_id: 'user-1',
    content: 'This is a test message',
    media_urls: [],
    created_at: '2024-01-01T12:00:00Z',
    updated_at: '2024-01-01T12:00:00Z'
  }

  it('should render message content', () => {
    render(<MessageCard message={mockMessage} />)
    expect(screen.getByText('This is a test message')).toBeInTheDocument()
  })

  it('should render formatted date', () => {
    const { container } = render(<MessageCard message={mockMessage} />)
    // Check that date is rendered (format may vary by locale)
    const dateElement = container.querySelector('.text-sm.text-gray-500')
    expect(dateElement).toBeInTheDocument()
    expect(dateElement?.textContent).toContain('2024')
  })

  it('should render link to message detail page', () => {
    render(<MessageCard message={mockMessage} />)
    const link = screen.getByRole('link', { name: /view replies/i })
    expect(link).toHaveAttribute('href', '/messages/1')
  })

  it('should render images when media_urls contains image URLs', () => {
    const messageWithImages: Message = {
      ...mockMessage,
      media_urls: ['http://example.com/image.jpg', 'http://example.com/photo.png']
    }

    render(<MessageCard message={messageWithImages} />)
    const images = screen.getAllByRole('img')
    expect(images).toHaveLength(2)
    expect(images[0]).toHaveAttribute('src', 'http://example.com/image.jpg')
    expect(images[1]).toHaveAttribute('src', 'http://example.com/photo.png')
  })

  it('should render videos when media_urls contains video URLs', () => {
    const messageWithVideo: Message = {
      ...mockMessage,
      media_urls: ['http://example.com/video.mp4']
    }

    const { container } = render(<MessageCard message={messageWithVideo} />)
    const video = container.querySelector('video')
    expect(video).toBeInTheDocument()
    expect(video).toHaveAttribute('src', 'http://example.com/video.mp4')
  })

  it('should render mixed media types', () => {
    const messageWithMixed: Message = {
      ...mockMessage,
      media_urls: ['http://example.com/image.jpg', 'http://example.com/video.mp4']
    }

    const { container } = render(<MessageCard message={messageWithMixed} />)
    expect(screen.getByRole('img')).toBeInTheDocument()
    expect(container.querySelector('video')).toBeInTheDocument()
  })

  it('should not render media section when no media_urls', () => {
    const { container } = render(<MessageCard message={mockMessage} />)
    expect(container.querySelector('.grid')).not.toBeInTheDocument()
  })

  it('should not render media section when media_urls is empty array', () => {
    const messageNoMedia: Message = {
      ...mockMessage,
      media_urls: []
    }

    const { container } = render(<MessageCard message={messageNoMedia} />)
    expect(container.querySelector('.grid')).not.toBeInTheDocument()
  })
})
