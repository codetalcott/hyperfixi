/**
 * Counted-loop HEAD patterns: `{verb} [marker] {quantity} {countWord}` (verb-first)
 * and `{quantity} {countWord} {marker} {verb}` (verb-last / SOV).
 *
 * Mirrors the English `repeat {quantity} times` HEAD pattern (en.ts, #521): it
 * captures the count as `quantity:literal` and defaults `loopType:literal="times"`,
 * stopping after the count word so the loop BODY is parsed by the surrounding
 * clause loop (not swallowed). Without it the generated positional `repeat` pattern
 * grabs the NUMBER as `loopType` and drops `quantity` — the `repeat.quantity:literal`
 * R1 residue.
 *
 * Two surface shapes:
 * - **Verb-FIRST** (SVO/VSO): the count phrase follows the verb, so the en-shaped
 *   HEAD pattern applies directly (`repetir 3 times`).
 * - **Verb-LAST** (SOV ja/ko/tr/hi/bn): the count is FRONTED ahead of a clause-final
 *   verb (`3 times を 繰り返し` = `{quantity} {countWord} {objMarker} {verb}`). Inside
 *   an event handler the event is stripped first, so the body clause re-parse sees
 *   exactly this 4-token shape; without a dedicated HEAD the generated positional
 *   repeat mis-binds the count to `loopType:literal=3` and drops `quantity`. (qu is
 *   excluded: its corpus repeat verb `kutichiy` normalizes to `return`, not `repeat`
 *   — a dict mismatch with the profile's `kutipay`/`muyu`, a separate fix.)
 *
 * The count word is taken VERBATIM from the corpus: most languages leave the
 * English `times` untranslated (es `repetir 3 times`); a few translate it
 * (th `ครั้ง`, vi `lần`, tl `beses`, bn `বার`).
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
  // Match the verb as a SINGLE literal token. A multi-word surface verb (vi
  // `lặp lại`) tokenizes as ONE fused keyword token — splitting it on whitespace
  // would expect two tokens the tokenizer never produces, so the pattern would
  // never match (vi's repeat-times fell through to the generated positional
  // repeat, mis-binding the count to loopType). For single-word verbs this is
  // identical to the previous per-word push.
  tokens.push({ type: 'literal', value: verb });
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

/**
 * One verb-LAST (SOV) counted-loop HEAD pattern: `{quantity} {countWord} {marker} {verb}`.
 * The verb token matches the repeat keyword by its NORMALIZED form (`repeat`), so it
 * is robust to every conjugation/alternative the profile lists. The object marker
 * (ja `を` / ko `를` / tr `i` / hi `को` / bn `কে`) sits between the count phrase and
 * the clause-final verb and must be consumed for the verb token to align.
 */
function repeatTimesHeadSOV(language: string, countWord: string, marker: string): LanguagePattern {
  return {
    id: `repeat-${language}-times`,
    language,
    command: 'repeat',
    priority: 110, // > the generated positional repeat (100)
    template: {
      format: `{quantity} ${countWord} ${marker} repeat`,
      tokens: [
        { type: 'role', role: 'quantity', expectedTypes: ['literal', 'expression'] },
        { type: 'literal', value: countWord },
        { type: 'literal', value: marker },
        { type: 'literal', value: 'repeat' }, // matches the verb's normalized form
      ],
    },
    extraction: {
      loopType: { default: { type: 'literal', value: 'times' } },
    },
  };
}

// [lang, count-word (corpus form), object-marker]
const SOV_REPEAT_TIMES: Array<[string, string, string]> = [
  ['ja', 'times', 'を'],
  ['ko', 'times', '를'],
  ['tr', 'times', 'i'],
  ['hi', 'times', 'को'],
  ['bn', 'বার', 'কে'],
];

const BY_LANG = new Map<string, LanguagePattern[]>();
for (const [lang, verb, countWord, marker] of VERB_FIRST_REPEAT_TIMES) {
  BY_LANG.set(lang, [repeatTimesHead(lang, verb, countWord, marker)]);
}
for (const [lang, countWord, marker] of SOV_REPEAT_TIMES) {
  BY_LANG.set(lang, [repeatTimesHeadSOV(lang, countWord, marker)]);
}

/**
 * Get counted-loop HEAD patterns for a specific language.
 */
export function getRepeatPatternsForLanguage(language: string): LanguagePattern[] {
  return BY_LANG.get(language) ?? [];
}
