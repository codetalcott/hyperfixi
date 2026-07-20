/**
 * Pick Command Patterns (hand-crafted, foreign analogues of `pick-en-variant`)
 *
 * The canonical `pick (item|character)s <range> (of|from) <root>` grammar is
 * modeled per language here because the schema-generated fallback
 * (`pick {patient} [from {source}]`, priority 100) binds `patient` to the unit
 * word and DROPS the range entirely — every foreign corpus pick row rendered
 * `pick characters` (canonical-invalid EOF), the last 23 entries of the
 * foreign canonical-validity allowlist (arc 3,
 * docs-internal/HANDOFF_pick-text-range-arc3.md).
 *
 * Invariants inherited from `pick-en-variant` (patterns/languages/en/pick.ts —
 * read its header for the render-selection reasoning):
 *  - The unit word rides the `method` ROLE (render selection scores role
 *    presence, not literals). In the 22 registered languages it tokenizes as a
 *    KEYWORD normalized to `characters`, so the captured literal is already
 *    English and the en render needs no translation step.
 *  - The range rides `patient`. The pattern-matcher's pick-range fold
 *    (tryMatchPickRangeExpression) recognizes `<a> <sep> <b>` with the
 *    language's native separator (PICK_RANGE_SEPARATORS_BY_LANG — es `a`,
 *    ru `в`, zh `到`) and synthesizes canonical ENGLISH (`0 to 5`), so the
 *    pick AST mapper and the en render work unchanged.
 *  - The `of/from` root rides `source`, anchored by each language's native
 *    genitive/source word matched by VALUE (their normalized forms are
 *    inconsistent across tokenizers: es `de`→source, it `di`→tell,
 *    pl `z`→style, sw `ya`/th `ของ`/tl `ng` bare identifiers — value-matching
 *    sidesteps the whole mess).
 *  - Priority 110, above the generated fallback (100), which still handles the
 *    legacy `pick X from Y` array form (no `method` role) via the render-time
 *    −50 missing-method penalty.
 *  - pickSchema roles stay FROZEN (patient+source) — extension happens in
 *    these patterns, never the schema (a role change regenerates all 24
 *    fallback patterns).
 *
 * The leading verb is the pattern literal `pick`, matched by NORMALIZED form —
 * probe-measured: every registered language's corpus verb tokenizes as a
 * keyword normalizing to `pick` (es `escoger`, de `auswählen`, ar `اختر`,
 * zh `选取`…), so one spelling covers conjugation alternatives the profile
 * already normalizes. SVO/VSO languages share the verb-initial shape below;
 * the SOV six (ja/ko/tr/hi/bn/qu) are verb-final and get their own shapes,
 * co-evolved with the i18n pick render rule that unscrambles their generated
 * corpus rows (the i18n-renders-semantic-patterns-coevolve lesson).
 */

import type { LanguagePattern, PatternToken } from '../types';

/** Per-language surface knobs for the verb-initial pick variant pattern. */
interface PickVariantSpec {
  /** Native source/genitive word before the root (matched by value). */
  srcMarker: string;
  srcAlternatives?: string[];
  /**
   * Optional object-marker particle(s) between the verb and the unit word
   * (he `את`, zh `把`). Particles can't ride a role slot (tokenToSemanticValue
   * returns null for them), so they need an explicit optional literal.
   */
  objectMarkers?: string[];
}

/**
 * Verb-initial pick variant: `<pick> [obj] {method} {patient} <src> {source}`.
 * Covers the SVO cluster and VSO Arabic — their corpus rows are already
 * word-order-correct; only the parse-back was missing.
 */
