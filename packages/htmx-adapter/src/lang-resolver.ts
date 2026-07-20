/**
 * Per-element language resolution for localized htmx attribute names.
 *
 * Mirrors `packages/core/src/htmx/lang-resolver.ts` (which in turn mirrors
 * loka-js's `lang-resolver.js`) so a page migrating between hyperfixi's
 * embedded htmx-compat layer and this upstream-htmx adapter resolves
 * languages identically. Resolution order:
 *
 *   1. `data-hyperfixi-lang` attribute on the element itself
 *   2. `data-hyperfixi-lang` on any ancestor
 *   3. `lang` attribute on any ancestor (HTML standard)
 *   4. `'en'` fallback
 *
 * Results are normalized to the part before the first `-`/`_` (`es-MX` →
 * `es`) and lowercased so callers can index vocab maps by 2-letter code
 * without caring about regional variants.
 */

/** Normalize a language tag — `es-MX` / `ES_mx` → `es`. */
export function normLang(s: string | null | undefined): string {
  if (!s) return 'en';
  return s.split(/[-_]/)[0].toLowerCase();
}

/** Resolve the language code for an element via ancestor walk. */
export function langOf(elt: Element): string {
  const own = elt.getAttribute?.('data-hyperfixi-lang');
  if (own) return normLang(own);
  const dx = elt.closest?.('[data-hyperfixi-lang]');
  if (dx) return normLang(dx.getAttribute('data-hyperfixi-lang'));
  const la = elt.closest?.('[lang]');
  if (la) return normLang(la.getAttribute('lang'));
  return 'en';
}
