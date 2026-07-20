/**
 * Resolver mode — the adapter's mechanism-(c) form, usable today against
 * the reference-patched htmx build (docs/reference-patches/) and ready
 * for upstream if the attribute-resolver seam lands.
 *
 * Where the default shim CANONICALIZES (copies localized attrs onto the
 * element), resolver mode answers htmx's attribute lookups directly:
 * core asks "what should I read for `hx-get` on this element?" and the
 * resolver returns the localized name actually present (`hx-obtener`)
 * for the element's language scope. Zero DOM mutation, fully
 * devtools-faithful — the loka-js ideal.
 *
 * Two seams must both be fed (the loka-js lesson): the per-element
 * resolver answers reads, and `additionalAttributeSelectors` feeds the
 * document-level discovery scan, which a per-element function cannot
 * drive. `installResolverMode()` wires both and keeps the selector list
 * fresh as vocab modules register.
 *
 * Scope: value-bearing attributes only. The hx-on colon family stays
 * with the shim/executor mode — its event name is part of the attribute
 * NAME, which is a different question than "what name holds this
 * value". Trigger VALUES (`hx-trigger="clic"`) are also name-level
 * out-of-scope; keep authoring canonical event values, or pair with
 * executor mode.
 */

import { langOf } from './lang-resolver.js';
import { onVocabUpdate, vocabFor, vocabLangs } from './registry.js';

let resolverModeActive = false;

/** True while resolver mode owns localization (the shim stands down). */
export function isResolverMode(): boolean {
  return resolverModeActive;
}

/** Mainly for tests; installResolverMode() manages this in production. */
export function setResolverMode(active: boolean): void {
  resolverModeActive = active;
}

/**
 * The per-element resolver htmx consults on attribute reads:
 * `(elt, canonicalName) → localized name present on elt, or null`.
 */
export function attributeResolver(elt: Element, name: string): string | null {
  const lang = langOf(elt);
  if (lang === 'en') return null;
  const attrs = vocabFor(lang)?.attrs;
  if (!attrs) return null;
  for (const [localized, canonical] of Object.entries(attrs)) {
    if (canonical === name && elt.hasAttribute?.(localized)) return localized;
  }
  return null;
}

/**
 * CSS attribute selectors for every registered localized name, for
 * htmx's discovery scan (`config.additionalAttributeSelectors`). The
 * hx-on family is excluded — see the module header.
 */
export function additionalAttributeSelectors(): string[] {
  const names = new Set<string>();
  for (const lang of vocabLangs()) {
    const attrs = vocabFor(lang)?.attrs ?? {};
    for (const [localized, canonical] of Object.entries(attrs)) {
      if (canonical === 'hx-on') continue;
      names.add(`[${localized}]`);
    }
  }
  return [...names];
}

interface ResolverConfigurableHtmx {
  config?: {
    attributeResolver?: ((elt: Element, name: string) => string | null) | null;
    additionalAttributeSelectors?: string[];
  };
}

/**
 * Wire resolver mode into a (reference-patched) htmx instance: install
 * the resolver, feed the discovery selectors, keep them fresh on vocab
 * registration, and stand the canonicalization shim down. Returns an
 * uninstall function that restores shim behavior.
 */
export function installResolverMode(htmx: ResolverConfigurableHtmx): () => void {
  if (!htmx?.config) {
    throw new Error('[htmx-i18n] installResolverMode: htmx.config not found');
  }
  const cfg = htmx.config;
  cfg.attributeResolver = attributeResolver;
  cfg.additionalAttributeSelectors = additionalAttributeSelectors();
  const unsubscribe = onVocabUpdate(() => {
    cfg.additionalAttributeSelectors = additionalAttributeSelectors();
  });
  resolverModeActive = true;
  return () => {
    unsubscribe();
    cfg.attributeResolver = null;
    cfg.additionalAttributeSelectors = [];
    resolverModeActive = false;
  };
}
