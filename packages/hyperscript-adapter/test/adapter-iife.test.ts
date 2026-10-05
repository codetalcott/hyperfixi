// @vitest-environment node
/**
 * Every self-contained adapter IIFE (`hyperscript-i18n-<lang|region>.global.js`,
 * semantic bundled in) on the engine's `hyperfixi-hs.js`: the two `<script>`
 * tags a page would load, from their BUILT files, in a real jsdom window. For
 * each language a bundle declares, handlers in a few shapes must run.
 *
 * What this pins: until 4.0.1 these bundles installed a pattern generator that
 * GENERATES patterns only (`src/bundles/shared.ts`), discarding the hand-crafted
 * ones `@lokascript/semantic/core` registers. de, fr, qu and zh could not read
 * even `on click toggle .active` — every script stayed as written and the host
 * rejected it — and vi, he, id, hi and others lost shapes such as `toggle … on
 * #target`: 1106 of the corpus's 3772 translations read differently. The full
 * bundle (`hyperscript-i18n.global.js`) loads the whole semantic package and was
 * never affected; nothing loaded the others. Measured to fail on the old
 * shared.ts (published 3.3.0 and 4.0.0 alike).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { JSDOM } from 'jsdom';
import { parseSemantic, render, getSupportedLanguages } from '@lokascript/semantic';
// Semantic's own registry (this config resolves @lokascript/semantic to its source, so
// the registry is the one the import above filled with all 24 languages).
import { handcrafted, registeredHandcrafted } from '../../semantic/src/patterns/handcrafted';

const ADAPTER_DIST = resolve(__dirname, '../dist');
const ENGINE = resolve(__dirname, '../../engine/dist/hyperfixi-hs.js');

/** English source → what the clicked button must look like afterwards. */
const SHAPES: { english: string; check: (b: HTMLElement, doc: Document) => boolean }[] = [
  { english: 'on click toggle .on', check: b => b.classList.contains('on') },
  { english: 'on click add .on to me', check: b => b.classList.contains('on') },
  {
    english: 'on click toggle .on on #target',
    check: (b, doc) => doc.getElementById(`target-${b.id}`)!.classList.contains('on'),
  },
  { english: "on click put 'done' into me", check: b => b.textContent === 'done' },
  // Upstream's view-transition block, its head the same English words in every
  // language. jsdom has no document.startViewTransition, so the engine runs the
  // body directly; the command after the block's `end` stays after it.
  {
    english: "on click start view transition put 'vt' into me end then add .after to me",
    check: b => b.textContent === 'vt' && b.classList.contains('after'),
  },
];

const bundles = readdirSync(ADAPTER_DIST)
  .filter(f => /^hyperscript-i18n-[a-z-]+\.global\.js$/.test(f))
  .filter(f => f !== 'hyperscript-i18n-lite.global.js') // no semantic inside: semantic-iife-lite.test.ts
  .sort();

const sources = new Map<string, string>();
function sourceIn(english: string, language: string): string {
  const key = `${language}|${english}`;
  if (!sources.has(key)) {
    const node = parseSemantic(english, 'en').node;
    if (!node) throw new Error(`English does not parse: ${english}`);
    sources.set(key, language === 'en' ? english : render(node, language));
  }
  return sources.get(key)!;
}

function load(file: string) {
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    runScripts: 'dangerously',
  });
  const { window } = dom;
  const messages: string[] = [];
  window.console.warn = (...args: unknown[]) => messages.push(args.join(' '));
  window.console.error = (...args: unknown[]) => messages.push(args.join(' '));
  for (const path of [ENGINE, resolve(ADAPTER_DIST, file)]) {
    const script = window.document.createElement('script');
    script.textContent = readFileSync(path, 'utf8');
    window.document.head.appendChild(script);
  }
  const adapter = Reflect.get(window, 'HyperscriptI18n') as { supportedLanguages?: string[] };
  return { window, languages: adapter?.supportedLanguages ?? [], messages };
}

/** The literal ids of `language`'s hand-crafted patterns: what a bundle holding them contains. */
function handcraftedIds(language: string): string[] {
  return registeredHandcrafted()
    .filter(([, registered]) => registered === language)
    .flatMap(([command]) => (handcrafted(command, language) ?? []).map(pattern => pattern.id));
}

describe('each self-contained adapter IIFE, on hyperfixi-hs.js', () => {
  it('finds the bundles (a glob that matched nothing would pass everything below)', () => {
    expect(bundles.length).toBeGreaterThanOrEqual(29);
    expect(bundles).toContain('hyperscript-i18n-de.global.js');
    expect(bundles).toContain('hyperscript-i18n-western.global.js');
  });

  // Until 4.0.1 every one of these held all 24 languages' hand-crafted patterns
  // (~200 KB minified): the dispatchers named each language's function. Each
  // language now registers its own (semantic's src/patterns/handcrafted.ts).
  it.each(bundles)('%s: holds no other language’s hand-crafted patterns', file => {
    const source = readFileSync(resolve(ADAPTER_DIST, file), 'utf8');
    const { languages } = load(file);
    const others = getSupportedLanguages().filter(l => l !== 'en' && !languages.includes(l));
    const found = others.flatMap(language =>
      handcraftedIds(language)
        .filter(id => new RegExp(`["'\`]${id}["'\`]`).test(source))
        .map(id => `${language}: ${id}`)
    );
    expect(others.length).toBeGreaterThan(0);
    expect(found).toEqual([]);
  });

  it.each(bundles)('%s: handlers in each of its languages run', file => {
    const { window, languages, messages } = load(file);
    expect(languages.length).toBeGreaterThan(0);
    const { document } = window;
    let n = 0;
    for (const language of languages.filter(l => l !== 'en')) {
      for (const shape of SHAPES) {
        const id = `b${n++}`;
        const button = document.createElement('button');
        button.id = id;
        button.lang = language;
        button.dataset.english = shape.english;
        button.setAttribute(
          '_',
          sourceIn(shape.english, language).replace('#target', `#target-${id}`)
        );
        const target = document.createElement('div');
        target.id = `target-${id}`;
        document.body.append(button, target);
      }
    }
    const api = Reflect.get(window, '_hyperscript') as { processNode(n: Node): void };
    api.processNode(document.body);

    const failed: string[] = [];
    for (const button of Array.from(document.querySelectorAll('button'))) {
      button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      const shape = SHAPES.find(s => s.english === button.dataset.english)!;
      if (!shape.check(button, document))
        failed.push(`${button.lang} [${shape.english}]: ${button.getAttribute('_')}`);
    }
    expect(failed, messages.slice(0, 5).join('\n')).toEqual([]);
  });
});
