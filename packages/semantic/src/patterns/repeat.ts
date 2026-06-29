/**
 * Counted-loop HEAD patterns: `{verb} [marker] {quantity} {countWord}`.
 *
 * Mirrors the English `repeat {quantity} times` HEAD pattern (en.ts, #521): it
 * captures the count as `quantity:literal` and defaults `loopType:literal="times"`,
 * stopping after the count word so the loop BODY is parsed by the surrounding
 * clause loop (not swallowed). Without it the generated positional `repeat` pattern
 * grabs the NUMBER as `loopType` and drops `quantity` — the `repeat.quantity:literal`
 * R1 residue.
 *
 * Verb-FIRST languages only (SVO/VSO): the count phrase follows the verb, so the
 * en-shaped HEAD pattern applies directly. SOV languages (ja/ko/tr/hi/bn/qu) front
 * the count ahead of a clause-final verb — a different structure, left for later.
 *
 * The count word is taken VERBATIM from the corpus: most languages leave the
 * English `times` untranslated (es `repetir 3 times`); a few translate it
 * (th `ครั้ง`, vi `lần`, tl `beses`).
 */

import type { LanguagePattern } from '../types';

/**
 * One verb-first counted-loop HEAD pattern.
 * @param markerBefore optional token between the verb and the count (he accusative
 *   `את`, zh object marker `把`).
 */
function repeatTimesHead(
  language: string,
  verb: string,
  countWord: string,
  markerBefore?: string
): LanguagePattern {
  const tokens: LanguagePattern['template']['tokens'] = [];
  // The verb may be multi-word (vi `lặp lại`); split into literal tokens.
  for (const w of verb.split(/\s+/)) tokens.push({ type: 'literal', value: w });
  if (markerBefore) tokens.push({ type: 'literal', value: markerBefore });
  tokens.push({ type: 'role', role: 'quantity', expectedTypes: ['literal', 'expression'] });
  tokens.push({ type: 'literal', value: countWord });
  return {
    id: `repeat-${language}-times`,
    language,
    command: 'repeat',
    priority: 110, // > the generated positional repeat (100)
    template: {
      format: `${verb}${markerBefore ? ' ' + markerBefore : ''} {quantity} ${countWord}`,
      tokens,
    },
    extraction: {
      loopType: { default: { type: 'literal', value: 'times' } },
    },
  };
}

// [lang, repeat-verb (corpus form), count-word, markerBefore?]
const VERB_FIRST_REPEAT_TIMES: Array<[string, string, string, string?]> = [
  ['es', 'repetir', 'times'],
  ['de', 'wiederholen', 'times'],
  ['fr', 'répéter', 'times'],
  ['it', 'ripetere', 'times'],
  ['pt', 'repetir', 'times'],
  ['ru', 'повторить', 'times'],
  ['uk', 'повторити', 'times'],
  ['pl', 'powtórz', 'times'],
  ['ar', 'كرر', 'times'],
  ['he', 'חזור', 'times', 'את'],
  ['id', 'ulangi', 'times'],
  ['ms', 'ulang', 'times'],
  ['sw', 'rudia', 'times'],
  ['th', 'ทำซ้ำ', 'ครั้ง'],
  ['vi', 'lặp lại', 'lần'],
  ['tl', 'ulitin', 'beses'],
  ['zh', '重复', 'times', '把'],
];

const BY_LANG = new Map<string, LanguagePattern[]>();
for (const [lang, verb, countWord, marker] of VERB_FIRST_REPEAT_TIMES) {
  BY_LANG.set(lang, [repeatTimesHead(lang, verb, countWord, marker)]);
}

/**
 * Get counted-loop HEAD patterns for a specific language.
 */
export function getRepeatPatternsForLanguage(language: string): LanguagePattern[] {
  return BY_LANG.get(language) ?? [];
}
