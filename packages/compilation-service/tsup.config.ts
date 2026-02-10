import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/http.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['@hyperfixi/aot-compiler', '@lokascript/semantic', 'hono', '@hono/node-server'],
});
