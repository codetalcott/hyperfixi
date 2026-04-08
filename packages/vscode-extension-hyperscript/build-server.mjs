/**
 * esbuild script to bundle the language server for the standalone _hyperscript extension.
 *
 * Replaces @lokascript/* and @hyperfixi/* imports with empty shims so the server
 * runs in standalone mode using its built-in fallback paths (Chevrotain parser,
 * hardcoded keyword/hover data, English-only).
 *
 * Also patches log output to remove misleading "not available" warnings that
 * would confuse users of the standalone extension.
 */
import { build } from 'esbuild';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const shimDir = resolve(__dirname, 'src/shims');

/**
 * Plugin that rewrites the optional-import log messages in the bundled server.
 * The catch blocks log warnings like "@hyperfixi/core not available" which are
 * correct for the full LokaScript LS but misleading in standalone mode where
 * those packages are intentionally absent.
 */
const cleanLogsPlugin = {
  name: 'clean-standalone-logs',
  setup(build) {
    build.onEnd(async (result) => {
      if (result.errors.length > 0) return;

      const fs = await import('fs');
      const outfile = resolve(__dirname, 'dist/server.mjs');
      let code = fs.readFileSync(outfile, 'utf8');

      // Replace the misleading catch-block warnings with nothing
      const noisyPatterns = [
        /console\.error\(\s*["']\[lokascript-ls\] @hyperfixi\/core not available[^"']*["']\s*\);?/g,
        /console\.error\(\s*["']\[lokascript-ls\] @hyperfixi\/core\/lsp-metadata not available[^"']*["']\s*\);?/g,
        /console\.error\(\s*["']\[lokascript-ls\] @lokascript\/framework not available[^"']*["']\s*\);?/g,
        // Also remove the "loaded" success messages (they'll never fire)
        /console\.error\(\s*["']\[lokascript-ls\] @hyperfixi\/core loaded[^"']*["']\s*\);?/g,
        /console\.error\(\s*["']\[lokascript-ls\] @lokascript\/framework loaded[^"']*["']\s*\);?/g,
      ];

      for (const pattern of noisyPatterns) {
        code = code.replace(pattern, '');
      }

      // Replace the capabilities summary with a clean standalone message
      code = code.replace(
        /console\.error\(\s*`\[lokascript-ls\] capabilities:[^`]*`\s*\);?/g,
        'console.error("[hyperscript-ls] standalone mode — Chevrotain parser + fallback docs");'
      );

      // Rebrand remaining [lokascript-ls] prefixes to [hyperscript-ls]
      code = code.replaceAll('[lokascript-ls]', '[hyperscript-ls]');

      fs.writeFileSync(outfile, code);
    });
  },
};

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
    // lsp-metadata is a pure data module with no core deps — bundle it directly
    '@hyperfixi/core/lsp-metadata': resolve(__dirname, '../core/src/lsp-metadata.ts'),
  },
  plugins: [cleanLogsPlugin],
  logLevel: 'info',
});
