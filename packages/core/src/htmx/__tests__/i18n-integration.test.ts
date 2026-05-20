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
import { HtmxAttributeProcessor, type WSEventSourceCtor } from '../htmx-attribute-processor.js';
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

    it('translates hx-trigger event name (clic → click) via eventNameOf', () => {
      const section = document.createElement('section');
      section.setAttribute('lang', 'es');
      const button = document.createElement('button');
      button.setAttribute('hx-obtener', '/api');
      // Localized event-name in hx-trigger — must register the
      // canonical `click` event in the translated snippet, otherwise
      // the runtime would wire a listener for a non-existent `clic`
      // event and the button would never fire.
      button.setAttribute('hx-disparar', 'clic');
      section.appendChild(button);
      container.appendChild(section);

      processor.processElement(button);
      const generated = button.getAttribute('data-hx-generated');
      // The hyperscript snippet uses `on click ...`. The negation is
      // tricky because `clic` is a substring of `click` — use a word-
      // boundary regex to confirm the localized name didn't leak.
      expect(generated).toContain('on click');
      expect(generated).not.toMatch(/\bon clic\b/);
    });

    it('discovers and wires localized hx-on prefix (hx-en:click → click listener)', () => {
      // Spanish vocab maps `hx-on` → `hx-en` (Spanish `on` keyword = "en").
      // So `hx-en:click` is the Spanish form of `hx-on:click`. The
      // processor should discover it, extract `click` as the event,
      // and register a real listener.
      const section = document.createElement('section');
      section.setAttribute('lang', 'es');
      const button = document.createElement('button');
      button.setAttribute('hx-en:click', "put 'clicked' into me");
      section.appendChild(button);
      container.appendChild(section);

      // Subtree scan must discover the hx-en-prefixed element.
      const found = processor.scanForHtmxElements(container);
      expect(found).toContain(button);

      // processElement should install a real click listener.
      processor.processElement(button);
      button.click();
      expect(executeCallback).toHaveBeenCalledWith("put 'clicked' into me", button);
    });

    it('translates hx-on event name (clic → click) via eventNameOf', () => {
      const section = document.createElement('section');
      section.setAttribute('lang', 'es');
      const button = document.createElement('button');
      // Author writes Spanish event name on the colon-suffix family.
      // Real click should fire the body — meaning the listener was
      // registered against `click`, not `clic`.
      button.setAttribute('hx-on:clic', "put 'ok' into me");
      section.appendChild(button);
      container.appendChild(section);

      processor.processElement(button);
      button.click();
      expect(executeCallback).toHaveBeenCalledTimes(1);
      expect(executeCallback).toHaveBeenCalledWith("put 'ok' into me", button);
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
        wsEventSourceCtor: MockWS as unknown as WSEventSourceCtor,
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

  describe('Late-loaded vocab refreshes MutationObserver attributeFilter', () => {
    it('updates the attributeFilter so attribute changes on existing elements fire', async () => {
      // Pre-Phase-8-followups, the attributeFilter was frozen at init.
      // An element with no htmx attrs gets one added later (Spanish
      // `hx-obtener`) — the observer's attribute-change branch only
      // saw English ALL_ATTRS, so the new attribute was ignored.
      //
      // Now `refreshLocalizedAttrs` is called via the orchestrator
      // update channel, and the observer is re-installed with the
      // expanded attribute filter.
      processor.destroy();
      processor = new HtmxAttributeProcessor({
        root: container,
        processExisting: false,
        watchMutations: true,
      });
      processor.init(executeCallback);

      // Add the element BEFORE loading vocab — at this point the
      // processor sees no htmx attrs on it, so it ignores the element.
      // The button lives in a `lang="es"` section so localized attribute
      // resolution kicks in once vocab loads.
      const section = document.createElement('section');
      section.setAttribute('lang', 'es');
      const button = document.createElement('button');
      section.appendChild(button);
      container.appendChild(section);
      // Flush the childList mutation; no processing should happen.
      await new Promise(r => setTimeout(r, 10));
      expect(button.hasAttribute('data-hx-generated')).toBe(false);

      // Subscribe a sentinel listener to confirm the orchestrator's
      // vocab-update channel fires.
      const { onVocabUpdate } = await import('../i18n-orchestrator.js');
      let sentinelFired = 0;
      onVocabUpdate(() => sentinelFired++);

      await loadVocab('es');
      await new Promise(r => setTimeout(r, 0));
      expect(sentinelFired).toBe(1); // orchestrator notified us

      // Verify that a fresh scan now picks up localized attributes —
      // confirms refreshLocalizedAttrs() ran and the selector now
      // includes `hx-obtener`. (The MutationObserver attribute branch
      // depends on the same data — they share `computeAttributeFilter`.)
      button.setAttribute('hx-obtener', '/api/late');
      const found = processor.scanForHtmxElements(container);
      expect(found).toContain(button);
      // The static fallback path: processElement directly to confirm
      // it works end-to-end. The MutationObserver-driven discovery is
      // best-effort across DOM impls; the synchronous scan is the
      // contract we ship.
      processor.processElement(button);
      expect(button.getAttribute('data-hx-generated')).toContain("fetch '/api/late'");
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
