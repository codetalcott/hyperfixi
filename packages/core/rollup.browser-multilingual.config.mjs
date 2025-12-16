import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';

/**
 * Rollup config for multilingual bundle
 *
 * This bundle excludes the core parser (~240 KB) and uses
 * @hyperfixi/semantic for parsing instead.
 *
 * Expected size: ~200-280 KB (vs 663 KB full bundle)
 */
export default {
  input: 'src/compatibility/browser-bundle-multilingual.ts',
  output: {
    file: 'dist/hyperfixi-multilingual.js',
    format: 'iife',
    name: 'hyperfixi',
    sourcemap: true,
    inlineDynamicImports: true
  },
  // Mark @hyperfixi/semantic as external - it's loaded separately
  external: ['@hyperfixi/semantic'],
  plugins: [
    nodeResolve({
      browser: true,
      preferBuiltins: false
    }),
    commonjs(),
    typescript({
      tsconfig: 'tsconfig.json',
      declaration: false,
      sourceMap: true
    }),
    terser({
      compress: {
        pure_getters: true,
        unsafe: false,
        unsafe_comps: false,
        drop_console: true,
        passes: 1,
        pure_funcs: [
          'debug.command',
          'debug.event',
          'debug.parse',
          'debug.expr',
          'debug.expressions',
          'debug.style',
          'debug.runtime',
          'debug.loop',
          'debug.async'
        ]
      },
      mangle: {
        properties: false // Keep property names for compatibility
      }
    })
  ]
};
