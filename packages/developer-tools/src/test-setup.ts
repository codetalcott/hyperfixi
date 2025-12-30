/**
 * Global test setup for developer-tools package
 * This file runs before each test file
 */

import { beforeEach, afterEach, vi, expect } from 'vitest';

// Mock console methods in test environment to reduce noise
const consoleMethods = ['log', 'error', 'info', 'warn'] as const;

beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();

  // Use fake timers for server/async tests
  vi.useFakeTimers({ shouldAdvanceTime: true });

  // Mock console methods unless explicitly testing them
  consoleMethods.forEach(method => {
    if (method in console) {
      vi.spyOn(console, method).mockImplementation(() => {});
    }
  });

  // Mock process.exit to prevent test crashes
  vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
    throw new Error(`process.exit(${code})`);
  });

  // Reset process.argv
  process.argv = ['node', 'hyperfixi'];

  // Reset DOM state safely (for happy-dom)
  if (typeof document !== 'undefined') {
    if (document.head) {
      document.head.innerHTML = '';
    }
    if (document.body) {
      document.body.innerHTML = '';
    }
  }
});

afterEach(() => {
  // Restore console methods
  consoleMethods.forEach(method => {
    if (method in console) {
      const spy = vi.mocked(console[method]);
      if (spy && spy.mockRestore) {
        spy.mockRestore();
      }
    }
  });

  // Restore timers
  vi.useRealTimers();

  // Clean up any timers
  vi.clearAllTimers();

  // Clean up DOM safely
  if (typeof document !== 'undefined') {
    if (document.head) {
      document.head.innerHTML = '';
    }
    if (document.body) {
      document.body.innerHTML = '';
    }
  }
});

// Custom matchers for developer-tools tests
expect.extend({
  /**
   * Check if result is a valid AnalysisResult
   */
  toBeValidAnalysisResult(received) {
    const pass = received &&
      typeof received === 'object' &&
      'file' in received &&
      'scripts' in received &&
      'elements' in received &&
      'issues' in received;
    return {
      message: () => `expected ${JSON.stringify(received)} to be a valid AnalysisResult`,
      pass,
    };
  },

  /**
   * Check if chalk output contains expected content (strips ANSI codes)
   */
  toHaveBeenCalledWithChalk(received: ReturnType<typeof vi.fn>, expectedContent: string) {
    const calls = received.mock.calls.map(call =>
      String(call[0]).replace(/\x1b\[[0-9;]*m/g, '')
    );
    const pass = calls.some(call => call.includes(expectedContent));
    return {
      message: () => `expected chalk output to contain "${expectedContent}", got: ${JSON.stringify(calls)}`,
      pass,
    };
  },

  /**
   * Check if a component definition is valid
   */
  toBeValidComponentDefinition(received) {
    const pass = received &&
      typeof received === 'object' &&
      'id' in received &&
      'name' in received &&
      'template' in received;
    return {
      message: () => `expected ${JSON.stringify(received)} to be a valid ComponentDefinition`,
      pass,
    };
  },

  /**
   * Check if result contains expected files
   */
  toContainFiles(received: Array<{ path: string }>, expectedFiles: string[]) {
    const paths = received.map(f => f.path);
    const pass = expectedFiles.every(f => paths.includes(f));
    return {
      message: () => `expected files to contain ${expectedFiles.join(', ')}, got: ${paths.join(', ')}`,
      pass,
    };
  },
});

// Global type augmentation for custom matchers
declare global {
  namespace Vi {
    interface AsymmetricMatchersContaining {
      toBeValidAnalysisResult(): any;
      toHaveBeenCalledWithChalk(content: string): any;
      toBeValidComponentDefinition(): any;
      toContainFiles(files: string[]): any;
    }
  }
}

export {};
