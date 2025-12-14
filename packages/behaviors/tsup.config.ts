import { defineConfig } from 'tsup';

export default defineConfig([
  // Main bundle with all behaviors (tree-shakeable)
  {
    entry: [
      'src/index.ts',
      'src/draggable.ts',
      'src/removable.ts',
      'src/toggleable.ts',
      'src/sortable.ts',
      'src/resizable.ts',
    ],
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    sourcemap: true,
  },
  // Individual behavior browser bundles for CDN use
  {
    entry: {
      'draggable.browser': 'src/draggable.ts',
      'removable.browser': 'src/removable.ts',
      'toggleable.browser': 'src/toggleable.ts',
      'sortable.browser': 'src/sortable.ts',
      'resizable.browser': 'src/resizable.ts',
      'all.browser': 'src/index.ts',
    },
    format: ['iife'],
    globalName: 'HyperFixiBehaviors',
    sourcemap: true,
    minify: true,
  },
]);
