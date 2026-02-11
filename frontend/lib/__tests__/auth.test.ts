import { setToken, getToken, removeToken, isAuthenticated, signup, login, logout } from '../auth'

describe('Auth Utils', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  describe('Token Management', () => {
    it('should set and get token from localStorage', () => {
      setToken('test-token')
      const token = getToken()
      expect(token).toBe('test-token')
    })

    it('should return null when no token exists', () => {
      const token = getToken()
      expect(token).toBeNull()
    })

    it('should remove token from localStorage', () => {
      setToken('test-token')
      expect(getToken()).toBe('test-token')

      removeToken()
      expect(getToken()).toBeNull()
    })

    it('should check if user is authenticated', () => {
      expect(isAuthenticated()).toBe(false)

      setToken('test-token')
      expect(isAuthenticated()).toBe(true)

      removeToken()
      expect(isAuthenticated()).toBe(false)
    })
  })

  describe('signup', () => {
    it('should signup successfully and store token', async () => {
      const mockResponse = {
        token: 'new-token',
        user: { id: '1', email: 'test@example.com' }
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      })

      const result = await signup('test@example.com', 'password123')

      expect(global.fetch).toHaveBeenCalledWith('/api/v1/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
      })

      expect(getToken()).toBe('new-token')
      expect(result).toEqual(mockResponse)
    })

    it('should throw error on signup failure', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Email already exists' })
      })

      await expect(signup('test@example.com', 'password123'))
        .rejects
        .toThrow('Email already exists')
    })

    it('should throw generic error when error message not provided', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({})
      })

      await expect(signup('test@example.com', 'password123'))
        .rejects
        .toThrow('Signup failed')
    })
  })

  describe('login', () => {
    it('should login successfully and store token', async () => {
      const mockResponse = {
        token: 'login-token',
        user: { id: '1', email: 'test@example.com' }
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      })

      const result = await login('test@example.com', 'password123')

      expect(global.fetch).toHaveBeenCalledWith('/api/v1/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
      })

      expect(getToken()).toBe('login-token')
      expect(result).toEqual(mockResponse)
    })

    it('should throw error on login failure', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Invalid credentials' })
      })

      await expect(login('test@example.com', 'wrongpassword'))
        .rejects
        .toThrow('Invalid credentials')
    })
  })

  describe('logout', () => {
    it('should remove token from localStorage', () => {
      setToken('test-token')
      expect(getToken()).toBe('test-token')

      logout()
      expect(getToken()).toBeNull()
    })
  })
})
