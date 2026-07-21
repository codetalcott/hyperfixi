import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'], // Terminal output + CI-compatible format
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/test/**',
        'vitest.config.ts',
        'src/index.ts', // Re-exports only
        // Browser bundle entry points (per-language re-export files) — assembled
        // for the browser globals, not exercised by vitest. Excluded so coverage
        // reflects unit-tested parser/tokenizer logic, not bundle glue.
        'src/browser*.ts',
        // Type-only declarations (no executable lines):
        'src/**/__types__/**',
        'src/types/**',
      ],
      // Thresholds ratcheted 2026-07-20 after coverage-hygiene excludes; ~2-3pts
      // below current actuals (S88.5/B82.5/F91.0/L89.7) as cross-machine headroom.
      thresholds: {
        global: {
          branches: 80,
          functions: 88,
          lines: 88,
          statements: 86,
        },
      },
    },
  },
});
