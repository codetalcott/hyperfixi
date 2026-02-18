import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/http.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  // Bundle aot-compiler (private, not on npm) — keep semantic/hono as peer deps
  external: ['@lokascript/semantic', 'hono', '@hono/node-server'],
});
