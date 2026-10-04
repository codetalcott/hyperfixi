// @vitest-environment node
/**
 * The lite adapter on every shipped `@lokascript/semantic` browser IIFE, on the
 * engine's `hyperfixi-hs.js`: the three `<script>` tags a page would load, from
 * their BUILT files, in a real jsdom window. For each language a bundle declares,
 * a translated handler must run.
 *
 * Built files on purpose: what broke here was the build (OPEN_ITEMS PR7). The
 * IIFEs other than the full one and the English-bearing regions registered no
 * English, so `render(node, 'en')` threw and every translation fell back to the
 * text as written; and the lite adapter looked for seven global names, missing
 * the other single-language bundles. Nothing loaded an IIFE, so neither showed.
 *
 * `browser-core` and `browser-lazy` register no language by design (a page loads
 * languages into them), so they are only checked for the API.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { JSDOM } from 'jsdom';
import { parseSemantic, render } from '@lokascript/semantic';

const SEMANTIC_DIST = resolve(__dirname, '../../semantic/dist');
const ENGINE = resolve(__dirname, '../../engine/dist/hyperfixi-hs.js');
const LITE = resolve(__dirname, '../dist/hyperscript-i18n-lite.global.js');
const NO_LANGUAGE = new Set(['browser-core.core.global.js', 'browser-lazy.lazy.global.js']);
const ENGLISH = 'on click toggle .on';

const iifes = readdirSync(SEMANTIC_DIST)
  .filter(f => /^browser.*\.global\.js$/.test(f))
  .sort();

interface Loaded {
  window: JSDOM['window'];
  semantic: Record<string, unknown>;
  languages: string[];
  messages: string[];
}

function load(file: string): Loaded {
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    runScripts: 'dangerously',
  });
  const { window } = dom;
  const messages: string[] = [];
  window.console.warn = (...args: unknown[]) => messages.push(args.join(' '));
  window.console.error = (...args: unknown[]) => messages.push(args.join(' '));
  for (const path of [ENGINE, resolve(SEMANTIC_DIST, file), LITE]) {
    const script = window.document.createElement('script');
    script.textContent = readFileSync(path, 'utf8');
    window.document.head.appendChild(script);
  }
  const name = Object.keys(window).find(k => k.startsWith('LokaScriptSemantic'));
  const semantic = (name ? Reflect.get(window, name) : undefined) as Record<string, unknown>;
  const getLanguages = semantic?.getSupportedLanguages;
  const languages = typeof getLanguages === 'function' ? (getLanguages() as string[]) : [];
  return { window, semantic, languages, messages };
}

const node = parseSemantic(ENGLISH, 'en').node;
const sources = new Map<string, string>([['en', ENGLISH]]);
function sourceIn(language: string): string {
  if (!sources.has(language)) sources.set(language, render(node!, language));
  return sources.get(language)!;
}

describe('the lite adapter on each semantic browser IIFE, on hyperfixi-hs.js', () => {
  it('finds the bundles (a glob that matched nothing would pass everything below)', () => {
    expect(node).toBeTruthy();
    expect(iifes.length).toBeGreaterThanOrEqual(30);
    expect(iifes).toContain('browser.global.js');
    expect(iifes).toContain('browser-priority.priority.global.js');
  });

  it.each(iifes)('%s: translate and render are exported', file => {
    const { semantic } = load(file);
    expect(typeof semantic?.parse).toBe('function');
    expect(typeof semantic?.render).toBe('function');
    expect(typeof semantic?.translate).toBe('function');
  });

  it.each(iifes.filter(f => !NO_LANGUAGE.has(f)))(
    '%s: a handler in each of its languages runs',
    file => {
      const { window, languages, messages } = load(file);
      expect(languages.length).toBeGreaterThan(0);
      const { document } = window;
      for (const language of languages) {
        const button = document.createElement('button');
        button.lang = language;
        button.setAttribute('_', sourceIn(language));
        document.body.appendChild(button);
      }
      const api = Reflect.get(window, '_hyperscript') as { processNode(n: Node): void };
      api.processNode(document.body);

      const failed: string[] = [];
      for (const button of Array.from(document.querySelectorAll('button'))) {
        button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
        if (!button.classList.contains('on'))
          failed.push(`${button.lang}: ${button.getAttribute('_')}`);
        // The page keeps what its author wrote.
        expect(button.getAttribute('_')).toBe(sourceIn(button.lang));
      }
      expect(failed, messages.join('\n')).toEqual([]);
      expect(messages.filter(m => m.includes('No LokaScriptSemantic global'))).toEqual([]);
    }
  );
});
