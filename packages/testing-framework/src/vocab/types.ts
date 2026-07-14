/**
 * Vocab-consistency model + finding types (Arc A — HANDOFF_vocab-consistency.md).
 *
 * Checks operate on a `VocabModel`, not on the packages directly, so tests can
 * seed synthetic disagreements without importing the real surfaces.
 */

export type Tier = 'error' | 'warn' | 'info';

export type CheckId = 'V1' | 'V1b' | 'V2' | 'V3' | 'V3b' | 'V3c' | 'V4';

export interface Finding {
  check: CheckId;
  tier: Tier;
  language: string;
  /** Stable identifier within (check, language) — concept, role, event or word. */
  key: string;
  message: string;
  /** Where the offending entry lives (e.g. `schema.bind.source`, `grammar.destination`). */
  source?: string | undefined;
}

/** Stable waiver key: check|language|key. */
export function findingKey(f: Pick<Finding, 'check' | 'language' | 'key'>): string {
  return `${f.check}|${f.language}|${f.key}`;
}

export interface Waiver {
  key: string;
  reason: string;
}

/** One language's view over the five authoring surfaces. */
export interface LangVocab {
  language: string;
  /** S1 — semantic profile keywords: concept → forms. */
  keywords: Record<string, { primary: string; alternatives?: readonly string[] | undefined }>;
  /** S1 — semantic profile role markers: role → forms. */
  roleMarkers: Record<string, { primary: string; alternatives?: readonly string[] | undefined }>;
  /** S2 — command-schema per-language markers (flattened over all schemas/roles). */
  schemaMarkers: Array<{
    action: string;
    role: string;
    marker: string;
    kind: 'override' | 'variant';
  }>;
  /** S3 — i18n dictionary: category → English key → native value. Absent if the language has no dictionary. */
  dictionary?: Record<string, Record<string, string>> | undefined;
  /** S4 — i18n grammar-profile markers (render side). */
  grammarMarkers: Array<{
    form: string;
    role: string;
    position?: string | undefined;
    alternatives?: readonly string[] | undefined;
  }>;
  /** S5b — native event word → English event name. Absent for the 11 uncovered languages. */
  eventTranslations?: Record<string, string> | undefined;
  /**
   * Surface #6 — hardcoded SOV event markers from `semantic-parser.ts`
   * (`getSOVEventMarkers()`): parse-side event-marker knowledge that lives in
   * neither profiles, schemas, nor grammar profiles. Feeds V2's parse-side
   * union for the `event` role only.
   */
  sovEventMarkers?: readonly string[] | undefined;
  /** S5a — word-level tokenizer classification. Absent if no tokenizer registered. */
  classify?: ((word: string) => string) | undefined;
  /**
   * S5a — tokenizer keyword-table normalization for a SINGLE word: what the
   * parse side actually resolves the word to (undefined when the word doesn't
   * tokenize as exactly one token, or has no normalization). The parse
   * authority for V3c — S5b can be aspirational (Batch 2).
   */
  normalizeWord?: ((word: string) => string | undefined) | undefined;
  /**
   * English events INTENTIONALLY kept English for this language (the
   * test-locked `eventLocalizationDenylist` from `@lokascript/semantic`):
   * a dict event word for a denylisted pair is expected not to round-trip —
   * V3c must not flag it.
   */
  eventDenylist?: ReadonlySet<string> | undefined;
}

export interface VocabModel {
  languages: LangVocab[];
}

/** NFC + lowercase + trim — the comparison normal form for every check. */
export function norm(s: string): string {
  return s.normalize('NFC').toLowerCase().trim();
}

export function formSet(entry: {
  primary: string;
  alternatives?: readonly string[] | undefined;
}): Set<string> {
  const out = new Set<string>();
  if (entry.primary) out.add(norm(entry.primary));
  for (const a of entry.alternatives ?? []) if (a) out.add(norm(a));
  return out;
}
