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
// These need to work as constructors (called with `new`)
class MockNumberFormat {
  private options: Intl.NumberFormatOptions;

  constructor(_locale?: string, options?: Intl.NumberFormatOptions) {
    this.options = options || {};
  }

  format(value: number): string {
    const { style, currency, minimumFractionDigits, maximumFractionDigits } = this.options;

    if (style === 'currency' && currency) {
      const symbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£' };
      const symbol = symbols[currency] || currency;
      return `${symbol}${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    }

    if (style === 'percent') {
      return `${(value * 100).toFixed(0)}%`;
    }

    // Default decimal formatting with proper grouping
    const minFrac = minimumFractionDigits ?? 0;
    const maxFrac = maximumFractionDigits ?? 3;
    let formatted = value.toFixed(Math.max(minFrac, Math.min(maxFrac, 2)));
    // Remove trailing zeros if not required
    if (minFrac === 0 && formatted.includes('.')) {
      formatted = formatted.replace(/\.?0+$/, '');
    }
    // Add thousand separators
    const parts = formatted.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }
}

class MockDateTimeFormat {
  private options: Intl.DateTimeFormatOptions;

  constructor(_locale?: string, options?: Intl.DateTimeFormatOptions) {
    this.options = options || {};
  }

  format(date: Date | number): string {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    if (this.options.timeStyle && this.options.dateStyle) {
      return `${month}/${day}/${year}, ${hours}:${minutes}`;
    }
    if (this.options.timeStyle) {
      return `${hours}:${minutes}`;
    }
    return `${month}/${day}/${year}`;
  }
}

class MockRelativeTimeFormat {
  constructor(_locale?: string, _options?: Intl.RelativeTimeFormatOptions) {
    // Parameters unused in mock - kept for API compatibility
  }

  format(value: number, unit: Intl.RelativeTimeFormatUnit): string {
    const absValue = Math.abs(value);
    const unitStr = absValue === 1 ? unit : `${unit}s`;
    if (value < 0) {
      return `${absValue} ${unitStr} ago`;
    }
    return `in ${absValue} ${unitStr}`;
  }
}

class MockListFormat {
  constructor(_locale?: string, _options?: { style?: string; type?: string }) {}

  format(items: string[]): string {
    if (items.length <= 1) return items[0] || '';
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
  }
}

Object.defineProperty(globalThis, 'Intl', {
  value: {
    NumberFormat: MockNumberFormat,
    DateTimeFormat: MockDateTimeFormat,
    RelativeTimeFormat: MockRelativeTimeFormat,
    ListFormat: MockListFormat,
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
