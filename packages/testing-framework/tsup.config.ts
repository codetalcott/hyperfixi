import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    runner: 'src/runner.ts',
    assertions: 'src/assertions.ts',
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