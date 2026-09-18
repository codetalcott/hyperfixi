/// <reference types="vitest" />
import { readFileSync } from 'node:fs';
import { transform } from 'esbuild';
import { defineConfig } from 'vitest/config';

// Handed to esbuild verbatim, so test code compiles with the same class-field
// semantics as the build (target ES2020 ⇒ useDefineForClassFields=false).
const tsconfigRaw = readFileSync(new URL('./tsconfig.json', import.meta.url), 'utf8');

export default defineConfig({
  plugins: [
    {
      // Core's commands use TC39 (Stage 3) decorators — `@command({ name })`.
      // Vite 8 compiles TypeScript with Oxc, which lowers only legacy
      // (`experimentalDecorators`) decorators: Stage 3 ones pass through
      // verbatim, Node cannot parse them, and every test that imports a command
      // dies at load with "SyntaxError: Invalid or unexpected token" (~150
      // files). Vite 7 compiled with esbuild, which lowers them, so keep
      // TS → JS on esbuild under both.
      name: 'hyperfixi:esbuild-typescript',
      enforce: 'pre',
      config() {
        // Turn off the built-in transform so each file is compiled once:
        // `esbuild` is Vite 7's, `oxc` is Vite 8's. `oxc` is spread in because
        // Vite 7's UserConfig type does not declare it.
        return { esbuild: false, ...{ oxc: false } };
      },
      async transform(code, id) {
        const file = id.split('?')[0];
        if (!/\.[cm]?ts$/.test(file) || file.includes('/node_modules/')) return null;
        const result = await transform(code, {
          loader: 'ts',
          target: 'node20',
          tsconfigRaw,
          sourcefile: file,
          sourcemap: true,
        });
        return { code: result.code, map: result.map };
      },
    },
  ],

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
      // Performance benchmarks - flaky/slow (timing-based, verified flaky 2026-07-20)
      'src/parser/tokenizer-comparison.test.ts',
      'src/parser/performance.test.ts',
      // NOTE: src/utils/performance.test.ts was previously excluded here as a
      // "flaky benchmark", but it is a *correctness* suite for the perf-utility
      // classes (ObjectPool/StyleBatcher/EventQueue) — 66 tests, stable across
      // repeated runs, recovers 100% coverage of src/utils/performance.ts. Re-enabled.
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
        // --- Non-unit-testable / non-executable surface (excluded so the coverage
        // number reflects unit-tested runtime, not integration glue or data). ---
        // Browser bundle entry points: assembled + exercised by the Playwright
        // bundle-compatibility suite (src/compatibility/browser-tests/), never by
        // vitest. Keeping them counted dragged core ~8pts on ~2,900 lines at ~2%.
        'src/compatibility/browser-bundle-*.ts',
        'src/compatibility/browser-modular.ts',
        'src/compatibility/browser-tests/**', // Playwright specs + helpers
        // Test-only infrastructure (not shipped runtime):
        'src/__test-utils__/**',
        'src/test-helpers/**',
        // Static data / examples / doc-generation (not behavioral runtime):
        'src/registry/examples/**',
        'src/reference/**', // command-reference data
        'src/i18n/error-catalog.ts', // error-string catalog
        'src/ast-utils/documentation.ts', // doc generator, not shipped runtime
      ],
      // Thresholds ratcheted 2026-07-20 after the coverage-hygiene excludes lifted
      // core to ~72% lines. Set ~2-3pts below current actuals (S71.4/B63.5/F70.9/
      // L72.3) as cross-machine headroom (Mac dev vs CI Linux drift). Raise further
      // as Phase 2 tests land (target: features/, performance/, context/).
      thresholds: {
        global: {
          branches: 60,
          functions: 68,
          lines: 70,
          statements: 68,
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
