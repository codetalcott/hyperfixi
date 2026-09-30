// @vitest-environment jsdom
/**
 * Every multilingual example in this package's README, and in its
 * `@hyperscript-tools/multilingual` copy, translates to the English it means
 * and runs on the real engine.
 *
 * The Japanese quickstart (`on click .active を me で 切り替え`) was a dead
 * button for as long as it shipped: it translated to `on click on me toggle
 * .active`, which _hyperscript 0.9.93 reads as an empty click handler plus a
 * handler for an event named `me`. It parsed, so the host gate let it through,
 * and no test read the README. The same README also loaded only the Spanish
 * bundle for its Japanese and French examples.
 *
 * Each HTML block is loaded into the DOM so the adapter's own resolver picks
 * each element's language (data-lang, the data-hyperscript-lang cascade); a
 * block's default language is the one its `hyperscript-i18n-<lang>` bundle
 * loads. The oracle is the vendored engine the e2e suite pins.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { preprocessToEnglish } from '../src/preprocessor';
import { preprocess } from '../src/index';
import { resolveLanguage } from '../src/language-resolver';
import { acceptedByHost, type HyperscriptParseHost } from '../src/host-validate';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const READMES = {
  adapter: path.join(__dirname, '..', 'README.md'),
  multilingual: path.join(__dirname, '..', '..', 'multilingual-hyperscript', 'README.md'),
};

interface Example {
  readme: string;
  lang: string;
  source: string;
  english: string;
}

function examplesIn(readme: string, file: string): Example[] {
  const text = readFileSync(file, 'utf8');
  const out: Example[] = [];
  for (const [, block] of text.matchAll(/```html\n([\s\S]*?)```/g)) {
    const bundle = block.match(/hyperscript-i18n-([a-z]{2})\.global\.js/);
    const host = document.createElement('div');
    // innerHTML drops <html>/<body>, and with them the language they carry.
    host.innerHTML = block.replace(/<(\/?)(html|body)\b/g, '<$1div');
    for (const el of host.querySelectorAll('[_]')) {
      const lang = resolveLanguage(el) ?? bundle?.[1] ?? null;
      if (!lang || lang === 'en') continue;
      const source = el.getAttribute('_')!;
      out.push({ readme, lang, source, english: preprocessToEnglish(source, lang) });
    }
  }
  return out;
}

let hs: HyperscriptParseHost;
let examples: Example[];

beforeAll(() => {
  const vendor = readFileSync(
    path.join(__dirname, 'browser', 'vendor', '_hyperscript-0.9.93.min.js'),
    'utf8'
  );
  new Function(vendor).call(globalThis);
  hs = (globalThis as { _hyperscript?: HyperscriptParseHost })._hyperscript!;
  examples = Object.entries(READMES).flatMap(([name, file]) => examplesIn(name, file));
});

describe('README multilingual examples', () => {
  it('finds every example (a regex that finds none passes vacuously)', () => {
    expect(examples.map(e => `${e.readme}:${e.lang}`)).toEqual([
      'adapter:es',
      'adapter:ja',
      'adapter:fr',
      'multilingual:es',
      'multilingual:es',
      'multilingual:ja',
      'multilingual:ko',
      'multilingual:ja',
      'multilingual:es',
    ]);
  });

  it('each translates to what it means', () => {
    for (const e of examples) {
      expect(e.english, `${e.readme} ${e.lang}: ${e.source}`).toBe('on click toggle .active');
    }
  });

  it('each runs on the real engine, listening for a real event', () => {
    for (const e of examples) {
      expect(acceptedByHost(hs, e.english), `${e.readme} ${e.lang}: ${e.english}`).toBe(true);
    }
  });
});

describe('README preprocess() examples', () => {
  it.each([
    ['トグル .active', 'ja'],
    ['alternar .active', 'es'],
  ])('%s (%s) → toggle .active', (source, lang) => {
    expect(preprocess(source, lang)).toBe('toggle .active');
  });
});
