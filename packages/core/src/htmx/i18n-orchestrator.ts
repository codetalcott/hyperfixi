/**
 * Vocab-aware orchestrator for the htmx-compat attribute layer.
 *
 * Adapts the [loka-js orchestrator pattern](../../../../loka-js/orchestrator.js)
 * for our three namespaces (`hx-*`, `sse-*`, `ws-*`). Vocab modules call
 * `register(lang, vocab)` to add localized attribute names and event
 * translations; the first registration installs vocab-aware hooks into
 * the central registry from [i18n-hooks.ts](./i18n-hooks.ts).
 *
 * Public surface:
 *
 *   window.__hyperfixi_i18n.register('es', {
 *     hyperfixi: {
 *       attrs: { 'sse-conectar': 'sse-connect', 'hx-objetivo': 'hx-target' },
 *       events: { clic: 'click', cambio: 'change' },
 *     },
 *   });
 *
 * Lookups resolve language per element via [langOf](./lang-resolver.ts) —
 * an ancestor walk over `data-hyperfixi-lang` then `lang`, defaulting to
 * `'en'`. Unknown languages or unknown keys silently fall back to English
 * literals; a one-time console warning fires per missing language so
 * authors notice when vocab modules aren't loaded.
 *
 * No runtime dependency on `@lokascript/semantic` — the orchestrator
 * stores whatever vocab is passed and doesn't validate against the
 * semantic registry. Regional variants (es-MX) collapse to base (es) via
 * `normLang` rather than walking `LanguageProfile.extends`.
 */

import { installHooks, type AttrNamespace, type I18nHooks } from './i18n-hooks.js';
import { langOf, normLang } from './lang-resolver.js';

export interface HyperfixiVocab {
  /**
   * Map of localized attribute name → canonical English form.
   * Both must be fully-qualified (e.g. `'sse-conectar': 'sse-connect'`),
   * not just suffixes. Identity mappings are valid but redundant.
   */
  attrs?: Record<string, string>;
  /**
   * Map of localized event name → canonical English form
   * (e.g. `'clic': 'click'`). Used by `eventNameOf` for translating
   * `hx-trigger` values from the authoring language.
   */
  events?: Record<string, string>;
}

interface VocabPayload {
  hyperfixi?: HyperfixiVocab;
}

/**
 * Per-language vocab Map. Lookups walk this Map per element-attribute
 * read, keyed by the normalized language code.
 */
const REG = new Map<string, HyperfixiVocab>();

/**
 * Inverted index keyed by `${ns}-${key}` (canonical) → localized name,
 * per language. Built once on register() so the hot path is a Map lookup.
 */
const localizedNameByKey = new Map<string, Map<string, string>>();

/** Languages we've already warned about being missing. */
const warnedMissingLang = new Set<string>();

let hooksInstalled = false;

/**
 * Listeners notified after a vocab registration completes. The
 * attribute processor subscribes so it can refresh its
 * `MutationObserver.attributeFilter` (which is captured once at observer
 * init and won't otherwise pick up newly-localized attribute names).
 * Stored as a Set so duplicate subscriptions deduplicate.
 */
const vocabUpdateListeners = new Set<() => void>();

/** Subscribe to vocab-registration notifications. Returns an unsubscribe fn. */
export function onVocabUpdate(listener: () => void): () => void {
  vocabUpdateListeners.add(listener);
  return () => {
    vocabUpdateListeners.delete(listener);
  };
}

/** Return every localized attribute name registered across all languages. */
export function getAllLocalizedAttrs(): string[] {
  const names = new Set<string>();
  for (const localized of localizedNameByKey.values()) {
    for (const name of localized.values()) names.add(name);
  }
  return [...names];
}

/**
 * Return every possible `<prefix>:` form for the colon-suffix `hx-on` family,
 * across all registered languages. Always includes the canonical `hx-on:`.
 * Used by the processor's hx-on discovery (which can't use CSS attribute-name
 * prefix matching) and `collectAttributes`'s `hx-on:*` extraction.
 */
export function getAllHxOnPrefixes(): string[] {
  const prefixes = new Set<string>(['hx-on:']);
  for (const localized of localizedNameByKey.values()) {
    const onForm = localized.get('hx-on');
    if (onForm) prefixes.add(`${onForm}:`);
  }
  return [...prefixes];
}

function invertAttrs(attrs: Record<string, string> | undefined): Map<string, string> {
  const out = new Map<string, string>();
  if (!attrs) return out;
  for (const [localized, canonical] of Object.entries(attrs)) {
    // Key by canonical so the hook can do `nameByKey.get('hx-get')`.
    out.set(canonical, localized);
  }
  return out;
}

