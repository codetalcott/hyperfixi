/**
 * The language an element's hyperscript is written in.
 *
 * A module of its own, with no imports, on purpose: `dom/attribute-processor.ts`
 * and the parser-free multilingual bundle both need this walk, and importing it
 * from the processor pulled the whole processor (and its `ast/legacy` reach)
 * into that bundle — measured 2026-09-03 by CI's size job, 91.2 → 93.2 KB
 * gzipped for a 20-line function. Here it costs nothing to share.
 */

export const DEFAULT_LANGUAGE = 'en';

/**
 * `data-lang` on the element, else the closest `lang` attribute (`en-US` →
 * `en`), else the document's, else English.
 */
export function detectLanguage(element: Element): string {
  const dataLang = element.getAttribute('data-lang');
  if (dataLang) return dataLang;

  const langAttr = element.closest('[lang]')?.getAttribute('lang');
  if (langAttr) return langAttr.split('-')[0];

  if (typeof document !== 'undefined') {
    const docLang = document.documentElement?.lang;
    if (docLang) return docLang.split('-')[0];
  }

  return DEFAULT_LANGUAGE;
}
