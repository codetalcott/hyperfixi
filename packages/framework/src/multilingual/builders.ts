/**
 * Framework ↔ Semantic bridge builders.
 *
 * Pure functions that combine an injected {@link GrammarProfileSlice} (the
 * per-language grammar facts, typically a `@lokascript/semantic`
 * `LanguageProfile`) with a {@link DomainVocabulary} (the only thing a domain
 * authors per language) into the shapes `createMultilingualDSL` consumes:
 * a `PatternGenLanguageProfile`, a `LanguageTokenizer`, or a complete
 * `LanguageConfig`.
 */

import type { LanguageTokenizer } from '../core/types';
import type { PatternGenLanguageProfile } from '../generation/pattern-generator';
import type { LanguageConfig } from '../api/create-dsl';
import type { LanguageProfile as GrammarProfile } from '../grammar';
import { createSimpleTokenizer, type TokenizerProfile } from '../core/tokenization/base-tokenizer';
import {
  LatinExtendedIdentifierExtractor,
  type ValueExtractor,
} from '../interfaces/value-extractor';
import type { DomainVocabulary, GrammarProfileSlice, RoleMarkerSlice } from './types';

/** Mutable role-marker shape shared by PatternGenLanguageProfile and TokenizerProfile. */
type MergedRoleMarker = { primary: string; alternatives?: string[]; position?: 'before' | 'after' };

/**
 * Merge the slice's language-default role markers with the vocabulary's
 * domain-specific overrides (vocabulary wins). Empty-string primaries are
 * dropped — an empty override means "bare positional arg, no marker".
 */
function mergeRoleMarkers(
  slice: GrammarProfileSlice,
  vocab: DomainVocabulary
): Record<string, MergedRoleMarker> {
  const merged: Record<string, MergedRoleMarker> = {};
  const add = (role: string, marker: RoleMarkerSlice | undefined) => {
    if (!marker?.primary) {
      delete merged[role];
      return;
    }
    merged[role] = {
      primary: marker.primary,
      ...(marker.alternatives?.length && { alternatives: [...marker.alternatives] }),
      ...(marker.position && { position: marker.position }),
    };
  };
  for (const [role, marker] of Object.entries(slice.roleMarkers ?? {})) add(role, marker);
  for (const [role, marker] of Object.entries(vocab.roleMarkerOverrides ?? {})) add(role, marker);
  return merged;
}

/**
 * Build a pattern-generation profile: domain keywords + slice grammar
 * (word order, role markers). The result feeds `generatePattern` /
 * `generatePatternVariants` and `LanguageConfig.patternProfile`.
 */
export function buildPatternProfile(
  slice: GrammarProfileSlice,
  vocab: DomainVocabulary
): PatternGenLanguageProfile {
  const keywords: Record<string, { primary: string; alternatives?: string[] }> = {};
  for (const [action, translation] of Object.entries(vocab.keywords)) {
    keywords[action] = {
      primary: translation.primary,
      ...(translation.alternatives?.length && { alternatives: [...translation.alternatives] }),
    };
  }

  const roleMarkers = mergeRoleMarkers(slice, vocab);

  return {
    code: slice.code,
    wordOrder: slice.wordOrder,
    keywords,
    ...(Object.keys(roleMarkers).length > 0 && { roleMarkers }),
  };
}

/** Options for {@link buildDomainTokenizer}, overriding the slice-derived defaults. */
export interface DomainTokenizerOptions {
  /** Recognize operator tokens (default: true) */
  readonly includeOperators?: boolean;
  /**
   * Case-insensitive keyword matching. Defaults to true for bicameral scripts
   * (`latin`, `cyrillic`, or when the slice omits `script`), false otherwise.
   */
  readonly caseInsensitive?: boolean;
  /** Extra extractors, registered before the slice-derived ones */
  readonly customExtractors?: readonly ValueExtractor[];
}

function defaultCaseInsensitive(script: string | undefined): boolean {
  return script === undefined || script === 'latin' || script === 'cyrillic';
}

/**
 * Build a domain tokenizer from a grammar slice + domain vocabulary, wrapping
 * `createSimpleTokenizer`. Derived from the slice:
 *
 * - `direction` (rtl for e.g. Arabic/Hebrew slices)
 * - keyword set: vocabulary verbs (primary + alternatives), role markers
 *   (slice defaults merged with `vocab.roleMarkerOverrides`), tokenization
 *   particles, and `vocab.tokenizerKeywords`
 * - keyword-normalization profile (native verb → action name, marker → role)
 * - a `LatinExtendedIdentifierExtractor` when `slice.script === 'latin'`, so
 *   diacritics (ñ, é, ş, …) never split identifiers
 * - case-insensitivity for bicameral scripts
 */
