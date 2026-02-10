import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'tenant-manager': 'src/tenant-manager.ts',
    isolation: 'src/isolation.ts',
    customization: 'src/customization.ts',
    middleware: 'src/middleware.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'es2020',
  minify: false,
  splitting: false,
  treeshake: true,
  external: ['@hyperfixi/core'],
  banner: {
    js: '/* Multi-Tenant System for HyperFixi Applications */',
  },
});