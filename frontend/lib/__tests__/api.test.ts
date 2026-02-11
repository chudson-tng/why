import {
  listMessages,
  getMessage,
  createMessage,
  listReplies,
  createReply,
  uploadMedia
} from '../api'
import * as auth from '../auth'

jest.mock('../auth')

describe('API Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  describe('listMessages', () => {
    it('should fetch messages successfully', async () => {
      const mockMessages = [
        { id: '1', content: 'Test message', user_id: '1', media_urls: [], created_at: '2024-01-01', updated_at: '2024-01-01' }
      ]

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockMessages
      })

      const result = await listMessages()

      expect(global.fetch).toHaveBeenCalledWith('/api/v1/messages', {
        cache: 'no-store'
      })
      expect(result).toEqual(mockMessages)
    })

    it('should throw error on fetch failure', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false
      })

      await expect(listMessages()).rejects.toThrow('Failed to fetch messages')
    })
  })

  describe('getMessage', () => {
    it('should fetch single message successfully', async () => {
      const mockMessage = {
        id: '1',
        content: 'Test message',
        user_id: '1',
        media_urls: [],
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockMessage
      })

      const result = await getMessage('1')

      expect(global.fetch).toHaveBeenCalledWith('/api/v1/messages/1', {
        cache: 'no-store'
      })
      expect(result).toEqual(mockMessage)
    })

    it('should throw error on fetch failure', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false
      })

      await expect(getMessage('1')).rejects.toThrow('Failed to fetch message')
    })
  })

  describe('createMessage', () => {
    it('should create message successfully with auth token', async () => {
      const mockMessage = {
        id: '1',
        content: 'New message',
        user_id: '1',
        media_urls: [],
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      }

      ;(auth.getToken as jest.Mock).mockReturnValue('test-token')
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockMessage
      })

      const result = await createMessage('New message', [])

      expect(global.fetch).toHaveBeenCalledWith('/api/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({ content: 'New message', media_urls: [] })
      })
      expect(result).toEqual(mockMessage)
    })

    it('should create message with media URLs', async () => {
      const mockMessage = {
        id: '1',
        content: 'New message',
        user_id: '1',
        media_urls: ['http://example.com/image.jpg'],
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      }

      ;(auth.getToken as jest.Mock).mockReturnValue('test-token')
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockMessage
      })

      const result = await createMessage('New message', ['http://example.com/image.jpg'])

      expect(global.fetch).toHaveBeenCalledWith('/api/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({ content: 'New message', media_urls: ['http://example.com/image.jpg'] })
      })
      expect(result).toEqual(mockMessage)
    })

    it('should throw error with custom message on failure', async () => {
      ;(auth.getToken as jest.Mock).mockReturnValue('test-token')
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Content is required' })
      })

      await expect(createMessage('', [])).rejects.toThrow('Content is required')
    })

    it('should throw generic error when error message not provided', async () => {
      ;(auth.getToken as jest.Mock).mockReturnValue('test-token')
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({})
      })

      await expect(createMessage('Test', [])).rejects.toThrow('Failed to create message')
    })
  })

  describe('listReplies', () => {
    it('should fetch replies successfully', async () => {
      const mockReplies = [
        { id: '1', message_id: '1', content: 'Reply 1', user_id: '1', media_urls: [], created_at: '2024-01-01', updated_at: '2024-01-01' }
      ]

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockReplies
      })

      const result = await listReplies('1')

      expect(global.fetch).toHaveBeenCalledWith('/api/v1/messages/1/replies', {
        cache: 'no-store'
      })
      expect(result).toEqual(mockReplies)
    })

    it('should throw error on fetch failure', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false
      })

      await expect(listReplies('1')).rejects.toThrow('Failed to fetch replies')
    })
  })

  describe('createReply', () => {
    it('should create reply successfully', async () => {
      const mockReply = {
        id: '1',
        message_id: '1',
        content: 'New reply',
        user_id: '1',
        media_urls: [],
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      }

      ;(auth.getToken as jest.Mock).mockReturnValue('test-token')
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockReply
      })

      const result = await createReply('1', 'New reply', [])

      expect(global.fetch).toHaveBeenCalledWith('/api/v1/messages/1/replies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({ content: 'New reply', media_urls: [] })
      })
      expect(result).toEqual(mockReply)
    })

    it('should throw error on create failure', async () => {
      ;(auth.getToken as jest.Mock).mockReturnValue('test-token')
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Reply content required' })
      })

      await expect(createReply('1', '', [])).rejects.toThrow('Reply content required')
    })
  })

  describe('uploadMedia', () => {
    it('should upload file successfully', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const mockResponse = { url: 'http://example.com/test.jpg' }

      ;(auth.getToken as jest.Mock).mockReturnValue('test-token')
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      })

      const result = await uploadMedia(mockFile)

      expect(global.fetch).toHaveBeenCalledWith('/api/v1/media', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token'
        },
        body: expect.any(FormData)
      })
      expect(result).toBe('http://example.com/test.jpg')
    })

    it('should upload without token if not authenticated', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const mockResponse = { url: 'http://example.com/test.jpg' }

      ;(auth.getToken as jest.Mock).mockReturnValue(null)
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      })

      const result = await uploadMedia(mockFile)

      expect(global.fetch).toHaveBeenCalledWith('/api/v1/media', {
        method: 'POST',
        headers: {},
        body: expect.any(FormData)
      })
      expect(result).toBe('http://example.com/test.jpg')
    })

    it('should throw error on upload failure', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      ;(auth.getToken as jest.Mock).mockReturnValue('test-token')
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false
      })

      await expect(uploadMedia(mockFile)).rejects.toThrow('Failed to upload file')
    })
  })
})
