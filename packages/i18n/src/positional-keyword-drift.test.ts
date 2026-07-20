/**
 * Dict positional emissions ↔ tokenizer recognition.
 *
 * The i18n dictionaries' `expressions` section declares what the transformer
 * EMITS for positional/scope concepts (first/last/next/previous/closest/
 * parent/random); the semantic tokenizers declare what the parser RECOGNIZES.
 * Nothing else keeps the two in sync — Swahili's dict emitted `ijayo` for
 * `next` while the tokenizer only knew `ifuatayo`, so `put X into next <sel>`
 * failed to parse outright (fixed in #338).
 *
 * For every language and concept this test tokenizes the dict emission and
 * requires it to normalize back to that concept. Same convention as
 * command-primary-roles.test.ts: the test imports @lokascript/semantic, but
 * tests don't ship in the bundle.
 *
 * KNOWN_DRIFT below is a burn-down list of the misalignments that existed when
 * the test was introduced (mostly `random`, the `closest` compounds, and the
 * ru/uk positional sets — see the table in the PR that added this). Each entry
 * suppresses the exact-match requirement for one lang:concept pair. The test
 * also fails when an entry STARTS passing, so fixes must remove their entry —
 * the list can only shrink. Do NOT add new entries to silence a regression;
 * new drift means a dict emission and a tokenizer disagree and one of them is
 * wrong.
 */

import { describe, it, expect } from 'vitest';
import { getTokenizer } from '@lokascript/semantic';
import { dictionaries } from './dictionaries';

const POSITIONAL_CONCEPTS = [
  'first',
  'last',
  'next',
  'previous',
  'closest',
  'parent',
  'random',
] as const;

/**
 * Burn-down list (lang:concept). State as of introduction:
 * - `random` was unrecognized by most tokenizers (no extras entry) — BURNED DOWN
 *   in pick-text-range arc 2 (Batch D added the missing EXTRAS entries).
 * - The `closest` superlatives/compounds (es máscercano, fr plusproche,
 *   it piùvicino, pt mais_próximo, tr en_yakın, qu aswan_kaylla) split or
 *   missed entirely — the tokenizer never matches multi-word/underscore
 *   natives, so the old tokenizer entries were dead. Fixed by aligning each
 *   dict to a single token the tokenizer recognizes (es cercano, fr proche,
 *   it vicino, pt maispróximo, tr enyakın, qu kaylla).
 * - ru/uk tokenizers carried only the feminine/neuter gendered variants — the
 *   masculine nominative forms the dict emits were never listed; fixed.
 * - qu next/previous were CROSS-MAPPED (qhipantin→last, ñawpaqnin→first —
 *   morphology bound the prefixes); fixed with exact tokenizer entries.
 * - de closest: FIXED (R2 wave 13). The dict used to emit `nächste` for both
 *   next and closest, and the tokenizer normalizes `nächste`→next by design, so
 *   closest was unrecoverable. The dict now emits the unambiguous
 *   `nächstgelegene` for closest, which the tokenizer maps →closest (distinct
 *   word, no shadowing of next).
 * - bn last (শেষ) normalizes to `end` (the block terminator) — a polysemous
 *   word claimed by the structural keyword. (sw had the same collision via
 *   mwisho; fixed by emitting the distinct concatenated adjective `wamwisho`,
 *   which the tokenizer reads as `last` — the saufsi/wennnicht/enyakın class.)
 */
const KNOWN_DRIFT = new Set<string>([
  'ar:parent',
  'bn:last',
  'de:parent',
  'it:parent',
  'qu:parent',
  // The `random` drift (18 languages) was BURNED DOWN in pick-text-range arc 2
  // (Batch D): `random` lived in the dicts' `expressions` but was recognized by
  // the tokenizer only in ru/uk; arc 2 added the missing EXTRAS entries, so every
  // dict `random` emission now normalizes back to `random`.
]);

function normalizeEmission(lang: string, emission: string): string | null {
  let tokenizer: ReturnType<typeof getTokenizer>;
  try {
    tokenizer = getTokenizer(lang);
  } catch {
    return null; // no tokenizer for this language — out of scope
  }
  try {
    const stream = tokenizer.tokenize(emission);
    const token = stream.peek() as { normalized?: string; value: string } | undefined | null;
    if (!token) return '(no-token)';
    return token.normalized ?? token.value;
  } catch {
    return '(tokenize-error)';
  }
}

describe('dict positional emissions are recognized by the tokenizer', () => {
  for (const [lang, dict] of Object.entries(dictionaries)) {
    if (lang === 'en') continue;
    const expressions = dict.expressions ?? {};
    for (const concept of POSITIONAL_CONCEPTS) {
      const emission = expressions[concept];
      if (!emission) continue;
      const key = `${lang}:${concept}`;
      const expectedDrift = KNOWN_DRIFT.has(key);

      it(`[${key}] '${emission}' ${expectedDrift ? 'is on the burn-down list' : `normalizes to '${concept}'`}`, () => {
        const normalized = normalizeEmission(lang, emission);
        if (normalized === null) return; // no tokenizer registered
        const aligned = normalized === concept;
        if (expectedDrift) {
          expect(
            aligned,
            `[${key}] '${emission}' now normalizes to '${concept}' — the drift is fixed; ` +
              `remove '${key}' from KNOWN_DRIFT in positional-keyword-drift.test.ts (the list only shrinks).`
          ).toBe(false);
        } else {
          expect(
            aligned,
            `[${key}] dict emits '${emission}' but the ${lang} tokenizer normalizes it to ` +
              `'${normalized}', not '${concept}'. The transformer emits words the parser can't ` +
              `read as positionals (the sw 'ijayo' bug class, #338). Align the dict emission to ` +
              `a word the tokenizer recognizes, or teach the tokenizer the dict's word.`
          ).toBe(true);
        }
      });
    }
  }
});
