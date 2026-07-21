import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    assertions: 'src/assertions.ts',
    // runner backs the package.json "./runner" export — it existed in src but
    // was never built, so the export dangled (caught by the strict export
    // gate the 2026-07-20 audit armed; ./browser, ./e2e and ./multilingual
    // had no buildable source at all and were removed from exports instead).
    runner: 'src/runner.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'es2020',
  minify: false,
  splitting: false,
  treeshake: true,
  external: [
    '@hyperfixi/core',
    'puppeteer',
    'playwright',
    'jsdom',
    'diff'
  ],
  banner: {
    js: '/* Testing Framework for HyperFixi Applications */',
  },
});
