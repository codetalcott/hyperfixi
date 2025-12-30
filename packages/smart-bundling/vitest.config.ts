/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    target: 'node20',
  },

  test: {
    // Use happy-dom for DOM testing
    environment: 'happy-dom',

    // Test file patterns
    include: ['src/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.{test,spec}.ts',
        'src/**/*.d.ts',
        'src/types.ts',
        'src/index.ts',
      ],
    },

    // Longer timeout for bundling operations
    testTimeout: 30000,

    // Reporter configuration
    reporters: ['verbose'],

    // Enable globals for cleaner test syntax
    globals: true,
  },

  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
});
