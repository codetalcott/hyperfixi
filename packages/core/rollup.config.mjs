import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import { asciiOnly } from '../../scripts/rollup-ascii-only.mjs';

const commonPlugins = [
  nodeResolve(),
  typescript({
    exclude: ['**/*.test.ts', '**/*.spec.ts', '**/test-helpers/**', '**/__test-utils__/**'],
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
 * Helper to create a subpath export entry
 *
 * `inlineDynamicImports: true` matches the main entry's pattern. The
 * pre-existing circular dependency in `src/expressions/conversion/` produces
 * a dynamic import that would otherwise force rollup to emit multiple chunks
 * (and fail with "Invalid value for option 'output.file' - when building
 * multiple chunks, the 'output.dir' option must be used"). Inlining keeps the
 * subpath bundle single-file, which is what the package.json exports map
 * points to.
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
      { file: `${outputBase}.js`, format: 'cjs', sourcemap: true, inlineDynamicImports: true },
    ],
    plugins: commonPlugins,
    external,
  };
}

/**
 * The multilingual FRONT-END and the framework are not part of the engine's
 * library entry (ENGINE_MIGRATION_PLAN.md, Arc 1 step 2). Core reaches them
 * only through `await import(...)` — the bridge, the API's translate/render
 * path, and `lse/` — and with them external those stay real deferred loads:
 * a Node consumer that never compiles a non-English program never loads
 * `@lokascript/semantic`. With `external: []`, `nodeResolve()` followed the
 * workspace symlinks and `inlineDynamicImports` flattened every one of those
 * imports, so `dist/index.mjs` shipped the prebuilt semantic, framework and
 * intent dist files whole: 3,331,225 bytes, against 1,037,542 with them
 * external (measured 2026-09-03), and a consumer that also imported
 * `@lokascript/semantic` itself loaded two copies of it.
 *
 * `semantic` and `intent` are `dependencies`, `framework` an optional peer
 * (it was inlined anyway, which made `lse/index.ts`'s "install it as a peer"
 * guard vacuous). `scripts/check-node-import.mjs` asserts the sourcemap of
 * `dist/index.mjs` names none of them.
 */
const FRONT_END_EXTERNALS = [
  '@lokascript/semantic',
  '@lokascript/intent',
  '@lokascript/i18n',
  '@lokascript/framework',
];

export default [
  // ==========================================================================
  // Main entry point — Node/bundler library (ESM + CJS)
  // ==========================================================================
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.mjs', // ES module output
        format: 'es',
        sourcemap: true,
        inlineDynamicImports: true,
      },
      {
        file: 'dist/index.js', // CommonJS output
        format: 'cjs',
        sourcemap: true,
        inlineDynamicImports: true,
      },
    ],
    plugins: commonPlugins,
    external: FRONT_END_EXTERNALS,
  },

  // Minified UMD of the same entry. The ONE deliberately self-contained
  // output: a UMD cannot defer-load an external without a `globals` map and a
  // script tag per package, so it keeps inlining the front-end. Not in
  // `exports`; kept for script-tag consumers of `LokaScriptCore`.
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.min.js', // Minified UMD for browser
        format: 'umd',
        name: 'LokaScriptCore',
        // asciiOnly must follow terser here: output-level plugins run after the
        // input-level ones, so terser would otherwise decode the escapes the
        // input-level asciiOnly just produced.
        plugins: [terser(), asciiOnly()],
        sourcemap: true,
        inlineDynamicImports: true,
      },
    ],
    plugins: commonPlugins,
    external: [],
  },

  // ==========================================================================
  // Subpath exports (declared in package.json "exports" field)
  // ==========================================================================

  // Bundle generator (for vite-plugin)
  createSubpathEntry('src/bundle-generator/index.ts', 'dist/bundle-generator/index'),

  // Multilingual API (for testing-framework)
  createSubpathEntry('src/multilingual/index.ts', 'dist/multilingual/index', FRONT_END_EXTERNALS),

  // Commands module
  createSubpathEntry('src/commands/index.ts', 'dist/commands/index'),

  // Expressions module
  createSubpathEntry('src/expressions/index.ts', 'dist/expressions/index'),

  // Parser modules
  createSubpathEntry('src/parser/full-parser.ts', 'dist/parser/full-parser'),
  createSubpathEntry('src/parser/regex-parser.ts', 'dist/parser/regex-parser'),

  // Behaviors module
  createSubpathEntry('src/behaviors/index.ts', 'dist/behaviors/index'),

  // Registry modules
  createSubpathEntry('src/registry/index.ts', 'dist/registry/index'),
  createSubpathEntry('src/registry/browser-types.ts', 'dist/registry/browser-types'),
  createSubpathEntry('src/registry/universal-types.ts', 'dist/registry/universal-types'),
  createSubpathEntry('src/registry/environment.ts', 'dist/registry/environment'),

  // Reference data
  createSubpathEntry('src/reference/index.ts', 'dist/reference/index'),

  // Metadata
  createSubpathEntry('src/metadata.ts', 'dist/metadata'),

  // LSP metadata
  createSubpathEntry('src/lsp-metadata.ts', 'dist/lsp-metadata'),

  // AST utilities (interchange format, analysis, visitor)
  createSubpathEntry('src/ast-utils/index.ts', 'dist/ast-utils/index'),

  // LSE bridge (framework IR integration)
  createSubpathEntry('src/lse/index.ts', 'dist/lse/index', FRONT_END_EXTERNALS),
];
