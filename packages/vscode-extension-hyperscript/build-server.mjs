/**
 * esbuild script to bundle the language server for the standalone _hyperscript extension.
 *
 * Replaces @lokascript/* and @hyperfixi/* imports with empty shims so the server
 * runs in standalone mode using its built-in fallback paths (Chevrotain parser,
 * hardcoded keyword/hover data, English-only).
 */
import { build } from 'esbuild';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const shimDir = resolve(__dirname, 'src/shims');

await build({
  entryPoints: [resolve(__dirname, '../language-server/src/server.ts')],
  bundle: true,
  format: 'esm',
  outfile: resolve(__dirname, 'dist/server.mjs'),
  platform: 'node',
  banner: {
    js: "import {createRequire} from 'module';const require=createRequire(import.meta.url);",
  },
  alias: {
    '@lokascript/semantic': resolve(shimDir, 'lokascript-semantic.ts'),
    '@lokascript/framework': resolve(shimDir, 'lokascript-framework.ts'),
    '@hyperfixi/core': resolve(shimDir, 'hyperfixi-core.ts'),
    '@hyperfixi/core/ast-utils': resolve(shimDir, 'hyperfixi-core-ast-utils.ts'),
    '@hyperfixi/core/lsp-metadata': resolve(shimDir, 'hyperfixi-core-lsp-metadata.ts'),
  },
  logLevel: 'info',
});
