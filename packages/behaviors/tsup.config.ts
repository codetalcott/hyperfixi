import { defineConfig } from 'tsup';

export default defineConfig([
  // Main bundle with all behaviors (tree-shakeable)
  {
    entry: [
      'src/index.ts',
      'src/registry.ts',
      'src/loaders.ts',
      'src/schemas/index.ts',
      'src/behaviors/draggable.ts',
      'src/behaviors/removable.ts',
      'src/behaviors/toggleable.ts',
      'src/behaviors/sortable.ts',
      'src/behaviors/resizable.ts',
    ],
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    sourcemap: true,
  },
  // Individual behavior browser bundles for CDN use
  {
    entry: {
      'draggable.browser': 'src/behaviors/draggable.ts',
      'removable.browser': 'src/behaviors/removable.ts',
      'toggleable.browser': 'src/behaviors/toggleable.ts',
      'sortable.browser': 'src/behaviors/sortable.ts',
      'resizable.browser': 'src/behaviors/resizable.ts',
      'all.browser': 'src/index.ts',
    },
    format: ['iife'],
    globalName: 'HyperFixiBehaviors',
    sourcemap: true,
    minify: true,
  },
  // Core tier bundle (Draggable + Toggleable)
  {
    entry: {
      'core.browser': 'src/core-bundle.ts',
    },
    format: ['iife'],
    globalName: 'HyperFixiBehaviors',
    sourcemap: true,
    minify: true,
  },
]);
