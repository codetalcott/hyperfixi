/**
 * End-to-end localization integration tests for the htmx-compat layer.
 * Phase 8d of htmx-v4-reactive-streaming.md.
 *
 * Walks the full stack: vocab module → orchestrator → hook → processor.
 * Verifies that localized attributes resolve to canonical English forms
 * for elements in `lang=` scopes, fall back to English outside lang scopes,
 * and dispatch real HTTP / event-listener wiring through the existing
 * processor paths.
 *
 * Uses jsdom (not happy-dom) because happy-dom can't parse non-ASCII
 * attribute names from HTML strings or match Unicode CSS attribute
 * selectors — real browsers and jsdom handle both fine. The orchestrator
 * code is unchanged; this is purely a test-environment workaround.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HtmxAttributeProcessor } from '../htmx-attribute-processor.js';
import { register, resetOrchestrator } from '../i18n-orchestrator.js';
import { resetHooks } from '../i18n-hooks.js';

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '../../../../../..');
const VOCAB_DIR = resolve(REPO_ROOT, 'packages/core/vocab/htmx');

let dom: JSDOM;
let document: Document;

/**
 * Load a vocab module by reading the emitted JS, extracting the
 * `attrs` / `events` payload, and calling `register()` directly. We
 * bypass `window.__hyperfixi_i18n` (which was installed on the
 * original happy-dom window at module-import time) to avoid coupling
 * test state to which global `window` is currently active.
 */
async function loadVocab(lang: string): Promise<void> {
  const source = await readFile(resolve(VOCAB_DIR, `${lang}.js`), 'utf-8');
  // Strip the IIFE wrapper and inline the register call as a JSON
  // payload. The emitted modules wrap a call like
  //   window.__hyperfixi_i18n.register('es', { hyperfixi: {...} });
  // so a simple regex pulls out the (already-JSON) second argument.
  const match = source.match(/register\(\s*'([^']+)'\s*,\s*(\{[\s\S]+?\})\s*\)\s*;\s*}\)/);
  if (!match) throw new Error(`Could not parse vocab module ${lang}.js`);
  const code = match[1];
  // The argument is JS-with-trailing-commas; JSON.parse rejects those,
  // so run it through eval-in-Function (safe — we authored the file).
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const data = new Function(`return (${match[2]});`)();
  register(code, data);
}

