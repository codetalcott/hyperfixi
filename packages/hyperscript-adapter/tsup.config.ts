import { defineConfig } from 'tsup';

// Shared IIFE config for browser bundles
const iife = (
  entry: Record<string, string>,
  globalName: string,
  treeshake = true,
  sourcemap = false,
) => ({
  entry,
  format: ['iife'] as const,
  globalName,
  minify: true,
  sourcemap,
  treeshake,
  esbuildOptions(options: Record<string, unknown>) {
    options.treeShaking = treeshake;
  },
});

export default defineConfig([
  // -------------------------------------------------------------------------
  // Node.js library (ESM + CJS)
  // -------------------------------------------------------------------------
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
  },

  // -------------------------------------------------------------------------
  // Full bundle — all 24 languages (~530 KB)
  // -------------------------------------------------------------------------
  iife(
    { 'hyperscript-i18n': 'src/browser.ts' },
    'HyperscriptI18n',
    false, // don't tree-shake: need all language side-effects
    true, // sourcemap for full bundle only
  ),

  // -------------------------------------------------------------------------
  // Lite adapter — no semantic bundled, expects external global (~4 KB)
  // -------------------------------------------------------------------------
  iife(
    { 'hyperscript-i18n-lite': 'src/browser-lite.ts' },
    'HyperscriptI18n',
  ),

  // -------------------------------------------------------------------------
  // Single-language bundles (alphabetical)
  // -------------------------------------------------------------------------
  iife({ 'hyperscript-i18n-ar': 'src/bundles/ar.ts' }, 'HyperscriptI18n'),
  iife({ 'hyperscript-i18n-bn': 'src/bundles/bn.ts' }, 'HyperscriptI18n'),
  iife({ 'hyperscript-i18n-de': 'src/bundles/de.ts' }, 'HyperscriptI18n'),
  iife({ 'hyperscript-i18n-en': 'src/bundles/en.ts' }, 'HyperscriptI18n'),
  iife({ 'hyperscript-i18n-es': 'src/bundles/es.ts' }, 'HyperscriptI18n'),
  iife({ 'hyperscript-i18n-fr': 'src/bundles/fr.ts' }, 'HyperscriptI18n'),
  iife({ 'hyperscript-i18n-he': 'src/bundles/he.ts' }, 'HyperscriptI18n'),
  iife({ 'hyperscript-i18n-hi': 'src/bundles/hi.ts' }, 'HyperscriptI18n'),
  iife({ 'hyperscript-i18n-id': 'src/bundles/id.ts' }, 'HyperscriptI18n'),
  iife({ 'hyperscript-i18n-it': 'src/bundles/it.ts' }, 'HyperscriptI18n'),
  iife({ 'hyperscript-i18n-ja': 'src/bundles/ja.ts' }, 'HyperscriptI18n'),
  iife({ 'hyperscript-i18n-ko': 'src/bundles/ko.ts' }, 'HyperscriptI18n'),
  iife({ 'hyperscript-i18n-ms': 'src/bundles/ms.ts' }, 'HyperscriptI18n'),
  iife({ 'hyperscript-i18n-pl': 'src/bundles/pl.ts' }, 'HyperscriptI18n'),
  iife({ 'hyperscript-i18n-pt': 'src/bundles/pt.ts' }, 'HyperscriptI18n'),
  iife({ 'hyperscript-i18n-qu': 'src/bundles/qu.ts' }, 'HyperscriptI18n'),
  iife({ 'hyperscript-i18n-ru': 'src/bundles/ru.ts' }, 'HyperscriptI18n'),
  iife({ 'hyperscript-i18n-sw': 'src/bundles/sw.ts' }, 'HyperscriptI18n'),
  iife({ 'hyperscript-i18n-th': 'src/bundles/th.ts' }, 'HyperscriptI18n'),
  iife({ 'hyperscript-i18n-tl': 'src/bundles/tl.ts' }, 'HyperscriptI18n'),
  iife({ 'hyperscript-i18n-tr': 'src/bundles/tr.ts' }, 'HyperscriptI18n'),
  iife({ 'hyperscript-i18n-uk': 'src/bundles/uk.ts' }, 'HyperscriptI18n'),
  iife({ 'hyperscript-i18n-vi': 'src/bundles/vi.ts' }, 'HyperscriptI18n'),
  iife({ 'hyperscript-i18n-zh': 'src/bundles/zh.ts' }, 'HyperscriptI18n'),

  // -------------------------------------------------------------------------
  // Regional bundles
  // -------------------------------------------------------------------------
  iife({ 'hyperscript-i18n-western': 'src/bundles/western.ts' }, 'HyperscriptI18n'),
  iife({ 'hyperscript-i18n-east-asian': 'src/bundles/east-asian.ts' }, 'HyperscriptI18n'),
  iife({ 'hyperscript-i18n-south-asian': 'src/bundles/south-asian.ts' }, 'HyperscriptI18n'),
  iife({ 'hyperscript-i18n-southeast-asian': 'src/bundles/southeast-asian.ts' }, 'HyperscriptI18n'),
  iife({ 'hyperscript-i18n-slavic': 'src/bundles/slavic.ts' }, 'HyperscriptI18n'),
]);
