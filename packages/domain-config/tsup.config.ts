import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    '@lokascript/framework',
    '@lokascript/domain-sql',
    '@lokascript/domain-bdd',
    '@lokascript/domain-jsx',
    '@lokascript/domain-todo',
    '@lokascript/domain-behaviorspec',
    '@lokascript/domain-llm',
    '@lokascript/domain-flow',
    '@lokascript/domain-voice',
  ],
});
