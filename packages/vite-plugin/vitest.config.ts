import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Node environment (no DOM needed for plugin tests)
    environment: 'node',

    // Test file patterns
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'], // Terminal output + CI-compatible format
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.{test,spec}.ts',
        'src/**/*.d.ts',
      ],
    },

    // Test timeout
    testTimeout: 10000,

    // Parallel test execution
    pool: 'threads',
  },
});
