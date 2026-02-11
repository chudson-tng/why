import '@testing-library/jest-dom'

// Mock localStorage
class LocalStorageMock {
  constructor() {
    this.store = {}
  }

  clear() {
    this.store = {}
  }

  getItem(key) {
    return this.store[key] || null
  }

  setItem(key, value) {
    this.store[key] = String(value)
  }

  removeItem(key) {
    delete this.store[key]
  }

  get length() {
    return Object.keys(this.store).length
  }

  key(index) {
    const keys = Object.keys(this.store)
    return keys[index] || null
  }
}

global.localStorage = new LocalStorageMock()

// Spy on localStorage methods
beforeEach(() => {
  jest.spyOn(global.localStorage, 'getItem')
  jest.spyOn(global.localStorage, 'setItem')
  jest.spyOn(global.localStorage, 'removeItem')
  jest.spyOn(global.localStorage, 'clear')
})

// Clean up after each test
afterEach(() => {
  global.localStorage.clear()
  jest.restoreAllMocks()
})
