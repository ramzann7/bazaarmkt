import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

// Configure testing library
configure({ testIdAttribute: 'data-testid' });

// Mock environment variables
process.env.REACT_APP_API_URL = 'http://localhost:4000/api';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock fetch
global.fetch = jest.fn();

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock scrollTo
global.scrollTo = jest.fn();

// Setup test utilities
global.testUtils = {
  // Mock API responses
  mockApiResponse: (data, status = 200) => {
    fetch.mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      json: async () => data,
    });
  },

  // Mock API error
  mockApiError: (message = 'API Error', status = 500) => {
    fetch.mockRejectedValueOnce(new Error(message));
  },

  // Create mock product data
  createMockProduct: (overrides = {}) => ({
    _id: 'test-product-id',
    name: 'Test Product',
    description: 'Test Description',
    price: 15.99,
    category: 'food_beverages',
    subcategory: 'baked_goods',
    productType: 'ready_to_ship',
    stock: 10,
    unit: 'piece',
    artisan: {
      _id: 'test-artisan-id',
      artisanName: 'Test Artisan',
      businessName: 'Test Business'
    },
    ...overrides
  }),

  // Create mock user data
  createMockUser: (overrides = {}) => ({
    _id: 'test-user-id',
    email: 'test@bazaarmkt.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'artisan',
    ...overrides
  }),

  // Create mock artisan data
  createMockArtisan: (overrides = {}) => ({
    _id: 'test-artisan-id',
    artisanName: 'Test Artisan',
    businessName: 'Test Business',
    type: 'individual',
    user: 'test-user-id',
    ...overrides
  }),

  // Wait for async operations
  waitFor: (ms = 0) => new Promise(resolve => setTimeout(resolve, ms)),

  // Clear all mocks
  clearAllMocks: () => {
    fetch.mockClear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
  }
};

// Cleanup after each test
afterEach(() => {
  global.testUtils.clearAllMocks();
});