function makePickVariantPattern(language: string, spec: PickVariantSpec): LanguagePattern {
  const tokens: PatternToken[] = [{ type: 'literal', value: 'pick' }];
  if (spec.objectMarkers?.length) {
    tokens.push({
      type: 'group',
      optional: true,
      tokens: [
        {
          type: 'literal',
          value: spec.objectMarkers[0]!,
          ...(spec.objectMarkers.length > 1 ? { alternatives: spec.objectMarkers.slice(1) } : {}),
        },
      ],
    });
  }
  tokens.push(
    // Unit word (keyword normalized to `characters`; `first`/`last`/`random`
    // ride the same slot as in en).
    { type: 'role', role: 'method', expectedTypes: ['literal', 'expression'] },
    // Range/count/index; the pick-range fold captures `<a> <sep> <b> [mode]`
    // as one canonical-English expression (`0 to 5`).
    { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression'] },
    {
      type: 'literal',
      value: spec.srcMarker,
      ...(spec.srcAlternatives?.length ? { alternatives: spec.srcAlternatives } : {}),
    },
    { type: 'role', role: 'source', expectedTypes: ['selector', 'reference', 'expression'] }
  );
  return {
    id: `pick-${language}-variant`,
    language,
    command: 'pick',
    priority: 110,
    template: {
      format: `pick {method} {patient} ${spec.srcMarker} {source}`,
      tokens,
    },
    extraction: {
      method: { position: 1 },
      patient: { position: 2 },
      source: {
        marker: spec.srcMarker,
        ...(spec.srcAlternatives?.length ? { markerAlternatives: spec.srcAlternatives } : {}),
      },
    },
  };
}

/**
 * Verb-initial languages: source-marker words probe-measured from the corpus
 * rows (see the arc-3 handoff's triage table). he keeps English `of` primary —
 * its dict has no standalone translation, so the generated row carries `of`
 * verbatim; the native genitives ride as alternatives.
 */
const VERB_INITIAL_SPECS: Record<string, PickVariantSpec> = {
  ar: { srcMarker: 'من' },
  de: { srcMarker: 'von', srcAlternatives: ['aus'] },
  es: { srcMarker: 'de' },
  fr: { srcMarker: 'de' },
  he: { srcMarker: 'of', srcAlternatives: ['של', 'מ'], objectMarkers: ['את'] },
  id: { srcMarker: 'dari' },
  it: { srcMarker: 'di', srcAlternatives: ['da'] },
  ms: { srcMarker: 'daripada', srcAlternatives: ['dari'] },
  pl: { srcMarker: 'z' },
  pt: { srcMarker: 'de' },
  ru: { srcMarker: 'из' },
  sw: { srcMarker: 'ya', srcAlternatives: ['kutoka'] },
  th: { srcMarker: 'ของ', srcAlternatives: ['จาก'] },
  tl: { srcMarker: 'ng', srcAlternatives: ['mula'] },
  uk: { srcMarker: 'з' },
  vi: { srcMarker: 'của', srcAlternatives: ['từ'] },
  zh: { srcMarker: '的', objectMarkers: ['把'] },
};

/** Per-language surface knobs for the verb-final (SOV) pick variant pattern. */
interface PickVerbFinalSpec {
  /** Genitive joiner between the root and the unit word (ja `の`, hi `का`). */
  genitive: string;
  /** Patient/object marker after the range (ja `を`, hi `को`). */
  patientMarker: string;
}

/**
 * Verb-final pick variant for the SOV six:
 * `{source} <gen> {method} {patient} [<pm>] <pick>` — the shape the i18n
 * sovPickRangeRule renders (ja `#note の 文字 0 から 5 を 選択`; the corpus
 * row's mid-clause `<event> <em>` span is stripped by SOV event extraction
 * before this pattern sees the body). Same roles as the verb-initial shape.
 */
function makePickVerbFinalPattern(language: string, spec: PickVerbFinalSpec): LanguagePattern {
  return {
    id: `pick-${language}-variant-sov`,
    language,
    command: 'pick',
    priority: 110,
    template: {
      format: `{source} ${spec.genitive} {method} {patient} ${spec.patientMarker} pick`,
      tokens: [
        { type: 'role', role: 'source', expectedTypes: ['selector', 'reference', 'expression'] },
        { type: 'literal', value: spec.genitive },
        { type: 'role', role: 'method', expectedTypes: ['literal', 'expression'] },
        { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression'] },
        {
          type: 'group',
          optional: true,
          tokens: [{ type: 'literal', value: spec.patientMarker }],
        },
        { type: 'literal', value: 'pick' },
      ],
    },
    extraction: {
      source: { position: 0 },
      method: { position: 2 },
      patient: { position: 3 },
    },
  };
}

const VERB_FINAL_SPECS: Record<string, PickVerbFinalSpec> = {
  bn: { genitive: 'র', patientMarker: 'কে' },
  hi: { genitive: 'का', patientMarker: 'को' },
  ja: { genitive: 'の', patientMarker: 'を' },
  ko: { genitive: '의', patientMarker: '를' },
  qu: { genitive: 'pa', patientMarker: 'ta' },
  tr: { genitive: 'nin', patientMarker: 'i' },
};

/**
 * Get pick patterns for a language (empty for en — its variant pattern lives
 * in patterns/languages/en/pick.ts).
 */
export function getPickPatternsForLanguage(language: string): LanguagePattern[] {
  const initial = VERB_INITIAL_SPECS[language];
  if (initial) return [makePickVariantPattern(language, initial)];
  const final = VERB_FINAL_SPECS[language];
  if (final) return [makePickVerbFinalPattern(language, final)];
  return [];
}
