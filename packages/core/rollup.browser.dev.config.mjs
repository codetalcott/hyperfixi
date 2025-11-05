import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import { terser } from 'rollup-plugin-terser';

/**
 * Development Browser Bundle Configuration
 * - Preserves debug code and console.log
 * - Light minification for readability
 * - Includes sourcemaps for debugging
 */
export default {
  input: 'src/compatibility/browser-bundle.ts',
  output: {
    file: 'dist/hyperfixi-browser.dev.js',
    format: 'iife',
    name: 'hyperfixi',
    sourcemap: true,
    inlineDynamicImports: true
  },
  plugins: [
    // Set NODE_ENV for conditional code
    replace({
      'process.env.NODE_ENV': JSON.stringify('development'),
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
        unsafe: false,              // Less aggressive for debugging
        unsafe_comps: false,
        drop_console: false,        // Keep console.log for debugging
        drop_debugger: false,       // Keep debugger statements
        passes: 1                   // Single pass for faster builds
      },
      mangle: {
        properties: false           // Keep property names readable
      },
      format: {
        comments: 'some',           // Keep some comments for context
        beautify: false,            // Still compress but less aggressively
        indent_level: 2
      }
    })
  ]
};
