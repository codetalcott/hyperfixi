/**
 * `fetch … do not throw` in each language's own words (M2, vocabulary sheet A8).
 *
 * The phrase was English in every translation. Each language already has the
 * two words it needs, the dictionary's `not` and its `throw` command, so a
 * translation writes those, in the language's order: the negation before the
 * verb (es `no lanzar`), or after it where the language negates after (ja
 * `投げる ではない`, tr `fırlat değil`, bn `নিক্ষেপ না`). The renderer writes
 * them after the whole fetch, where English writes its phrase, and the reader
 * excises them there (tryDoNotThrow), as it does English's phrase, which it
 * still reads in every language.
 *
 * Kept here, beside the reader, rather than read from the render lexicon: a
 * slim bundle parses without one. A test holds each entry to the dictionary's
 * words (policy 5). he has no `not` yet (sheet B7) and keeps English's phrase.
 */
export const NOT_THROW_BY_LANG: Readonly<Record<string, readonly string[]>> = {
  ar: ['ليس', 'ارم'],
  bn: ['নিক্ষেপ', 'না'],
  de: ['nicht', 'werfen'],
  en: ['do', 'not', 'throw'],
  es: ['no', 'lanzar'],
  fr: ['non', 'lancer'],
  hi: ['नहीं', 'फेंकें'],
  id: ['bukan', 'lempar'],
  it: ['non', 'lanciare'],
  ja: ['投げる', 'ではない'],
  ko: ['아니', '던지다'],
  ms: ['bukan', 'lempar'],
  pl: ['nie', 'rzuć'],
  pt: ['não', 'lançar'],
  qu: ['mana', 'chanqay'],
  ru: ['не', 'бросить'],
  sw: ['si', 'tupa'],
  th: ['ไม่', 'โยน'],
  tl: ['hindi', 'ihagis'],
  tr: ['fırlat', 'değil'],
  uk: ['не', 'кинути'],
  vi: ['không', 'ném'],
  zh: ['非', '抛出'],
};

/** The words a translation writes for `do not throw`: the language's own, or English's. */
export function notThrowWords(language: string): readonly string[] {
  return NOT_THROW_BY_LANG[language] ?? NOT_THROW_BY_LANG.en!;
}
