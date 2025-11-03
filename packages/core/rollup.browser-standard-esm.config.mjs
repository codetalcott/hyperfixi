import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';

/**
 * ES Module Bundle Configuration for Standard Bundle
 *
 * This configuration creates a modern ES module bundle with code splitting:
 * - Format: ES modules (for <script type="module">)
 * - Code Splitting: Enabled (inlineDynamicImports removed)
 * - Dynamic Imports: Commands and expressions loaded as separate chunks
 * - Expected: 70-80KB gzipped main bundle (15-20% reduction vs IIFE)
 *
 * Usage:
 *   <script type="module" src="dist/esm/hyperfixi-browser-standard.js"></script>
 */
export default {
  input: 'src/compatibility/browser-bundle-standard.ts',
  output: {
    dir: 'dist/esm',
    format: 'es',
    entryFileNames: 'hyperfixi-browser-standard.js',
    chunkFileNames: 'chunks/[name]-[hash].js',
    sourcemap: true,
    // Remove inlineDynamicImports to enable code splitting
  },
  plugins: [
    nodeResolve({
      browser: true,
      preferBuiltins: false
    }),
    commonjs(),
    typescript({
      tsconfig: 'tsconfig.json',
      declaration: false,
      sourceMap: true,
      outDir: 'dist/esm'  // Match rollup output dir to avoid path validation error
    }),
    terser({
      compress: {
        pure_getters: true,
        unsafe: true,
        unsafe_comps: true,
        module: true  // Enable ES module specific optimizations
      },
      mangle: {
        properties: false // Keep property names for compatibility
      },
      format: {
        comments: false
      }
    })
  ]
};
