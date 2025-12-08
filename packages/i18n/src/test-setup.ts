// packages/i18n/src/test-setup.ts

import { vi } from 'vitest';

/**
 * Test setup for HyperFixi i18n package
 */

// Mock browser APIs for Node.js environment
Object.defineProperty(globalThis, 'navigator', {
  value: {
    language: 'en-US',
    languages: ['en-US', 'en', 'fr'],
    userLanguage: 'en-US',
  },
  writable: true,
});

Object.defineProperty(globalThis, 'window', {
  value: {
    location: {
      href: 'http://localhost:3000',
      search: '',
    },
    history: {
      replaceState: vi.fn(),
    },
    localStorage: {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
  writable: true,
});

Object.defineProperty(globalThis, 'document', {
  value: {
    documentElement: {
      lang: 'en',
      dir: 'ltr',
    },
    title: 'Test Page',
    cookie: '',
    querySelectorAll: vi.fn(() => []),
    createElement: vi.fn((tag: string) => ({
      tagName: tag.toUpperCase(),
      className: '',
      dataset: {},
      getAttribute: vi.fn(),
      setAttribute: vi.fn(),
      appendChild: vi.fn(),
      addEventListener: vi.fn(),
      textContent: '',
      value: '',
      selected: false,
    })),
  },
  writable: true,
});

// Mock performance API
Object.defineProperty(globalThis, 'performance', {
  value: {
    now: () => Date.now(),
  },
  writable: true,
});

// Mock Intl APIs for consistent testing
const mockNumberFormat = {
  format: (value: number) => value.toLocaleString('en-US'),
};

const mockDateFormat = {
  format: (date: Date) => date.toLocaleDateString('en-US'),
};

const mockRelativeTimeFormat = {
  format: (value: number, unit: string) => `${value} ${unit}${Math.abs(value) !== 1 ? 's' : ''} ago`,
};

const mockListFormat = {
  format: (items: string[]) => {
    if (items.length <= 1) return items[0] || '';
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
  },
};

Object.defineProperty(globalThis, 'Intl', {
  value: {
    NumberFormat: vi.fn(() => mockNumberFormat),
    DateTimeFormat: vi.fn(() => mockDateFormat),
    RelativeTimeFormat: vi.fn(() => mockRelativeTimeFormat),
    ListFormat: vi.fn(() => mockListFormat),
  },
  writable: true,
});

// Helper function to reset mocks between tests
export function resetMocks() {
  vi.clearAllMocks();
  
  // Reset DOM state
  if (typeof document !== 'undefined') {
    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';
    document.title = 'Test Page';
    document.cookie = '';
  }
  
  // Reset localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.getItem = vi.fn();
    window.localStorage.setItem = vi.fn();
    window.localStorage.removeItem = vi.fn();
  }
}

// Mock node-html-parser for plugin tests
vi.mock('node-html-parser', () => ({
  parse: vi.fn((html: string) => ({
    toString: () => html,
    querySelectorAll: vi.fn(() => []),
  })),
}));