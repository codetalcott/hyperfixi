/**
 * Morphological Normalizer Types
 *
 * Defines interfaces for language-specific morphological analysis.
 * Normalizers reduce conjugated/inflected forms to canonical stems
 * that can be matched against keyword dictionaries.
 */

/**
 * Result of morphological normalization.
 */
export interface NormalizationResult {
  /** The extracted stem/root form */
  readonly stem: string;

  /** Confidence in the normalization (0.0-1.0) */
  readonly confidence: number;

  /** Optional metadata about the transformation */
  readonly metadata?: NormalizationMetadata;
}

/**
 * Metadata about morphological transformations applied.
 */
export interface NormalizationMetadata {
  /** Prefixes that were removed */
  readonly removedPrefixes?: readonly string[];

  /** Suffixes that were removed */
  readonly removedSuffixes?: readonly string[];

  /** Type of conjugation detected */
  readonly conjugationType?: ConjugationType;

  /** Original form classification */
  readonly originalForm?: string;

  /** Applied transformation rules (for debugging) */
  readonly appliedRules?: readonly string[];
}

/**
 * Types of verb conjugation/inflection.
 */
export type ConjugationType =
  // Tense
  | 'present'
  | 'past'
  | 'future'
  | 'progressive'
  | 'perfect'
  // Mood
  | 'imperative'
  | 'subjunctive'
  | 'conditional'
  // Voice
  | 'passive'
  | 'causative'
  // Politeness (Japanese/Korean)
  | 'polite'
  | 'humble'
  | 'honorific'
  // Form
  | 'negative'
  | 'potential'
  | 'volitional'
  // Japanese conditional forms
  | 'conditional-tara' // たら/したら - if/when (completed action)
  | 'conditional-to' // と/すると - when (habitual/expected)
  | 'conditional-ba' // ば/すれば - if (hypothetical)
  // Korean-specific
  | 'connective' // 하고, 해서 etc.
  | 'conditional-myeon' // -(으)면 - if/when (general conditional)
  | 'temporal-ttae' // -(으)ㄹ 때 - when (at the time of)
  | 'causal-nikka' // -(으)니까 - because/since
  // Korean honorific forms (-시- infix)
  | 'honorific-conditional' // -하시면 - if (honorific)
  | 'honorific-temporal' // -하실 때 - when (honorific)
  | 'honorific-causal' // -하시니까 - because (honorific)
  | 'honorific-past' // -하셨어요 - past (honorific)
  | 'honorific-polite' // -하십니다 - polite (honorific)
  // Korean sequential forms
  | 'sequential-after' // -고 나서 - after doing
  | 'sequential-before' // -기 전에 - before doing
  | 'immediate' // -자마자 - as soon as
  | 'obligation' // -아야/어야 해 - must do, should do
  // Spanish-specific
  | 'reflexive'
  | 'reflexive-imperative'
  | 'gerund'
  | 'participle'
  // Arabic-specific
  | 'conditional-idha' // إذا - if/when (hypothetical)
  | 'temporal-indama' // عندما - when (temporal conjunction)
  | 'temporal-hina' // حين - at the time of
  | 'temporal-lamma' // لمّا - when (past emphasis)
  | 'past-verb' // فعل ماضي - past tense verb
  // Turkish-specific
  | 'conditional-se' // -se/-sa - if (hypothetical)
  | 'temporal-ince' // -ince/-ınca/-unca/-ünce - when/as
  | 'temporal-dikce' // -dikçe/-dıkça/-dukça/-dükçe - as/while
  | 'aorist' // -ir/-ar - habitual/general
  | 'optative' // -eyim/-ayım/-elim/-alım - let me/us
  | 'necessitative' // -meli/-malı - must/should
  // Japanese request/contracted forms
  | 'request' // てください/でください - polite request
  | 'casual-request' // てくれ/でくれ - casual request
  | 'contracted' // ちゃう/じゃう - contracted completion (てしまう)
  | 'contracted-past' // ちゃった/じゃった - contracted past completion
  // Compound
  | 'compound' // Multi-layer suffixes (ていなかった, 하고나서였어)
  | 'te-form' // Japanese て-form
  | 'dictionary'; // Base/infinitive form

/**
 * Interface for language-specific morphological normalizers.
 *
 * Normalizers attempt to reduce inflected word forms to their
 * canonical stems. This enables matching conjugated verbs against
 * keyword dictionaries that only contain base forms.
 *
 * Example (Japanese):
 *   切り替えた (past) → { stem: '切り替え', confidence: 0.85 }
 *   切り替えます (polite) → { stem: '切り替え', confidence: 0.85 }
 *
 * Example (Spanish):
 *   mostrarse (reflexive infinitive) → { stem: 'mostrar', confidence: 0.85 }
 *   alternando (gerund) → { stem: 'alternar', confidence: 0.85 }
 */
export interface MorphologicalNormalizer {
  /** Language code this normalizer handles */
  readonly language: string;

  /**
   * Normalize a word to its canonical stem form.
   *
   * @param word - The word to normalize
   * @returns Normalization result with stem and confidence
   */
  normalize(word: string): NormalizationResult;

  /**
   * Check if a word appears to be a verb form that can be normalized.
   * Optional optimization to skip normalization for non-verb tokens.
   *
   * @param word - The word to check
   * @returns true if the word might be a normalizable verb form
   */
  isNormalizable?(word: string): boolean;
}

/**
 * Configuration for suffix-based normalization rules.
 * Used by agglutinative languages (Japanese, Korean, Turkish).
 */
export interface SuffixRule {
  /** The suffix pattern to match */
  readonly pattern: string;

  /** Confidence when this suffix is stripped */
  readonly confidence: number;

  /** What to replace the suffix with (empty string for simple removal) */
  readonly replacement?: string;

  /** Conjugation type this suffix indicates */
  readonly conjugationType?: ConjugationType;

  /** Minimum stem length after stripping (to avoid over-stripping) */
  readonly minStemLength?: number;
}

/**
 * Configuration for prefix-based normalization rules.
 * Used primarily by Arabic for article/conjunction prefixes.
 */
export interface PrefixRule {
  /** The prefix pattern to match */
  readonly pattern: string;

  /** Confidence penalty when this prefix is stripped */
  readonly confidencePenalty: number;

  /** What the prefix indicates (for metadata) */
  readonly prefixType?: 'article' | 'conjunction' | 'preposition' | 'verb-marker';

  /** Minimum remaining characters after stripping (to avoid over-stripping) */
  readonly minRemaining?: number;
}

/**
 * Helper to create a "no change" normalization result.
 */
export function noChange(word: string): NormalizationResult {
  return { stem: word, confidence: 1.0 };
}

/**
 * Helper to create a normalization result with metadata.
 */
export function normalized(
  stem: string,
  confidence: number,
  metadata?: NormalizationMetadata
): NormalizationResult {
  if (metadata) {
    return { stem, confidence, metadata };
  }
  return { stem, confidence };
}
