import { defineConfig } from 'tsup';

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
      'core/pattern-matching/index': 'src/core/pattern-matching/index.ts',
      'multilingual/index': 'src/multilingual/index.ts',
      'schema/index': 'src/schema/index.ts',
      'parsing/index': 'src/parsing/index.ts',
      'generation/index': 'src/generation/index.ts',
      'grammar/index': 'src/grammar/index.ts',
      'api/index': 'src/api/index.ts',
    },
    format: ['esm'],
    splitting: false,
    sourcemap: true,
  },
]);
