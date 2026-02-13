/**
 * Global test setup for @lokascript/framework
 * Runs before each test file to provide a clean testing environment
 */

import { beforeEach, afterEach, vi } from 'vitest';

// Mock console methods to reduce test output noise
const consoleMethods = ['log', 'error', 'warn', 'info', 'debug'] as const;

beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();

  // Mock console methods for cleaner test output
  // Tests that specifically need console output can restore these
  consoleMethods.forEach(method => {
    if (method in console) {
      vi.spyOn(console, method).mockImplementation(() => {});
    }
  });
});

afterEach(() => {
  // Restore console methods after each test
  consoleMethods.forEach(method => {
    if (method in console) {
      const spy = vi.mocked(console[method]);
      if (spy && spy.mockRestore) {
        spy.mockRestore();
      }
    }
  });

  // Clean up timers
  vi.clearAllTimers();
});

/**
 * Cleanup utility for manual cleanup in tests
 */
export function cleanupGlobalState(): void {
  vi.clearAllMocks();
  vi.clearAllTimers();
}
