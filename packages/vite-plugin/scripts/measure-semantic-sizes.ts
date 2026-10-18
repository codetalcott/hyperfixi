/**
 * Measure what each semantic bundle type adds to a page, for `SEMANTIC_BUNDLE_SIZES`:
 * the `@lokascript/semantic/core` imports `generateSemanticIntegrationCode` emits plus one
 * `@lokascript/semantic/languages/<lang>` module per language the type resolves to, bundled and
 * minified by esbuild, raw and gzipped. Prints the table's entries.
 *
 * Build semantic first, then: npx tsx scripts/measure-semantic-sizes.ts
 * (gzip sizes differ a little between platforms; the table is an estimate for debug logs.)
 */
import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { REGIONS } from '../src/language-keywords';
import {
  filterToAvailableLanguages,
  getLanguagesForBundleType,
  type SemanticBundleType,
} from '../src/semantic-integration';

const kb = (bytes: number) => `${Math.round(bytes / 1024)} KB`;
const types = [
  ...[...REGIONS.all].sort(),
  'es-en',
  ...Object.keys(REGIONS).filter(region => region !== 'all'),
  'all',
] as SemanticBundleType[];

for (const type of types) {
  const languages = [
    ...filterToAvailableLanguages(getLanguagesForBundleType(type, new Set())),
  ].sort();
  const entry = [
    "import { parseWithConfidence, render, isLanguageRegistered, findTranslationLoss, translate } from '@lokascript/semantic/core';",
    ...languages.map(lang => `import '@lokascript/semantic/languages/${lang}';`),
    'console.log(parseWithConfidence, render, isLanguageRegistered, findTranslationLoss, translate);',
  ].join('\n');
  const result = await build({
    stdin: {
      contents: entry,
      resolveDir: fileURLToPath(new URL('.', import.meta.url)),
      loader: 'js',
    },
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'browser',
    write: false,
    logLevel: 'error',
  });
  const bytes = result.outputFiles[0].contents;
  const key = /^[a-z]+$/.test(type) ? type : `'${type}'`;
  console.log(`  ${key}: { raw: '${kb(bytes.length)}', gzip: '~${kb(gzipSync(bytes).length)}' },`);
}
