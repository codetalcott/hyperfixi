/**
 * Curated per-language block-terminator surfaces.
 *
 * These sets are AUDITED for two collision classes and deliberately exclude
 * the colliding words:
 *  - exit/end homonyms (ja 終了, ko 종료, de beenden are the dicts' `exit`
 *    emissions — listing them made an `exit` inside a block read as the block
 *    terminator);
 *  - positional-`last` homonyms (ar آخر, bn শেষ ARE the positional words —
 *    listing them chopped clauses at every positional last).
 * The inverse also holds and is load-bearing: a word IN a curated set is
 * never the positional `last` (tr emits `sonuncu` for last, `son` stays the
 * terminator; qu last is `qhipa`, not `tukuy`), so role captures and value
 * groups can treat it as structural residue unconditionally.
 *
 * Shared by the semantic parser's isEndKeyword and the pattern matcher's
 * role-value guards (pattern-matcher can't import semantic-parser — cycle).
 */
const CURATED_END_KEYWORDS: Record<string, Set<string>> = {
  en: new Set(['end']),
  // 終了 is deliberately ABSENT: it is the i18n dict's `exit` emission
  // (`exit: 終了`, ja.ts), and listing it as an `end` alternative made the
  // body parser count an `exit` inside an `if … exit … end` block as the
  // block terminator — so the real 終わり closed the whole handler body,
  // dropping every command after the block (behavior-sortable degenerate).
  // 終わり is the dict's `end` emission; おわり is the kana variant.
  ja: new Set(['終わり', 'おわり']),
  // ar آخر is deliberately ABSENT: it is the positional `last` keyword;
  // listing it here chopped clauses at every positional last (ar focus-trap
  // lost its if-branch body). النهاية is what the i18n dict emits for end.
  ar: new Set(['نهاية', 'انتهى', 'النهاية']),
  es: new Set(['fin', 'final', 'terminar']),
  // 종료 is deliberately ABSENT — same exit/end collision as ja above
  // (`exit: 종료`, ko.ts). 끝 is the dict's `end` emission; 마침 a variant.
  ko: new Set(['끝', '마침']),
  zh: new Set(['结束', '终止', '完']),
  tr: new Set(['son', 'bitiş', 'bitti']),
  pt: new Set(['fim', 'final', 'término']),
  fr: new Set(['fin', 'terminer', 'finir']),
  // beenden is deliberately ABSENT — same exit/end collision as ja above
  // (`exit: beenden`, de.ts; the de profile's `end` alternatives are only
  // ['ende', 'fertig'], so this hardcoded set was the lone offender).
  de: new Set(['ende', 'fertig']),
  id: new Set(['selesai', 'akhir', 'tamat']),
  tl: new Set(['wakas', 'tapos']),
  bn: new Set(['সমাপ্ত']),
  qu: new Set(['tukukuy', 'tukuy', 'puchukay']),
  sw: new Set(['mwisho', 'maliza', 'tamati']),
};

/** The curated set for a language, or undefined for profile-fallback languages. */
export function curatedEndKeywordSet(language: string): Set<string> | undefined {
  return CURATED_END_KEYWORDS[language];
}

/**
 * True when `value` is one of the language's CURATED terminator surfaces
 * (audited to never be positional `last` — see the map's doc comment). Does
 * NOT include the universal English-literal `end` acceptance or the
 * profile-keyword fallback; callers wanting full terminator detection use the
 * semantic parser's isEndKeyword.
 */
export function isCuratedEndKeyword(value: string, language: string): boolean {
  return CURATED_END_KEYWORDS[language]?.has(value.toLowerCase()) ?? false;
}
