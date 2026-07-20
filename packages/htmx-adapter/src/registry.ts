/**
 * Vocab registry for the upstream-htmx adapter.
 *
 * Accepts the SAME payload shape as hyperfixi core's htmx-compat
 * orchestrator (`packages/core/src/htmx/i18n-orchestrator.ts`), so the
 * generated vocab modules under `packages/core/vocab/htmx/{lang}.js`
 * (which call `window.__hyperfixi_i18n.register(lang, payload)`) work
 * verbatim against this adapter — one generated artifact, two consumers.
 *
 *   register('es', {
 *     hyperfixi: {
 *       attrs: { 'hx-obtener': 'hx-get', 'sse-conectar': 'sse-connect' },
 *       events: { clic: 'click', cambiar: 'change' },
 *     },
 *   });
 *
 * Unlike core's orchestrator this registry needs no inverted index: the
 * adapter canonicalizes (localized → canonical), which is exactly the
 * direction the parse maps are published in. There is deliberately no
 * KEYS copy here either — the vocab data is self-describing (full
 * attribute names on both sides), so the canonical key set lives only in
 * core's generator (`packages/core/scripts/gen-htmx-vocab.mjs`).
 */

import { normLang } from './lang-resolver.js';

export interface HtmxVocab {
  /** Map of localized attribute name → canonical English form (fully qualified). */
  attrs?: Record<string, string>;
  /** Map of localized event name → canonical English form (`'clic'` → `'click'`). */
  events?: Record<string, string>;
}

export interface VocabPayload {
  hyperfixi?: HtmxVocab;
}

/** Per-language vocab, keyed by normalized language code. */
const REG = new Map<string, HtmxVocab>();

/** Languages we've already warned about being missing. */
const warnedMissingLang = new Set<string>();

/** Listeners notified after a vocab registration completes. */
const vocabUpdateListeners = new Set<() => void>();

/**
 * Register a vocab module for a language. Idempotent — re-registering a
 * language replaces its vocab entirely.
 */
export function register(code: string, data: VocabPayload): void {
  const lang = normLang(code);
  REG.set(lang, data?.hyperfixi ?? {});
  warnedMissingLang.delete(lang); // we know about it now
  for (const listener of vocabUpdateListeners) listener();
}

/** Look up the vocab registered for a (normalized) language code. */
export function vocabFor(lang: string): HtmxVocab | undefined {
  return REG.get(lang);
}

/** Inspect whether any vocab is registered for a language. Mainly for tests. */
export function isLangRegistered(code: string): boolean {
  return REG.has(normLang(code));
}

/** True if at least one language has registered vocab. */
export function hasAnyVocab(): boolean {
  return REG.size > 0;
}

/** Subscribe to vocab-registration notifications. Returns an unsubscribe fn. */
export function onVocabUpdate(listener: () => void): () => void {
  vocabUpdateListeners.add(listener);
  return () => {
    vocabUpdateListeners.delete(listener);
  };
}

/**
 * Warn once per language that an element sits in a lang scope with no
 * registered vocab, so authors notice unloaded vocab modules instead of
 * silently getting English-only behavior.
 */
export function warnMissingLangOnce(lang: string): void {
  if (warnedMissingLang.has(lang)) return;
  warnedMissingLang.add(lang);
  if (typeof console !== 'undefined') {
    console.warn(
      `[htmx-i18n] No vocab registered for lang="${lang}". ` +
        `Elements in this language scope keep their localized attribute names ` +
        `and htmx will not see them. Load the ${lang} vocab module ` +
        `(packages/core/vocab/htmx/${lang}.js) before htmx processes the page.`
    );
  }
}

/**
 * Reset registry state — drop all registrations and listeners. Mainly for
 * tests; production code should leave registrations in place.
 */
export function resetRegistry(): void {
  REG.clear();
  warnedMissingLang.clear();
  vocabUpdateListeners.clear();
}
