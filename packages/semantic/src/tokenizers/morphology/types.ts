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
  // Korean-specific
  | 'connective' // 하고, 해서 etc.
  // Spanish-specific
  | 'reflexive'
  | 'reflexive-imperative'
  | 'gerund'
  | 'participle'
  // Compound
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
