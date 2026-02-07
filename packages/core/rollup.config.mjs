import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

const commonPlugins = [
  nodeResolve(),
  typescript({
    exclude: ['**/*.test.ts', '**/*.spec.ts', '**/test-helpers/**', '**/__test-utils__/**'],
    // Disable declaration generation in rollup - it's handled by tsc separately
    declaration: false,
    declarationMap: false,
  }),
];

/**
 * Helper to create a subpath export entry
 * @param {string} input - Source file path
 * @param {string} outputBase - Output path without extension
 * @param {string[]} external - External dependencies
 */
function createSubpathEntry(input, outputBase, external = []) {
  return {
    input,
    output: [
      { file: `${outputBase}.mjs`, format: 'es', sourcemap: true },
      { file: `${outputBase}.js`, format: 'cjs', sourcemap: true },
    ],
    plugins: commonPlugins,
    external,
  };
}

export default [
  // ==========================================================================
  // Main entry point
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
      {
        file: 'dist/index.min.js', // Minified UMD for browser
        format: 'umd',
        name: 'LokaScriptCore',
        plugins: [terser()],
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
  createSubpathEntry('src/multilingual/index.ts', 'dist/multilingual/index', ['@lokascript/semantic']),

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
];