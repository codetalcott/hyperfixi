import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { asciiOnly } from '../../scripts/rollup-ascii-only.mjs';

const commonPlugins = [
  nodeResolve(),
  typescript({
    exclude: ['**/*.test.ts', '**/*.spec.ts'],
    // Disable declaration generation in rollup - it's handled by tsc separately
    declaration: false,
    declarationMap: false,
  }),
  // Last: escape non-ASCII so the emitted files decode identically under any
  // charset. @rollup/plugin-typescript re-prints regex literals from the TS AST,
  // which de-escapes `ً`-style source into raw characters — that is how the
  // npm entry points ended up unparseable when served without charset=utf-8.
  asciiOnly(),
];

/**
 * Helper to create a subpath export entry (ESM + CJS, one file each).
 *
 * @param {string} input - Source file path
 * @param {string} outputBase - Output path without extension
 * @param {string[]} external - External dependencies
 */
function createSubpathEntry(input, outputBase, external = []) {
  return {
    input,
    output: [
      { file: `${outputBase}.mjs`, format: 'es', sourcemap: true, inlineDynamicImports: true },
      { file: `${outputBase}.cjs`, format: 'cjs', sourcemap: true, inlineDynamicImports: true },
    ],
    plugins: commonPlugins,
    external,
  };
}

/**
 * The multilingual front-end is loaded only through `await import(...)` in
 * `/multilingual`; external, it stays a real deferred load, so a consumer that
 * never translates never loads `@lokascript/semantic`. (With `external: []`,
 * `nodeResolve()` followed the workspace symlinks and `inlineDynamicImports`
 * flattened the import, shipping semantic's prebuilt dist whole and, beside a
 * consumer's own import, a second copy of it — measured 2026-09-03.)
 */
const FRONT_END_EXTERNALS = ['@lokascript/semantic'];

export default [
  // ==========================================================================
  // Main entry point: @hyperfixi/engine, re-exported. ESM only, and the engine
  // EXTERNAL: inlined, it would be a second engine with its own grammar beside
  // the one `@hyperfixi/engine` users register into, and the engine ships no
  // CommonJS entry to `require` (owner decision, 4.0).
  // ==========================================================================
  {
    input: 'src/index.ts',
    output: [{ file: 'dist/index.mjs', format: 'es', sourcemap: true }],
    plugins: commonPlugins,
    external: ['@hyperfixi/engine'],
  },

  // ==========================================================================
  // Subpath exports (declared in package.json "exports" field)
  // ==========================================================================

  // Multilingual: parse, render, translate over @lokascript/semantic
  createSubpathEntry('src/multilingual/index.ts', 'dist/multilingual/index', FRONT_END_EXTERNALS),

  // Reference data
  createSubpathEntry('src/reference/index.ts', 'dist/reference/index'),

  // Metadata
  createSubpathEntry('src/metadata.ts', 'dist/metadata'),

  // LSP metadata
  createSubpathEntry('src/lsp-metadata.ts', 'dist/lsp-metadata'),

  // AST utilities (interchange format, analysis, visitor)
  createSubpathEntry('src/ast-utils/index.ts', 'dist/ast-utils/index'),
];
