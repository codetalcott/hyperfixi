import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/hyperscript-fixi.mjs', // For modern bundlers
      format: 'es',
      sourcemap: true,
    },
    {
      file: 'dist/hyperscript-fixi.min.js', // For <script> tags
      format: 'umd',
      name: 'hyperscriptFixi', // Global variable name
      plugins: [terser()],
      sourcemap: true,
    },
  ],
  plugins: [nodeResolve(), typescript()],
};