/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

// Core's unit suite since 4.0: the AST tooling (ast-utils), the multilingual
// functions, the shipped dist's charset, and the reported version. (Core's own
// engine, and the esbuild transform its TC39 decorators needed, left in Phase C6
// of the engine cutover; the reference and LSP data are checked against the
// engine by `npm run verify:reference`.)
export default defineConfig({
  test: {
    environment: 'happy-dom',

    include: ['src/**/*.{test,spec}.{js,ts}'],
    exclude: [
      'node_modules',
      // Build artifacts: exclude compiled *.test.js duplicates anywhere — the
      // rollup typescript cache mirrors the build under .rollup.cache/**/dist/**.
      '**/dist/**',
      '**/.rollup.cache/**',
    ],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'], // Terminal output + CI-compatible format
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.{test,spec}.ts',
        'src/**/*.d.ts',
        // Static data (not behavioral code), checked by verify:reference:
        'src/reference/**',
        'src/lsp-metadata.ts',
        'src/ast-utils/documentation.ts', // doc generator, not shipped runtime
      ],
      // No thresholds: the 60/68/70/68 floors measured core's engine, which left in C6.
    },

    testTimeout: 10000,

    // Reporter configuration - minimal output to reduce disk usage
    // Use VITEST_HTML=1 environment variable to enable HTML reports when needed
    reporters: process.env.VITEST_HTML ? ['verbose', 'html'] : ['verbose'],

    pool: 'forks',
  },

  define: {
    'import.meta.vitest': undefined,
  },
});
