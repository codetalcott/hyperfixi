import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import terser from '@rollup/plugin-terser';

/**
 * LLM-Enhanced Browser Bundle Configuration
 * - Preserves metadata and documentation objects for LLM understanding
 * - Keeps variable names readable
 * - Light minification for size optimization
 * - Formatted for better code comprehension by AI agents
 *
 * Use this bundle when providing context to LLM agents or for IDE tooling.
 * For production web apps, use hyperfixi.prod.js instead.
 */
export default {
  input: 'src/compatibility/browser-bundle.ts',
  output: {
    file: 'dist/hyperfixi.llm.js',
    format: 'iife',
    name: 'hyperfixi',
    sourcemap: true,
    inlineDynamicImports: true,
  },
  plugins: [
    // Mark as LLM bundle for conditional compilation
    replace({
      'process.env.NODE_ENV': JSON.stringify('llm'),
      'process.env.LLM_BUNDLE': JSON.stringify('true'),
      preventAssignment: true,
    }),
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
        pure_getters: false, // Keep getters for metadata access
        unsafe: false, // Safe optimizations only
        unsafe_comps: false,
        drop_console: false, // Keep all console output
        drop_debugger: false, // Keep debugger statements
        passes: 1, // Single optimization pass
        dead_code: true, // Remove unreachable code
        unused: true, // Remove unused functions
      },
      mangle: false, // NO mangling - keep all names readable
      format: {
        comments: 'all', // Keep ALL comments for LLM context
        beautify: true, // Format code for readability
        indent_level: 2, // Consistent indentation
        max_line_len: 120, // Wrap long lines
        preserve_annotations: true, // Keep JSDoc and type annotations
        safari10: false, // Don't need Safari 10 compat
      },
    }),
  ],
};
