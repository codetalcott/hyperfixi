/**
 * Per-element language resolution for htmx-compat attribute names.
 *
 * Mirrors loka-js's [lang-resolver.js](../../../../loka-js/lang-resolver.js)
 * — the resolution order is:
 *
 *   1. `data-hyperfixi-lang` attribute on the element itself
 *   2. `data-hyperfixi-lang` on any ancestor
 *   3. `lang` attribute on any ancestor (HTML standard)
 *   4. `'en'` fallback
 *
 * Results are normalized to the part before the first `-` (`es-MX` → `es`)
 * and lowercased so callers can index vocab maps by 2-letter code without
 * caring about regional variants.
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
