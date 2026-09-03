/**
 * Rollup config for building modular parser components
 *
 * These modules are used by the vite-plugin's bundle generator
 * to create minimal, tree-shakeable bundles.
 */

import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { withAsciiOnly } from '../../scripts/rollup-ascii-only.mjs';

const parserModules = [
  'parser/hybrid-parser',
  'parser/hybrid/parser-core',
  'parser/hybrid/ast-types',
  'parser/hybrid/tokenizer',
  'parser/hybrid/aliases',
  'parser/hybrid/index',
];

export default withAsciiOnly(
  parserModules.map(module => ({
    input: `src/${module}.ts`,
    output: [
      {
        file: `dist/${module}.mjs`,
        format: 'es',
        sourcemap: true,
        // Same rationale as rollup.config.mjs's createSubpathEntry: the
        // expressions/conversion circular dep produces a dynamic import that
        // forces multiple chunks otherwise.
        inlineDynamicImports: true,
      },
      {
        // `.cjs`, not `.js`: core's package.json says `"type": "module"`, so a
        // `.js` file is ESM to Node and a CJS-syntax one exports nothing.
        file: `dist/${module}.cjs`,
        format: 'cjs',
        sourcemap: true,
        inlineDynamicImports: true,
      },
    ],
    plugins: [
      nodeResolve(),
      typescript({
        tsconfig: './tsconfig.build.json',
        declaration: false, // Declarations are built separately
        compilerOptions: {
          emitDeclarationOnly: false,
          declarationDir: undefined,
        },
      }),
    ],
    external: [],
  }))
);
