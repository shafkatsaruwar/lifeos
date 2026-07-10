import '@testing-library/jest-dom'

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  getClientAuth: jest.fn(),
  signInWithGoogle: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn((auth, callback) => {
    // Mock callback immediately
    callback(null)
    return jest.fn() // unsubscribe function
  }),
  getRedirectResult: jest.fn(),
  getClientDatabase: jest.fn(),
}))

// Mock dataSync
jest.mock('@/lib/dataSync', () => ({
  syncDataToFirebase: jest.fn(),
  loadDataFromFirebase: jest.fn(),
  setUserId: jest.fn(),
  getUserId: jest.fn(),
}))

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

// Suppress console errors in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})
