import { defineConfig } from 'tsup';

export default defineConfig({
  // The root, and its two parts on their own (package.json `exports`).
  entry: ['src/index.ts', 'src/lse.ts', 'src/schema.ts'],
  format: ['cjs', 'esm'],
  // Shared chunks, in both formats: with each entry bundled whole, the root and
  // `/lse` would each hold their own `LossyEncodingError`, and `instanceof`
  // would fail across them.
  splitting: true,
  sourcemap: true,
  clean: true,
  dts: false, // handled separately by tsc --emitDeclarationOnly
});
