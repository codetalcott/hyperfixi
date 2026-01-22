import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'src/compatibility/browser-bundle-minimal-v2.ts',
  output: {
    file: 'dist/hyperfixi-debug.js',
    format: 'iife',
    name: 'lokascript',
    sourcemap: true,
    inlineDynamicImports: true
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
      sourceMap: true
    })
    // NO terser - we want to see what's actually bundled
  ]
};
