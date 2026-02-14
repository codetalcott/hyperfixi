import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    splitting: false,
    sourcemap: true,
    clean: true,
    dts: false,
  },
  {
    entry: { cli: 'src/cli/index.ts' },
    outDir: 'dist',
    format: ['cjs'],
    splitting: false,
    sourcemap: true,
    clean: false,
  },
]);
