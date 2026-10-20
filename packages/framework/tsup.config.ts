import { readdirSync } from 'fs';
import { defineConfig } from 'tsup';

// One entry per language module (src/languages/<code>.ts), plus the barrel.
const languageEntries = Object.fromEntries(
  readdirSync('src/languages')
    .filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts') && f !== 'types.ts')
    .map(f => [`languages/${f.slice(0, -3)}`, `src/languages/${f}`])
);

export default defineConfig([
  // Node.js builds (CJS + ESM)
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    splitting: false,
    sourcemap: true,
    clean: true,
  },
  // Subpath exports (for tree-shaking)
  {
    entry: {
      'core/index': 'src/core/index.ts',
      'core/types': 'src/core/types.ts',
      'core/tokenization/index': 'src/core/tokenization/index.ts',
      'multilingual/index': 'src/multilingual/index.ts',
      'schema/index': 'src/schema/index.ts',
      'parsing/index': 'src/parsing/index.ts',
      'generation/index': 'src/generation/index.ts',
      'grammar/index': 'src/grammar/index.ts',
      'api/index': 'src/api/index.ts',
      'testing/index': 'src/testing/index.ts',
      'testing/gate/index': 'src/testing/gate/index.ts',
      'ir/index': 'src/ir/index.ts',
    },
    format: ['esm'],
    splitting: false,
    sourcemap: true,
  },
  // Language grammars: data modules, one per language. Splitting keeps one copy
  // of each object between `languages/<code>` and the `languages` barrel.
  {
    entry: languageEntries,
    format: ['esm'],
    splitting: true,
    sourcemap: true,
    esbuildOptions(options) {
      options.chunkNames = 'languages/chunks/[name]-[hash]';
    },
  },
]);