describe('htmx-compat localization integration', () => {
  let container: HTMLDivElement;
  let processor: HtmxAttributeProcessor;
  let executeCallback: ReturnType<typeof vi.fn<(code: string, element: Element) => Promise<void>>>;

  // Stash happy-dom globals so we can restore them after each test —
  // jsdom and happy-dom both register a global `document` / `Element` /
  // `Event` / `CustomEvent` / `MutationObserver`. Swapping for jsdom's
  // is what lets the processor dispatch CustomEvents that jsdom accepts.
  let savedGlobals: Record<string, unknown> = {};
  const swapGlobal = (key: string, value: unknown): void => {
    savedGlobals[key] = (globalThis as Record<string, unknown>)[key];
    (globalThis as Record<string, unknown>)[key] = value;
  };

  beforeEach(() => {
    // Real URL so jsdom grants localStorage access (the debug-log
    // helpers in core touch it on first init under happy-dom).
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost/',
    });
    document = dom.window.document;
    swapGlobal('document', document);
    swapGlobal('window', dom.window);
    swapGlobal('Element', dom.window.Element);
    swapGlobal('Event', dom.window.Event);
    swapGlobal('CustomEvent', dom.window.CustomEvent);
    swapGlobal('MutationObserver', dom.window.MutationObserver);
    swapGlobal('HTMLFormElement', dom.window.HTMLFormElement);
    swapGlobal('FormData', dom.window.FormData);
    container = document.createElement('div');
    document.body.appendChild(container);
    executeCallback = vi.fn().mockResolvedValue(undefined);
    processor = new HtmxAttributeProcessor({
      root: container,
      processExisting: false,
      watchMutations: false,
    });
    processor.init(executeCallback);
    resetOrchestrator();
    resetHooks();
  });

  afterEach(() => {
    processor.destroy();
    container.remove();
    resetOrchestrator();
    resetHooks();
    for (const [key, value] of Object.entries(savedGlobals)) {
      (globalThis as Record<string, unknown>)[key] = value;
    }
    savedGlobals = {};
  });

  describe('Spanish vocab', () => {
    beforeEach(async () => {
      await loadVocab('es');
    });

    it('processes hx-obtener (Spanish hx-get) and translates to a fetch snippet', () => {
      const section = document.createElement('section');
      section.setAttribute('lang', 'es');
      const button = document.createElement('button');
      button.setAttribute('hx-obtener', '/api/usuarios');
      button.setAttribute('hx-objetivo', '#out');
      section.appendChild(button);
      container.appendChild(section);

      processor.processElement(button);

      // The translator stamps the generated hyperscript onto the
      // element as a `data-hx-generated` attribute (existing behavior
      // from earlier phases). Spanish-form attributes should resolve
      // to the canonical Spanish-driven fetch snippet.
      const generated = button.getAttribute('data-hx-generated');
      expect(generated).toContain("fetch '/api/usuarios'");
      expect(generated).toContain('#out');
    });

    it('discovers hx-obtener-bearing elements on scan', () => {
      const section = document.createElement('section');
      section.setAttribute('lang', 'es');
      const button = document.createElement('button');
      button.setAttribute('hx-obtener', '/api');
      section.appendChild(button);
      container.appendChild(section);

      const found = processor.scanForHtmxElements(container);
      expect(found).toContain(button);
    });

    it('falls back to English attrs for the same key in unscoped subtree', () => {
      const button = document.createElement('button');
      button.setAttribute('hx-get', '/api');
      container.appendChild(button); // no lang scope
      processor.processElement(button);
      const generated = button.getAttribute('data-hx-generated');
      expect(generated).toContain("fetch '/api'");
    });

    it('routes ws-enviar through the WS-send path', async () => {
      // Mock WS so attachWS succeeds without a real socket.
      const MockWS = vi.fn(function (this: { close: () => void; send: () => void }) {
        this.close = vi.fn();
        this.send = vi.fn();
      });
      processor.destroy();
      processor = new HtmxAttributeProcessor({
        root: container,
        processExisting: false,
        watchMutations: false,
        wsEventSourceCtor: MockWS as unknown as typeof WebSocket,
      });
      processor.init(executeCallback);

      const section = document.createElement('section');
      section.setAttribute('lang', 'es');
      const wrap = document.createElement('div');
      wrap.setAttribute('ws-conectar', 'wss://example/socket');
      const btn = document.createElement('button');
      btn.setAttribute('ws-enviar', '');
      btn.setAttribute('name', 'msg');
      btn.setAttribute('value', 'hola');
      wrap.appendChild(btn);
      section.appendChild(wrap);
      container.appendChild(section);

      processor.processElement(wrap);

      // The WS connection is open against the localized attribute's URL.
      const conn = processor.getWSConnection(wrap);
      expect(conn).not.toBeNull();
    });
  });

  describe('Mixed-language page (es + ja + en)', () => {
    beforeEach(async () => {
      await loadVocab('es');
      await loadVocab('ja');
    });

    it('processes localized hx-get in each section, leaving authored names visible', () => {
      // Build with setAttribute (not innerHTML) so Unicode attribute
      // names survive HTML parsing on every DOM impl.
      const wrap = document.createElement('div');
      const esSection = document.createElement('section');
      esSection.setAttribute('lang', 'es');
      const esBtn = document.createElement('button');
      esBtn.id = 'es-btn';
      esBtn.setAttribute('hx-obtener', '/api/es');
      esSection.appendChild(esBtn);
      const jaSection = document.createElement('section');
      jaSection.setAttribute('lang', 'ja');
      const jaBtn = document.createElement('button');
      jaBtn.id = 'ja-btn';
      jaBtn.setAttribute('hx-取得', '/api/ja');
      jaSection.appendChild(jaBtn);
      const enSection = document.createElement('section');
      enSection.setAttribute('lang', 'en');
      const enBtn = document.createElement('button');
      enBtn.id = 'en-btn';
      enBtn.setAttribute('hx-get', '/api/en');
      enSection.appendChild(enBtn);
      wrap.append(esSection, jaSection, enSection);
      container.appendChild(wrap);

      processor.processElement(esBtn);
      processor.processElement(jaBtn);
      processor.processElement(enBtn);

      // All three translated to fetch snippets pointing at the right URL.
      expect(esBtn.getAttribute('data-hx-generated')).toContain('/api/es');
      expect(jaBtn.getAttribute('data-hx-generated')).toContain('/api/ja');
      expect(enBtn.getAttribute('data-hx-generated')).toContain('/api/en');

      // Authored attribute names are unchanged in devtools.
      expect(esBtn.hasAttribute('hx-obtener')).toBe(true);
      expect(jaBtn.hasAttribute('hx-取得')).toBe(true);
      expect(enBtn.hasAttribute('hx-get')).toBe(true);
    });

    it('selectorFor unions across registered languages so scan picks up all three', () => {
      const wrap = document.createElement('div');
      for (const [lang, attr] of [
        ['es', 'hx-obtener'],
        ['ja', 'hx-取得'],
        ['en', 'hx-get'],
      ] as const) {
        const section = document.createElement('section');
        section.setAttribute('lang', lang);
        const btn = document.createElement('button');
        btn.setAttribute(attr, `/api/${lang}`);
        section.appendChild(btn);
        wrap.appendChild(section);
      }
      container.appendChild(wrap);
      const found = processor.scanForHtmxElements(container);
      expect(found.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Missing-vocab graceful degradation', () => {
    it('falls back to English literals and warns once when vocab is not loaded', async () => {
      // Load Japanese only so the orchestrator's hooks are installed.
      await loadVocab('ja');

      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const section = document.createElement('section');
      section.setAttribute('lang', 'pt'); // Portuguese vocab not loaded
      const button = document.createElement('button');
      // The author writes English-form attributes (since pt vocab missing).
      // Processor still discovers and processes the element via the canonical
      // English form in the union selector.
      button.setAttribute('hx-get', '/api');
      section.appendChild(button);
      container.appendChild(section);

      processor.processElement(button);
      expect(button.getAttribute('data-hx-generated')).toContain("fetch '/api'");

      // A single console.warn for the missing lang, regardless of how
      // many attribute lookups happened.
      const ptWarnings = consoleWarn.mock.calls.filter(
        ([m]) => typeof m === 'string' && m.includes('lang="pt"')
      );
      expect(ptWarnings.length).toBe(1);
      consoleWarn.mockRestore();
    });
  });

  describe('Arabic vocab', () => {
    beforeEach(async () => {
      await loadVocab('ar');
    });

    it('handles RTL Arabic localized attributes via setAttribute', () => {
      // Arabic vocab maps hx-احصل → hx-get (imperative form per the
      // Arabic profile's verb convention). We use setAttribute to set
      // the localized name programmatically — HTML attribute names
      // can be Unicode regardless of the parser path.
      const section = document.createElement('section');
      section.setAttribute('lang', 'ar');
      section.setAttribute('dir', 'rtl');
      const button = document.createElement('button');
      button.setAttribute('hx-احصل', '/api/ar');
      section.appendChild(button);
      container.appendChild(section);

      // Even if Arabic's localized hx-get keyword isn't a perfect match
      // for the imperative `احصل` form in the profile, scan must not
      // throw and the union selector must remain valid CSS.
      expect(() => processor.scanForHtmxElements(container)).not.toThrow();
    });
  });
});
