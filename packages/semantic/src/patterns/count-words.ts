/**
 * Each language's own word for `times` (PR 127).
 *
 * The render writes the dictionary's word: bn, ms, th, tl and vi have one, and
 * every other language writes English `times`, so a writer's own word was
 * unknown: es `repetir n veces` read `repeat forever`, and de `wiederholen 3
 * mal setze x auf 1` lost its body to the generated pattern's event slot. The
 * words are read, never written, with the forms a small count takes (es `1
 * vez`, ru `2 раза`).
 *
 * Data only: the counted-loop heads (`repeat.ts`) and the parser's count
 * readers (`countsBefore`) both read it.
 */
export const NATIVE_COUNT_WORDS: Readonly<Record<string, readonly string[]>> = {
  ar: ['مرات', 'مرة'],
  bn: ['বার'],
  de: ['mal', 'Mal'],
  es: ['veces', 'vez'],
  fr: ['fois'],
  he: ['פעמים', 'פעם'],
  hi: ['बार'],
  id: ['kali'],
  it: ['volte', 'volta'],
  ja: ['回', '度'],
  ko: ['번', '회'],
  ms: ['kali'],
  pl: ['razy', 'raz'],
  pt: ['vezes', 'vez'],
  qu: ['kuti'],
  ru: ['раз', 'раза'],
  sw: ['mara'],
  th: ['ครั้ง'],
  tl: ['beses'],
  tr: ['kez', 'kere', 'defa'],
  uk: ['разів', 'рази', 'раз'],
  vi: ['lần'],
  zh: ['次', '遍'],
};
