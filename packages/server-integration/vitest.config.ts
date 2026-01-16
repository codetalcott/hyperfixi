import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      reporter: ['text', 'lcov'], // Terminal output + CI-compatible format
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.d.ts'
      ]
    }
  }
});