/**
 * What a single-language page's adapter weighs, and what a parse-only build would (S4).
 *
 * For each language, bundled with the per-language bundles' esbuild options (iife, minify,
 * browser, es2020, tree shaking), gzip -9:
 *   - shipped:     dist/hyperscript-i18n-<lang>.global.js as built;
 *   - adapter:     the bundle's entry rebuilt, on semantic's dist and on semantic's source (the
 *                  dist's prebundled core.js keeps code a source build tree-shakes away);
 *   - translate:   what the bundle runs (parse, English render, loss check) from semantic's SOURCE;
 *   - parse only:  the language's parse alone, from source (no render, no English, no loss check);
 *   - parser:      `parseWithConfidence` with no language registered (the shared floor).
 * Then a parity check: the two source builds against the published package over the
 * command-shape corpus rendered into the language (confidence, English render, loss check).
 *
 * Build semantic and the adapter first, then (from this package):
 *   node scripts/measure-weight.mjs [lang ...]     (default: de ja ar)
 */
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const PKG = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SEMANTIC = path.resolve(PKG, '../semantic');
const SRC = path.join(SEMANTIC, 'src');
const CASES = path.resolve(PKG, '../testing-framework/src/multilingual/command-shapes.cases.json');
const languages = process.argv.length > 2 ? process.argv.slice(2) : ['de', 'ja', 'ar'];

const kb = bytes => `${(bytes / 1024).toFixed(1)} KB`;
const gz = code => gzipSync(code, { level: 9 }).length;

const sources = lang => ({
  translate: `import '${SRC}/languages/${lang}'; import '${SRC}/languages/en';
    import { parseWithConfidence, render, findTranslationLoss } from '${SRC}/core';
    globalThis.S = { parseWithConfidence, render, findTranslationLoss };`,
  'parse only': `import '${SRC}/languages/${lang}';
    import { parseWithConfidence } from '${SRC}/core';
    globalThis.S = { parseWithConfidence };`,
  parser: `import { parseWithConfidence } from '${SRC}/core'; globalThis.S = { parseWithConfidence };`,
});

/** Resolves `@lokascript/semantic` and its subpaths to semantic's source files. */
const semanticSource = {
  name: 'semantic-source',
  setup(b) {
    b.onResolve({ filter: /^@lokascript\/semantic(\/.*)?$/ }, args => ({
      path: path.join(SRC, (args.path.slice('@lokascript/semantic'.length) || '/index') + '.ts'),
    }));
  },
};

async function bundle(contents, plugins = []) {
  const result = await build({
    stdin: { contents, resolveDir: SEMANTIC, loader: 'ts' },
    plugins,
    bundle: true,
    format: 'iife',
    minify: true,
    platform: 'browser',
    target: 'es2020',
    treeShaking: true,
    write: false,
    logLevel: 'silent',
  });
  return result.outputFiles[0].text;
}

const full = await import(path.join(SEMANTIC, 'dist/index.js'));
const { cases } = JSON.parse(readFileSync(CASES, 'utf8'));
const attempt = f => {
  try {
    return f();
  } catch (e) {
    return `THROW ${e?.message ?? e}`;
  }
};

/** Cases whose bundle answers match the published package's, of those that render into `lang`. */
function parity(code, lang) {
  const context = vm.createContext({ console, URL, TextEncoder, TextDecoder });
  context.globalThis = context;
  vm.runInContext(code, context);
  const S = context.S;
  let total = 0;
  let same = 0;
  for (const { source } of cases) {
    const reference = attempt(() => full.parseSemantic(source, 'en')?.node);
    if (!reference || typeof reference === 'string') continue;
    const text = attempt(() => full.render(reference, lang));
    if (text.startsWith('THROW')) continue;
    total++;
    const a = full.parseWithConfidence(text, lang);
    const b = attempt(() => S.parseWithConfidence(text, lang));
    if (typeof b === 'string' || a.confidence !== b.confidence) continue;
    const englishA = a.node ? attempt(() => full.render(a.node, 'en')) : null;
    const englishB = b.node ? attempt(() => (S.render ?? full.render)(b.node, 'en')) : null;
    if (englishA !== englishB) continue;
    if (S.findTranslationLoss && a.node) {
      const lossA = attempt(() => full.findTranslationLoss(text, a.node, englishA, 'en'));
      const lossB = attempt(() => S.findTranslationLoss(text, b.node, englishB, 'en'));
      if (JSON.stringify(lossA) !== JSON.stringify(lossB)) continue;
    }
    same++;
  }
  return `${same}/${total}`;
}

for (const lang of languages) {
  const shipped = readFileSync(path.join(PKG, `dist/hyperscript-i18n-${lang}.global.js`));
  console.log(`\n${lang}`);
  const row = (name, code, check = '') =>
    console.log(
      `  ${name.padEnd(22)} ${kb(code.length).padStart(9)} raw ${kb(gz(code)).padStart(9)} gz9${check}`
    );
  row('shipped', shipped);
  const entry = `export * from '${path.join(PKG, 'src/bundles', lang + '.ts')}';`;
  row('adapter, semantic dist', await bundle(entry));
  row('adapter, semantic src', await bundle(entry, [semanticSource]));
  for (const [name, contents] of Object.entries(sources(lang))) {
    const code = await bundle(contents);
    row(name, code, name === 'parser' ? '' : `   parity ${parity(code, lang)}`);
  }
}
