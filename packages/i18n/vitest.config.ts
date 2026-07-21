/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'], // Terminal output + CI-compatible format
      // Count all source files (not just test-imported ones) so the number is an
      // honest package-wide figure and surfaces untested modules for follow-up.
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/test-setup.ts',
        'vitest.config.ts',
        'src/browser.ts', // browser bundle entry (re-exports)
        'src/plugins/**', // build-tool (vite/webpack) adapters, not runtime
      ],
      // Thresholds ratcheted 2026-07-20 after adding coverage.include (now counts
      // all src files). ~2-3pts below current actuals (S72.8/B60.8/F70.9/L73.6).
      thresholds: {
        global: {
          branches: 58,
          functions: 68,
          lines: 70,
          statements: 70,
        },
      },
    },
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules/', 'dist/', 'src/compatibility/**/*.spec.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});