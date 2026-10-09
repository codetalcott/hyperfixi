/**
 * The `element` that scopes a variable, in each language's own word (M2,
 * vocabulary sheet A10): `set element x to 10` is es `establecer elemento x a
 * 10`. It was English in every translation (P45 kept every scope word so). The
 * word is the dictionary's `values.element` (a test holds the table to it),
 * which the value pass already wrote inside an expression; the tokenizer fuses
 * it and the name after it into the one name upstream reads, as it does
 * English's (registry.ts fuseScopedNames). bn, he, th and vi take the sheet's
 * words. `global`, `local` and `dom` stay English (sheet C3, C4).
 *
 * It sits outside `parser/` because the registry reads it, and every language
 * module reaches the registry (language-module-reach.test.ts).
 */
export const ELEMENT_SCOPE: Readonly<Record<string, string>> = {
  ar: 'عنصر',
  bn: 'উপাদান',
  de: 'element',
  es: 'elemento',
  fr: 'élément',
  he: 'אלמנט',
  hi: 'तत्व',
  id: 'elemen',
  it: 'elemento',
  ja: '要素',
  ko: '요소',
  ms: 'elemen',
  pl: 'element',
  pt: 'elemento',
  qu: 'raku',
  ru: 'элемент',
  sw: 'kipengele',
  th: 'องค์ประกอบ',
  tl: 'elemento',
  tr: 'öğe',
  uk: 'елемент',
  vi: 'phần tử',
  zh: '元素',
};

/** The `element` a translation writes before a scoped name: the language's own, or English's. */
export function elementScopeWord(language: string): string {
  return ELEMENT_SCOPE[language] ?? 'element';
}
