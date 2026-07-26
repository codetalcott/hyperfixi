import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { withAsciiOnly } from '../../scripts/rollup-ascii-only.mjs';

export default withAsciiOnly({
  input: 'src/compatibility/browser-bundle.ts',
  output: {
    file: 'dist/hyperfixi.js',
    format: 'iife',
    name: 'hyperfixi',
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
  ]
});
