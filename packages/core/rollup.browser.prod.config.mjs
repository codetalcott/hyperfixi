import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import { terser } from 'rollup-plugin-terser';

/**
 * Production Browser Bundle Configuration
 * - Strips console.log and debug code
 * - Aggressive minification
 * - Optimized for smallest bundle size
 */
export default {
  input: 'src/compatibility/browser-bundle.ts',
  output: {
    file: 'dist/hyperfixi-browser.prod.js',
    format: 'iife',
    name: 'hyperfixi',
    sourcemap: true,
    inlineDynamicImports: true
  },
  plugins: [
    // Set NODE_ENV for dead code elimination
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
      '__HYPERFIXI_DEBUG__': 'false',
      preventAssignment: true
    }),
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
        unsafe: true,
        unsafe_comps: true,
        drop_console: false,        // Keep console.* for LOG command and errors
        drop_debugger: true,        // Remove debugger statements
        passes: 2,                  // Multiple passes for better compression
        dead_code: true,            // Remove unreachable code (enables metadata stripping)
        conditionals: true,         // Optimize if-statements
        evaluate: true,             // Evaluate constant expressions
        unused: true,               // Remove unused functions/variables
        pure_funcs: [               // Only strip debug helpers (not console.*)
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
        properties: false            // Keep property names for compatibility
      },
      format: {
        comments: false              // Strip all comments
      }
    })
  ]
};
