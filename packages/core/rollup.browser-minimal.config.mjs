import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import { terser } from 'rollup-plugin-terser';

/**
 * Minimal Browser Bundle - Production Optimized
 * Includes only 8 core commands with aggressive size optimization
 * Target: <35KB gzipped (vs ~18KB hyperscript original)
 */
export default {
  input: 'src/compatibility/browser-bundle-minimal-v2.ts',
  output: {
    file: 'dist/hyperfixi-browser-minimal.js',
    format: 'iife',
    name: 'hyperfixi',
    sourcemap: false,  // Disable sourcemap for production
    inlineDynamicImports: true
  },
  plugins: [
    // Production flags for dead code elimination
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
      '__HYPERFIXI_DEBUG__': 'false',
      'window.__HYPERFIXI_DEBUG__': 'false',
      preventAssignment: true
    }),
    nodeResolve({
      browser: true,
      preferBuiltins: false,
    }),
    commonjs(),
    typescript({
      tsconfig: 'tsconfig.json',
      declaration: false,
      sourceMap: false
    }),
    terser({
      compress: {
        pure_getters: true,
        unsafe: true,
        unsafe_comps: true,
        passes: 3,              // More passes for better compression
        dead_code: true,
        conditionals: true,     // Optimize if-statements
        evaluate: true,         // Evaluate constant expressions
        unused: true,
        drop_debugger: true,
        drop_console: false,    // Keep console.log for LOG command
        booleans_as_integers: true,  // true -> 1, false -> 0
        toplevel: true,         // Allow mangling top-level variables
        pure_funcs: [           // Strip debug helpers
          'debug.command',
          'debug.event',
          'debug.parsing',
          'debug.expression',
          'debug.runtime',
          'debug.style',
          'debug.async',
          'debug.loop'
        ]
      },
      mangle: {
        toplevel: true,         // Mangle top-level names
        properties: {
          regex: /^_/           // Mangle underscore-prefixed properties
        }
      },
      format: {
        comments: false,
        ecma: 2020             // Use modern JS for smaller output
      }
    })
  ]
};
