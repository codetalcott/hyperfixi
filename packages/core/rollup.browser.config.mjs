import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import alias from '@rollup/plugin-alias';
import { fileURLToPath } from 'node:url';

const useTerser = process.env.NO_TERSER !== '1';

// Dedupe: the bundled plugins' dists (reactivity/realtime, added by #616)
// externalize `@hyperfixi/core`, so without this alias nodeResolve inlines
// core's prebuilt dist/index.mjs (3.2 MB, with an EMBEDDED second copy of
// @lokascript/semantic) alongside the src tree this entry already compiles —
// the bundle shipped core+semantic twice (~534 KB gz instead of ~290).
// Aliasing onto the src barrel folds the plugins' imports (including
// reactivity's dynamic `await import('@hyperfixi/core')`, inlined via
// inlineDynamicImports) onto the one src graph. installPlugin is duck-typed,
// so the dist-built plugin objects work against src-built core unchanged.
const coreSrcBarrel = fileURLToPath(new URL('src/index.ts', import.meta.url));

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
    alias({
      entries: [{ find: '@hyperfixi/core', replacement: coreSrcBarrel }],
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