function buildVocabAwareHooks(): I18nHooks {
  return {
    nameOf: (elt: Element, ns: AttrNamespace, key: string): string => {
      const canonical = `${ns}-${key}`;
      const lang = langOf(elt);
      if (lang === 'en') return canonical;
      const localized = localizedNameByKey.get(lang)?.get(canonical);
      if (localized) return localized;
      // Lang scope exists but no entry for this key — fall back to canonical.
      // Warn once per missing-language so authors notice unregistered vocab.
      if (!REG.has(lang) && !warnedMissingLang.has(lang)) {
        warnedMissingLang.add(lang);
        if (typeof console !== 'undefined') {
          console.warn(
            `[hyperfixi-i18n] No vocab registered for lang="${lang}". ` +
              `Elements in this language scope fall back to English attribute names. ` +
              `Load packages/core/dist/i18n/htmx/${lang}.js to opt in.`
          );
        }
      }
      return canonical;
    },
    selectorFor: (ns: AttrNamespace, key: string): string => {
      // Union over canonical + every registered language's localized form.
      // Stays a single CSS selector so callers (scan, detach) need no
      // changes; cost is proportional to number of registered languages.
      const canonical = `${ns}-${key}`;
      const names = new Set<string>([canonical]);
      for (const localized of localizedNameByKey.values()) {
        const v = localized.get(canonical);
        if (v) names.add(v);
      }
      return [...names].map(n => `[${n}]`).join(', ');
    },
    eventNameOf: (elt: Element, value: string): string => {
      const lang = langOf(elt);
      if (lang === 'en') return value;
      return REG.get(lang)?.events?.[value] ?? value;
    },
  };
}

/**
 * Register a vocab module for a language. Idempotent — re-registering
 * a language replaces its vocab entirely. The first call swaps the
 * default hooks for the vocab-aware impls; subsequent calls just
 * update the registry.
 *
 * The expected shape comes from the vocab modules generated by
 * `packages/core/scripts/gen-htmx-vocab.mjs` (Phase 8c).
 */
export function register(code: string, data: VocabPayload): void {
  const lang = normLang(code);
  const vocab = data?.hyperfixi ?? {};
  REG.set(lang, vocab);
  localizedNameByKey.set(lang, invertAttrs(vocab.attrs));
  warnedMissingLang.delete(lang); // we know about it now
  if (!hooksInstalled) {
    installHooks(buildVocabAwareHooks());
    hooksInstalled = true;
  }
  // Notify subscribers (htmx processor refreshes its MutationObserver
  // attributeFilter so dynamic adds of localized-name attributes
  // trigger reprocessing).
  for (const listener of vocabUpdateListeners) listener();
}

/** Inspect whether any vocab is registered for a language. Mainly for tests. */
export function isLangRegistered(code: string): boolean {
  return REG.has(normLang(code));
}

/**
 * Reset orchestrator state — drop all registrations and uninstall hooks.
 * Mainly for tests; production code should leave registrations in place.
 */
export function resetOrchestrator(): void {
  REG.clear();
  localizedNameByKey.clear();
  warnedMissingLang.clear();
  vocabUpdateListeners.clear();
  hooksInstalled = false;
  // Caller is responsible for resetHooks() if they want defaults restored.
}

/**
 * Install the public `window.__hyperfixi_i18n` API so vocab modules
 * (`vocab/htmx/{lang}.js`) can call `register()` on it. Idempotent.
 *
 * Two minification hazards this avoids — both load-bearing:
 *   1. Bundle entries MUST `import { installPublicAPI }` and call it
 *      explicitly. The module-level invocation below survives Rollup but
 *      Terser's `unused: true, toplevel: true` pass elides it under
 *      `sideEffects: false`. See browser-bundle-hybrid-hx*.ts.
 *   2. Property access uses bracket-with-string-constant rather than dot
 *      access. Terser's `properties.regex: /^_/` mangles dot access to
 *      `_`-prefixed properties (`w.__hyperfixi_i18n` → `w.X`), but leaves
 *      bracket access via a string constant alone. The
 *      `__hyperfixi_parser_extension_registry__` singleton uses the same
 *      trick — see packages/core/src/parser/extensions.ts.
 */
const WINDOW_KEY = '__hyperfixi_i18n';

export function installPublicAPI(): void {
  if (typeof window === 'undefined') return;
  const w = window as unknown as Record<string, { register: typeof register } | undefined>;
  if (w[WINDOW_KEY]) return;
  w[WINDOW_KEY] = { register };
}

installPublicAPI();
