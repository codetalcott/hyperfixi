import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

/**
 * Rollup config for semantic-complete bundle
 *
 * This bundle INLINES @lokascript/semantic (unlike the multilingual bundle).
 * Provides single-script deployment for multilingual support.
 *
 * Expected size: ~450-500 KB (runtime + semantic parser combined)
 *
 * Use case: Single-script deployments where loading multiple files is impractical.
 */
export default {
  input: 'src/compatibility/browser-bundle-semantic-complete.ts',
  output: {
    file: 'dist/hyperfixi-semantic-complete.js',
    format: 'iife',
    name: 'lokascript',
    sourcemap: true,
    inlineDynamicImports: true,
  },
  // NO EXTERNALS - @lokascript/semantic is bundled inline
  plugins: [
    nodeResolve({
      browser: true,
      preferBuiltins: false,
    }),
    commonjs(),
    typescript({
      tsconfig: 'tsconfig.json',
      declaration: false,
      sourceMap: true,
    }),
    terser({
      compress: {
        pure_getters: true,
        unsafe: true,
        unsafe_comps: true,
        drop_console: false, // Keep for LOG command
        passes: 2,
        dead_code: true,
        unused: true,
        pure_funcs: [
          'debug.command',
          'debug.event',
          'debug.parse',
          'debug.expr',
          'debug.expressions',
          'debug.style',
          'debug.runtime',
          'debug.loop',
          'debug.async',
        ],
      },
      mangle: {
        // Mangle underscore-prefixed properties (internal/private)
        properties: {
          regex: /^_/,
        },
      },
      format: {
        comments: false,
      },
    }),
  ],
};
