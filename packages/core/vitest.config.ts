/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Enable esbuild for TypeScript compilation
  esbuild: {
    target: 'node20',
  },

  test: {
    // Use happy-dom for DOM testing (faster than jsdom)
    environment: 'happy-dom',

    // Test file patterns
    include: ['src/**/*.{test,spec}.{js,ts}'],
    // Exclude:
    // - Playwright browser tests (*.spec.ts in browser-tests/) - they require real browser
    // - Performance benchmark tests - flaky due to timing variations
    // - Legacy integration tests - testing removed APIs (Phase 7 consolidation)
    exclude: [
      'node_modules',
      // Build artifacts: exclude compiled *.test.js duplicates anywhere. A bare
      // 'dist' only catches the top-level dist; the rollup typescript cache
      // mirrors the build under .rollup.cache/**/dist/**, and a CLI substring
      // filter (e.g. `vitest run src/commands`) matches those compiled copies —
      // doubling the suite with stale duplicates that crash forks. Glob both.
      '**/dist/**',
      '**/.rollup.cache/**',
      // Playwright browser tests - require real browser
      'src/compatibility/browser-tests/**/*.spec.ts',
      'src/multilingual/browser-e2e.spec.ts',
      // Performance benchmarks - flaky/slow
      'src/parser/tokenizer-comparison.test.ts',
      'src/parser/performance.test.ts',
      'src/utils/performance.test.ts',
      'src/commands-v1-archive/**/*.test.ts', // Archived V1 tests
      // Legacy integration tests - removed APIs (Phase 7 consolidation)
      'src/runtime/simple-integration.test.ts',
      'src/validation/lightweight-validators.test.ts',
      'src/test-includes-integration.test.ts',
    ],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'], // Terminal output + CI-compatible format
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.{test,spec}.ts',
        'src/**/*.d.ts',
        'src/benchmark/**',
      ],
      // Coverage thresholds enabled at 60% (starting point)
      // Will incrementally increase to 70% then 80% as coverage improves
      thresholds: {
        global: {
          branches: 60,
          functions: 60,
          lines: 60,
          statements: 60,
        },
      },
    },

    // Test timeout for async operations
    testTimeout: 10000,

    // Global test setup
    setupFiles: ['./src/test-setup.ts'],

    // Watch disabled in config - use command line

    // Reporter configuration - minimal output to reduce disk usage
    // Use VITEST_HTML=1 environment variable to enable HTML reports when needed
    reporters: process.env.VITEST_HTML ? ['verbose', 'html'] : ['verbose'],

    // Use forks pool for process isolation. Note: vitest may hang after tests
    // complete due to esbuild daemon keeping Node alive. CI workflow handles
    // this with a timeout wrapper that kills the process after tests finish.
    pool: 'forks',
  },

  // Resolve aliases for imports
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
      '@test': new URL('./src/test', import.meta.url).pathname,
    },
  },

  // Define transformations for TypeScript files
  define: {
    'import.meta.vitest': undefined,
  },
});
