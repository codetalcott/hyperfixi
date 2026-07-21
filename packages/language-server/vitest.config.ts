import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // Count all source files (not just test-imported ones). Previously only the
      // 2 files tests import were counted, making the reported % misleading; this
      // gives an honest package-wide figure and surfaces the untested modules.
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.{test,spec}.ts',
        'src/**/*.d.ts',
        // server.ts is the LSP entry-point script: 0 exports, calls
        // connection.listen() at top level, so it cannot be imported by unit
        // tests (importing it would start an LSP server over stdio). Its handler
        // logic lives in the modular files (extraction/formatting/symbol-table/…)
        // which ARE tested. Like the browser bundle entries, exclude it from unit
        // coverage; it's exercised by the LSP integration tests instead.
        'src/server.ts',
      ],
      // Thresholds set 2026-07-20 to realistic per-metric floors: adding
      // coverage.include (minus the server.ts entry script) now counts all real
      // modules, so branch/function coverage is honestly ~48%/59% (was measured
      // over just 2 files at 60). ~2-3pts below actuals (S62.5/B47.6/F58.8/L64.4);
      // formatting.ts + utils.ts (0%) are Phase 2 targets that will raise these.
      thresholds: {
        global: {
          branches: 45,
          functions: 55,
          lines: 62,
          statements: 60,
        },
      },
    },
    // Timeout for tests (handles potential esbuild daemon hangs)
    testTimeout: 10000,
  },
});
