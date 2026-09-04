import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // Count all source files (not just test-imported ones) so the figure is
      // package-wide.
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.{test,spec}.ts',
        'src/**/*.d.ts',
        // server.ts is the LSP entry-point script: 0 exports, calls
        // connection.listen() at top level, so it cannot be imported by unit
        // tests. It still holds ~1,200 lines of handler logic (diagnostics
        // assembly, completions, hover, configuration) that this exclusion
        // hides from the percentages below; lsp-integration.test.ts drives
        // that logic end-to-end through the built dist/server.js instead,
        // where v8 coverage cannot see it. The modules with pure logic
        // (extraction, symbol-table, document-symbols, completion-context,
        // command-tiers, simple-diagnostics, formatting, utils) ARE counted.
        'src/server.ts',
      ],
      // Floors, re-measured 2026-09-03 after the audit moved the unit suite
      // onto the shipped modules (S96/B87/F91/L97). Kept ~5pts under actuals
      // as cross-machine headroom, not as a target.
      thresholds: {
        global: {
          branches: 80,
          functions: 85,
          lines: 90,
          statements: 90,
        },
      },
    },
    // Timeout for tests (handles potential esbuild daemon hangs)
    testTimeout: 10000,
  },
});
