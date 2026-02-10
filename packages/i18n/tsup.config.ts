import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/browser.ts',
    // Additional exports declared in package.json
    'src/dictionaries/index.ts',
    'src/plugins/vite.ts',
    'src/plugins/webpack.ts',
  ],
  format: ['esm', 'cjs'],
  dts: {
    compilerOptions: {
      incremental: false,
      composite: false,
    },
  },
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  external: ['@hyperfixi/core', '@lokascript/ast-toolkit'],
});
