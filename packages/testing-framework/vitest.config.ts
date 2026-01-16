import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'], // Terminal output + CI-compatible format
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.d.ts'],
      // Uncomment when test coverage is improved
      // thresholds: {
      //   global: {
      //     branches: 90,
      //     functions: 90,
      //     lines: 90,
      //     statements: 90,
      //   },
      // },
    },
    testTimeout: 10000,
  },
});
