import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

/**
 * Rollup config for multilingual bundle
 *
 * This bundle excludes the core parser (~240 KB) and uses
 * @lokascript/semantic for parsing instead.
 *
 * Expected size: ~200-280 KB (vs 663 KB full bundle)
 */
export default {
  input: 'src/compatibility/browser-bundle-multilingual.ts',
  output: {
    file: 'dist/hyperfixi-multilingual.js',
    format: 'iife',
    // Use internal name to avoid overwriting window.hyperfixi
    // The bundle sets window.hyperfixi internally
    name: '_hyperfixiMultilingualInternal',
    sourcemap: true,
    inlineDynamicImports: true,
  },
  // Mark @lokascript/semantic as external - it's loaded separately
  external: ['@lokascript/semantic'],
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
        // Mangle underscore-prefixed properties (internal/private) - 5% savings
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
