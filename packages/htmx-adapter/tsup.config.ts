import { defineConfig } from 'tsup';

export default defineConfig([
  // Library build (ESM + CJS + types)
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
  },
  // Browser IIFE — auto-installs window.__hyperfixi_i18n + registers with htmx
  {
    entry: { 'htmx-i18n': 'src/browser.ts' },
    format: ['iife'],
    globalName: 'HtmxI18n',
    outExtension: () => ({ js: '.global.js' }),
    minify: true,
    sourcemap: true,
  },
]);
