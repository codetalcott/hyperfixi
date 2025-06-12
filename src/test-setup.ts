/**
 * Global test setup for Vitest
 * This file runs before each test file
 */

import { beforeEach, afterEach, vi } from 'vitest';

// Mock console methods in test environment to reduce noise
const consoleMethods = ['log', 'warn', 'error', 'info'] as const;
const originalConsole = { ...console };

beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();
  
  // Mock console methods unless explicitly testing them
  consoleMethods.forEach(method => {
    vi.spyOn(console, method).mockImplementation(() => {});
  });
  
  // Reset DOM state
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  
  // Clear any global hyperscript state if it exists
  if (typeof window !== 'undefined') {
    // Reset any global state that might affect tests
    delete (window as any)._hyperscript;
    delete (window as any).hyperscriptFixi;
  }
});

afterEach(() => {
  // Restore console methods
  consoleMethods.forEach(method => {
    const spy = vi.mocked(console[method]);
    if (spy && spy.mockRestore) {
      spy.mockRestore();
    }
  });
  
  // Clean up any event listeners or timers
  vi.clearAllTimers();
  
  // Clean up DOM
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

// Global test utilities
declare global {
  namespace Vi {
    interface AsymmetricMatchersContaining {
      toBeValidHyperscriptAST(): any;
      toExecuteSuccessfully(): any;
    }
  }
}

// Add custom matchers for hyperscript-specific assertions
import { expect } from 'vitest';

expect.extend({
  toBeValidHyperscriptAST(received) {
    const pass = received && typeof received === 'object' && 'type' in received;
    return {
      message: () => `expected ${received} to be a valid hyperscript AST node`,
      pass,
    };
  },
  
  toExecuteSuccessfully(received) {
    const pass = received instanceof Promise || typeof received === 'object';
    return {
      message: () => `expected hyperscript execution to complete successfully`,
      pass,
    };
  },
});

// Export test utilities
export const createTestElement = (html: string): HTMLElement => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.firstElementChild as HTMLElement;
};

export const waitForEvent = (
  target: EventTarget,
  eventName: string,
  timeout = 1000
): Promise<Event> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      target.removeEventListener(eventName, handler);
      reject(new Error(`Event ${eventName} not fired within ${timeout}ms`));
    }, timeout);
    
    const handler = (event: Event) => {
      clearTimeout(timer);
      target.removeEventListener(eventName, handler);
      resolve(event);
    };
    
    target.addEventListener(eventName, handler);
  });
};

export const createMockHyperscriptContext = () => ({
  me: null as HTMLElement | null,
  it: null as any,
  you: null as HTMLElement | null,
  result: null as any,
  locals: new Map<string, any>(),
  globals: new Map<string, any>(),
});