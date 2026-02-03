import { defineConfig } from 'vitest/config';
import path from 'path';

const semanticSrc = path.resolve(__dirname, '../semantic/src');

export default defineConfig({
  resolve: {
    alias: [
      // Resolve @lokascript/semantic subpath imports to source files so that
      // all modules share a single registry instance. Without this, dist/core.js
      // and dist/languages/*.js are separate bundles with duplicate registries.
      {
        find: /^@lokascript\/semantic\/languages\/(.+)$/,
        replacement: `${semanticSrc}/languages/$1.ts`,
      },
      {
        find: '@lokascript/semantic/core',
        replacement: `${semanticSrc}/core.ts`,
      },
      {
        find: '@lokascript/semantic',
        replacement: `${semanticSrc}/index.ts`,
      },
    ],
  },
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'jsdom',
  },
});
