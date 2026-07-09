/**
 * UI-behavior verbs (toggle/add/remove/show/hide) sourced from the
 * `@lokascript/semantic` language profiles voice already imports as grammar
 * slices — NOT hand-authored per language. A profile's `keywords` entry is
 * structurally identical to the framework's {@link DomainKeywordTranslation},
 * so sourcing is a structural pick.
 *
 * Primary-only: the `marker-tokenization` lint rule (R7) requires every keyword
 * to tokenize as a single token, and a few slice *alternatives* split (ja `hide`
 * `非表示にする`, tr `toggle` `aç/kapat`). We therefore drop `alternatives` here
 * and source `{ primary }` only.
 */

import type {
  DomainKeywordTranslation,
  DomainVocabulary,
  GrammarProfileSlice,
} from '@lokascript/framework';

/** Behavior verbs to source from the multilingual layer, in stable order. */
export const BEHAVIOR_VERBS = ['toggle', 'add', 'remove', 'show', 'hide'] as const;

/**
 * A raw semantic `LanguageProfile` still carries its keyword table; the
 * framework's `GrammarProfileSlice` deliberately omits `keywords`, so widen it
 * back here. Callers MUST pass the raw slice import (e.g. `englishProfile`), not
 * `VOICE_LANGUAGES[code].slice` (which is typed `GrammarProfileSlice`).
 */
type KeywordedSlice = GrammarProfileSlice & {
  readonly keywords?: Readonly<Record<string, DomainKeywordTranslation>>;
};

/**
 * Pick the behavior verbs from a profile's keyword table as primary-only
 * {@link DomainKeywordTranslation} entries. Skips any verb the profile lacks.
 */
export function pickBehaviorVerbs(slice: KeywordedSlice): Record<string, DomainKeywordTranslation> {
  const picked: Record<string, DomainKeywordTranslation> = {};
  for (const verb of BEHAVIOR_VERBS) {
    const entry = slice.keywords?.[verb];
    if (!entry?.primary) continue;
    picked[verb] = { primary: entry.primary, normalized: entry.normalized ?? verb };
  }
  return picked;
}

/**
 * The behavior verbs' destination/source marker primaries, sourced from the
 * slice. These must be registered as tokenizer keywords so they classify as
 * keywords (not identifiers) and parse: `destination` is suppressed by voice's
 * `SCHEMA_OWNED_MARKERS`, so its marker is otherwise absent from the keyword set
 * (e.g. Turkish dative `e`); `source` is already retained, included for symmetry
 * (deduped). Does NOT affect pattern generation — `buildPatternProfile` reads
 * `keywords`/`roleMarkers`, not `tokenizerKeywords`.
 */
function behaviorMarkerWords(slice: KeywordedSlice): string[] {
  const words: string[] = [];
  for (const role of ['destination', 'source'] as const) {
    const primary = slice.roleMarkers?.[role]?.primary;
    if (primary) words.push(primary);
  }
  return words;
}

/**
 * Merge sourced behavior verbs into a domain vocabulary. Domain-authored
 * keywords are spread last, so hand-authored entries always win on collision.
 * The behavior verbs' destination/source marker primaries are added to
 * `tokenizerKeywords` so the slice-derived schema markers tokenize as keywords.
 */
export function withBehaviorVerbs(
  slice: KeywordedSlice,
  vocab: DomainVocabulary
): DomainVocabulary {
  const tokenizerKeywords = [
    ...new Set([...(vocab.tokenizerKeywords ?? []), ...behaviorMarkerWords(slice)]),
  ];
  return {
    ...vocab,
    keywords: { ...pickBehaviorVerbs(slice), ...vocab.keywords },
    tokenizerKeywords,
  };
}
