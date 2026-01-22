import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

const commonPlugins = [
  nodeResolve(),
  typescript({
    exclude: ['**/*.test.ts', '**/*.spec.ts', '**/test-helpers/**', '**/__test-utils__/**'],
    // Disable declaration generation in rollup - it's handled by tsc separately
    declaration: false,
    declarationMap: false,
  }),
];

export default [
  // Main entry point
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.mjs', // ES module output
        format: 'es',
        sourcemap: true,
        inlineDynamicImports: true,
      },
      {
        file: 'dist/index.js', // CommonJS output
        format: 'cjs',
        sourcemap: true,
        inlineDynamicImports: true,
      },
      {
        file: 'dist/index.min.js', // Minified UMD for browser
        format: 'umd',
        name: 'LokaScriptCore',
        plugins: [terser()],
        sourcemap: true,
        inlineDynamicImports: true,
      },
    ],
    plugins: commonPlugins,
    external: [],
  },
  // Bundle generator subpath export (for vite-plugin)
  {
    input: 'src/bundle-generator/index.ts',
    output: [
      {
        file: 'dist/bundle-generator/index.mjs',
        format: 'es',
        sourcemap: true,
      },
      {
        file: 'dist/bundle-generator/index.js',
        format: 'cjs',
        sourcemap: true,
      },
    ],
    plugins: commonPlugins,
    external: [],
  },
  // Multilingual subpath export (for testing-framework)
  {
    input: 'src/multilingual/index.ts',
    output: [
      {
        file: 'dist/multilingual/index.mjs',
        format: 'es',
        sourcemap: true,
      },
      {
        file: 'dist/multilingual/index.js',
        format: 'cjs',
        sourcemap: true,
      },
    ],
    plugins: commonPlugins,
    external: ['@lokascript/semantic'],
  },
];