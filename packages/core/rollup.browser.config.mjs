import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

const useTerser = process.env.NO_TERSER !== '1';

export default {
  input: 'src/compatibility/browser-bundle.ts',
  output: {
    file: 'dist/hyperfixi.js',
    format: 'iife',
    name: 'hyperfixi',
    sourcemap: true,
    inlineDynamicImports: true,
  },
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
    useTerser &&
      terser({
        compress: {
          pure_getters: true,
          unsafe: false,
          unsafe_comps: false,
          // Keep console.warn/error so parse failures on the _= path stay
          // observable in the shipped bundle (drop_console: true silently
          // stripped them — see attribute-processor.reportCompileError).
          drop_console: ['log', 'info', 'debug', 'trace'],
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
            'debug.async',
          ],
        },
        mangle: {
          properties: false, // Keep property names for compatibility
        },
      }),
  ].filter(Boolean),
};
