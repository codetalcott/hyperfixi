/**
 * The `./core` + `./languages/<code>` + `./lexicons/<code>` path, on the BUILT files: the one
 * the vite-plugin, the slim adapter and lokascript-learn's playground take. Measured 2026-10-18
 * on learn's ten languages, it weighed more than the root entry (278.6 KB gz against 252.7), and
 * it rendered value words in English:
 *
 * - every `lexicons/<code>.js` bundled a private copy of the lexicon registry, so registering
 *   wrote to a Map `render` never read (`私の valueを`, not `私の 値 を`);
 * - `KNOWN_PROFILES` (`Object.freeze({…24 profiles})`) could not be proven pure, so `./core`
 *   alone kept every language's profile (35 KB gz);
 * - each `languages/<code>.js` inlined its own copy of the shared modules (174 KB raw over ten).
 *
 * Skips when dist/ is not built, like build-artifacts.test.ts.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { build } from 'esbuild';

const DIST = resolve(__dirname, '..', 'dist');
const built = existsSync(resolve(DIST, 'core.js')) && existsSync(resolve(DIST, 'lexicons/ja.js'));

/** Bundle `source` the way a consumer's bundler would: minified, tree-shaken, against dist/. */
async function bundle(source: string): Promise<string> {
  const result = await build({
    stdin: { contents: source, resolveDir: DIST, loader: 'js' },
    bundle: true,
    minify: true,
    format: 'esm',
    write: false,
    logLevel: 'silent',
  });
  return result.outputFiles[0].text;
}

describe.runIf(built)('./core with languages and lexicons (built files)', () => {
  it('registers a lexicon imported from its subpath with core, so values render in the language', async () => {
    const core = await import(resolve(DIST, 'core.js'));
    await import(resolve(DIST, 'languages/en.js'));
    await import(resolve(DIST, 'languages/ja.js'));
    await import(resolve(DIST, 'lexicons/ja.js'));
    expect(core.getRegisteredLexicons()).toContain('ja');
    expect(core.render(core.parse('on click set :v to my value', 'en'), 'ja')).toContain('値');
  });

  it('exports getAllTranslations, over the languages a page registered', async () => {
    const core = await import(resolve(DIST, 'core.js'));
    await import(resolve(DIST, 'languages/en.js'));
    await import(resolve(DIST, 'languages/ja.js'));
    const all = core.getAllTranslations('on click toggle .active', 'en');
    expect(Object.keys(all).sort()).toEqual([...core.getRegisteredLanguages(), 'explicit'].sort());
    expect(all.ja).toContain('切り替え');
  });

  it('drops the profiles of languages a bundle does not import', async () => {
    // `qichuy` is Quechua's `remove`; it reached every ./core bundle through KNOWN_PROFILES.
    const coreOnly = await bundle(`import { parse } from './core.js'; globalThis.p = parse;`);
    expect(coreOnly).not.toContain('qichuy');
  });

  it('defines each shared module once across the language and lexicon files', () => {
    const files = [
      ...readdirSync(resolve(DIST, 'languages')).map(f => `languages/${f}`),
      ...readdirSync(resolve(DIST, 'lexicons')).map(f => `lexicons/${f}`),
      ...readdirSync(DIST).filter(f => f.startsWith('chunk-')),
    ].filter(f => f.endsWith('.js'));
    const defining = files.filter(f =>
      /\b(?:var|class) AsciiIdentifierExtractor\b/.test(readFileSync(resolve(DIST, f), 'utf8'))
    );
    expect(defining).toHaveLength(1);
  });
});
