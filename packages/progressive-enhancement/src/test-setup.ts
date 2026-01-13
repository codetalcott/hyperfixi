/**
 * Test setup for Progressive Enhancement package
 * Configures JSDOM environment and global mocks
 */

import { vi } from 'vitest';

// Mock performance API if not available
if (!global.performance) {
  global.performance = {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn(() => []),
    getEntriesByType: vi.fn(() => []),
    clearMarks: vi.fn(),
    clearMeasures: vi.fn(),
  } as any;
}

// Mock CSS.supports if not available
if (!global.CSS) {
  global.CSS = {
    supports: vi.fn(() => true),
    escape: vi.fn((str: string) => str),
  } as any;
}

// Mock matchMedia if not available
if (!global.matchMedia) {
  global.matchMedia = vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

// Mock requestIdleCallback if not available
if (!global.requestIdleCallback) {
  global.requestIdleCallback = vi.fn(
    (callback: IdleRequestCallback, options?: IdleRequestOptions) => {
      const start = performance.now();
      return setTimeout(() => {
        callback({
          didTimeout: false,
          timeRemaining: () => Math.max(0, 50 - (performance.now() - start)),
        });
      }, 1);
    }
  );
}

// Mock cancelIdleCallback if not available
if (!global.cancelIdleCallback) {
  global.cancelIdleCallback = vi.fn((id: number) => {
    clearTimeout(id);
  });
}

// Mock IntersectionObserver if not available
if (!global.IntersectionObserver) {
  global.IntersectionObserver = vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })) as any;
}

// Mock MutationObserver if not available
if (!global.MutationObserver) {
  global.MutationObserver = vi.fn(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    takeRecords: vi.fn(() => []),
  })) as any;
}

// Mock Worker if not available
if (!global.Worker) {
  global.Worker = vi.fn(() => ({
    postMessage: vi.fn(),
    terminate: vi.fn(),
    onmessage: null,
    onerror: null,
  })) as any;
}

// Mock fetch if not available in test environment
if (!global.fetch) {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
      blob: () => Promise.resolve(new Blob()),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      headers: new Headers(),
      url: '',
      type: 'basic',
      redirected: false,
      bodyUsed: false,
      body: null,
      clone: vi.fn(),
    } as Response)
  );
}

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(global, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

// Mock navigator
if (!global.navigator) {
  Object.defineProperty(global, 'navigator', {
    value: {
      userAgent: 'Mozilla/5.0 (Test Environment)',
      language: 'en-US',
      languages: ['en-US', 'en'],
      platform: 'Test',
      serviceWorker: {
        register: vi.fn(() => Promise.resolve({})),
        ready: Promise.resolve({}),
      },
    },
    writable: true,
  });
}

// Set up DOM environment
beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();

  // Reset DOM
  document.body.innerHTML = '';
  document.head.innerHTML = '';

  // Reset storage mocks
  localStorageMock.getItem.mockReturnValue(null);
  localStorageMock.setItem.mockImplementation(() => {});
  localStorageMock.removeItem.mockImplementation(() => {});
  localStorageMock.clear.mockImplementation(() => {});

  sessionStorageMock.getItem.mockReturnValue(null);
  sessionStorageMock.setItem.mockImplementation(() => {});
  sessionStorageMock.removeItem.mockImplementation(() => {});
  sessionStorageMock.clear.mockImplementation(() => {});
});

export {};