export function buildDomainTokenizer(
  slice: GrammarProfileSlice,
  vocab: DomainVocabulary,
  options: DomainTokenizerOptions = {}
): LanguageTokenizer {
  const roleMarkers = mergeRoleMarkers(slice, vocab);

  // Flat keyword list for token classification.
  const keywords = new Set<string>();
  for (const translation of Object.values(vocab.keywords)) {
    keywords.add(translation.primary);
    for (const alt of translation.alternatives ?? []) keywords.add(alt);
  }
  for (const marker of Object.values(roleMarkers)) {
    keywords.add(marker.primary);
    for (const alt of marker.alternatives ?? []) keywords.add(alt);
  }
  for (const particle of slice.tokenization?.particles ?? []) keywords.add(particle);
  for (const extra of vocab.tokenizerKeywords ?? []) keywords.add(extra);

  // Normalization profile: native verb forms → action names, markers → roles.
  const profileKeywords: NonNullable<TokenizerProfile['keywords']> = {};
  for (const [action, translation] of Object.entries(vocab.keywords)) {
    profileKeywords[action] = {
      primary: translation.primary,
      ...(translation.alternatives?.length && { alternatives: [...translation.alternatives] }),
      normalized: translation.normalized ?? action,
    };
  }
  const keywordProfile: TokenizerProfile = {
    keywords: profileKeywords,
    ...(Object.keys(roleMarkers).length > 0 && { roleMarkers }),
  };

  const customExtractors: ValueExtractor[] = [
    ...(options.customExtractors ?? []),
    ...(slice.script === 'latin' ? [new LatinExtendedIdentifierExtractor()] : []),
  ];

  return createSimpleTokenizer({
    language: slice.code,
    direction: slice.direction ?? 'ltr',
    keywords: [...keywords],
    ...(vocab.keywordExtras?.length && { keywordExtras: vocab.keywordExtras.map(e => ({ ...e })) }),
    keywordProfile,
    includeOperators: options.includeOperators ?? true,
    caseInsensitive: options.caseInsensitive ?? defaultCaseInsensitive(slice.script),
    ...(customExtractors.length > 0 && { customExtractors }),
  });
}

/** Metadata / overrides for {@link buildLanguageConfig}. */
export interface LanguageConfigMeta {
  /** English name (default: `slice.name`, falling back to `slice.code`) */
  readonly name?: string;
  /** Native name (default: `slice.nativeName`, falling back to the English name) */
  readonly nativeName?: string;
  /** Grammar-transformation profile to attach (optional, as on `LanguageConfig`) */
  readonly grammarProfile?: GrammarProfile;
  /** Use this tokenizer instead of the slice-derived one */
  readonly tokenizer?: LanguageTokenizer;
  /** Options for the slice-derived tokenizer (ignored when `tokenizer` is given) */
  readonly tokenizerOptions?: DomainTokenizerOptions;
}

/**
 * The one-call path into `createMultilingualDSL`: build a complete
 * `LanguageConfig` (tokenizer + pattern profile + names) from a grammar slice
 * and a domain vocabulary.
 */
export function buildLanguageConfig(
  slice: GrammarProfileSlice,
  vocab: DomainVocabulary,
  meta: LanguageConfigMeta = {}
): LanguageConfig {
  const name = meta.name ?? slice.name ?? slice.code;
  return {
    code: slice.code,
    name,
    nativeName: meta.nativeName ?? slice.nativeName ?? name,
    tokenizer: meta.tokenizer ?? buildDomainTokenizer(slice, vocab, meta.tokenizerOptions),
    patternProfile: buildPatternProfile(slice, vocab),
    ...(meta.grammarProfile && { grammarProfile: meta.grammarProfile }),
  };
}

/**
 * Derive schema `markerOverride` defaults for ONE language from the slice's
 * role markers, given a domain-role → semantic-role mapping. Returns
 * `{ domainRole: primaryMarker }` with entries only where the slice has a
 * marker for the mapped semantic role.
 *
 * ```ts
 * deriveRoleMarkers(jaSlice, { table: 'source', target: 'destination' });
 * // → { table: 'から', target: 'に' }
 * ```
 *
 * Explicitly authored `markerOverride` entries stay authoritative — when
 * assembling a per-language marker map for a schema role, spread the explicit
 * entries after the derived defaults.
 */
export function deriveRoleMarkers(
  slice: GrammarProfileSlice,
  roleMapping: Readonly<Record<string, string>>
): Record<string, string> {
  const derived: Record<string, string> = {};
  for (const [domainRole, semanticRole] of Object.entries(roleMapping)) {
    const marker = slice.roleMarkers?.[semanticRole];
    if (marker?.primary) derived[domainRole] = marker.primary;
  }
  return derived;
}
