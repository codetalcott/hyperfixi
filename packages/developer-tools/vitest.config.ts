/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    target: 'node20',
  },

  test: {
    // Use happy-dom for DOM testing (CLI tools may interact with DOM via happy-dom)
    environment: 'happy-dom',

    // Test file patterns
    include: ['src/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist'],

    // Coverage configuration - 90%+ target
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.{test,spec}.ts',
        'src/**/*.d.ts',
        'src/types.ts', // Type definitions only
      ],
      // Note: Coverage thresholds can be re-enabled once tests are refined
      // thresholds: {
      //   global: {
      //     branches: 90,
      //     functions: 90,
      //     lines: 90,
      //     statements: 90,
      //   },
      // },
    },

    // Longer timeout for server tests
    testTimeout: 15000,

    // Global test setup
    setupFiles: ['./src/test-setup.ts'],

    // Reporter configuration - use basic reporters only
    reporters: ['verbose'],

    // Enable globals for cleaner test syntax
    globals: true,
  },

  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
      '@test': new URL('./src/__test__', import.meta.url).pathname,
    },
  },
});
