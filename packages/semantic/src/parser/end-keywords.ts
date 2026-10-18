/**
 * End words, defined: the one definition of an end word ({@link endWordKind}),
 * the curated per-language surfaces it reads, and the place a word stands in.
 * The readers that ask the parser's questions of one are in `end-words.ts`;
 * this layer sits below the expression lexicon, which reads end words too (C3,
 * END_WORD_READERS.md).
 *
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
 * A language with no curated set (hi, it, ms, pl, ru, th, uk, vi, he) reads its
 * profile's end words the same way: none of them is its positional `last`.
 */
import type { LanguageToken } from '../types';
import { tryGetProfile } from '../registry';

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

const NO_WORDS: ReadonlySet<string> = new Set();
const profileEndWordsMemo = new WeakMap<object, ReadonlySet<string>>();

/**
 * The profile's own words for `end` (primary and alternatives), lowercased.
 * Memoized per profile: endWordKind runs for nearly every token the parser
 * reads.
 */
function profileEndWords(language: string): ReadonlySet<string> {
  const profile = tryGetProfile(language);
  if (!profile) return NO_WORDS;
  let words = profileEndWordsMemo.get(profile);
  if (!words) {
    const entry = profile.keywords?.end;
    words = new Set(
      (entry ? [entry.primary, ...(entry.alternatives ?? [])] : [])
        .filter((word): word is string => !!word)
        .map(word => word.toLowerCase())
    );
    profileEndWordsMemo.set(profile, words);
  }
  return words;
}

/**
 * What kind of end word a token is, if it is one:
 *
 * - `'curated'`, read by its value and never the positional `last`: the
 *   English literal `end` (a translation passes it through, and a masked `js
 *   … end` restores it in every language), a word of the language's curated
 *   set, or, where no set is curated, one of the profile's words for `end`;
 * - `'end'`: any other keyword the tokenizer normalized to `end`, or a profile
 *   word the curated set leaves out (bn `শেষ`, which is also the positional
 *   `last`). Before a selector it is that `last` (`শেষ <li/>`): see
 *   isEndWordAt.
 *
 * The one definition (C3): every reader asks it, through the readings in
 * end-words.ts. A string keeps its quotes, so `"end"` is none.
 */
export function endWordKind(token: LanguageToken, language: string): EndWordKind | null {
  const value = token.value.toLowerCase();
  if (value === 'end') return 'curated';
  const profileWords = profileEndWords(language);
  const curated = CURATED_END_KEYWORDS[language];
  if (curated ? curated.has(value) : profileWords.has(value)) return 'curated';
  if (token.kind === 'keyword' && (token.normalized ?? token.value).toLowerCase() === 'end') {
    return 'end';
  }
  return profileWords.has(value) ? 'end' : null;
}

export type EndWordKind = 'curated' | 'end';

/**
 * An end word of either kind, wherever it stands. Read before a selector too:
 * the expression lexicon's join and sense words, and the block parser, which
 * splits a bn program at `শেষ` before the next handler's `.close থেকে ক্লিকে`.
 */
export function isEndWord(token: LanguageToken, language: string): boolean {
  return endWordKind(token, language) !== null;
}

/**
 * Every surface an end word has by value in a language (`end`, the curated
 * set, the profile's words): the block parser's cheap pre-guard, which looks
 * for one in the raw input before it tokenizes.
 */
export function endWordSurfaces(language: string): ReadonlySet<string> {
  return new Set(['end', ...(CURATED_END_KEYWORDS[language] ?? []), ...profileEndWords(language)]);
}

/**
 * Where an end word stands: the two tokens either side of it. `beforePrev`
 * says whether `prev` is itself a value (a verb's or a marker's), and
 * `afterNext` whether `next` is the end word's own marker.
 */
export interface EndWordPlace {
  readonly prev?: LanguageToken | undefined;
  readonly beforePrev?: LanguageToken | undefined;
  /** The token before `beforePrev`. */
  readonly third?: LanguageToken | undefined;
  readonly next?: LanguageToken | undefined;
  readonly afterNext?: LanguageToken | undefined;
}

/** The place of the token at `i` of `tokens`. */
export function endWordPlace(tokens: readonly LanguageToken[], i: number): EndWordPlace {
  return {
    prev: tokens[i - 1],
    beforePrev: tokens[i - 2],
    third: tokens[i - 3],
    next: tokens[i + 1],
    afterNext: tokens[i + 2],
  };
}
