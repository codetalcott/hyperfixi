/**
 * Unified Language Profile
 *
 * Combines parsing-focused features (from semantic) with generation-focused
 * features (from i18n) into a single profile structure.
 *
 * This enables:
 * - Single source of truth for language configuration
 * - Bidirectional conversion: parse (natural → semantic) and render (semantic → natural)
 * - Consistent language support across packages
 */

import type {
  SemanticRole,
  WordOrder,
  AdpositionType,
  MorphologyType,
  GrammaticalMarker,
} from './grammar-types';

// =============================================================================
// Unified Profile Types
// =============================================================================

/**
 * How grammatical relationships are marked (unified from both packages).
 *
 * Maps to i18n's AdpositionType:
 * - preposition → 'preposition'
 * - postposition → 'postposition'
 * - particle → 'postposition' (particles are typically postpositional)
 * - case-suffix → 'postposition' (suffixes attach after)
 */
export type MarkingStrategy = 'preposition' | 'postposition' | 'particle' | 'case-suffix';

/**
 * A grammatical marker for a semantic role.
 * Unified from both packages' marker types.
 */
export interface UnifiedRoleMarker {
  /** Primary marker form */
  readonly primary: string;
  /** Alternative forms (conjugations, vowel harmony variants) */
  readonly alternatives?: string[];
  /** Position relative to the role value */
  readonly position: 'before' | 'after';
  /** Whether this marker is required */
  readonly required?: boolean;
}

/**
 * Verb form configuration for a language.
 */
export interface VerbConfig {
  /** Position of verb in the sentence */
  readonly position: 'start' | 'end' | 'second';
  /** Common verb suffixes/conjugations to recognize */
  readonly suffixes?: string[];
  /** Whether the language commonly drops subjects */
  readonly subjectDrop?: boolean;
}

/**
 * Translation of a command keyword.
 */
export interface KeywordTranslation {
  /** Primary translation */
  readonly primary: string;
  /** Alternative forms (conjugations, synonyms) */
  readonly alternatives?: string[];
  /** Normalized form for matching */
  readonly normalized?: string;
}

/**
 * Special tokenization configuration.
 */
export interface TokenizationConfig {
  /** Particles to recognize (for particle languages) */
  readonly particles?: string[];
  /** Prefixes to recognize (for prefixing languages) */
  readonly prefixes?: string[];
  /** Word boundary detection strategy */
  readonly boundaryStrategy?: 'space' | 'particle' | 'character';
}

/**
 * Unified Language Profile
 *
 * Combines all fields needed for both parsing and generation:
 *
 * **Shared fields:**
 * - code, name, nativeName, direction, wordOrder
 *
 * **Parsing fields (from semantic):**
 * - keywords: Command keyword translations
 * - verb: Verb position and conjugation info
 * - tokenization: Language-specific tokenization
 * - usesSpaces: Word boundary info
 *
 * **Generation fields (from i18n):**
 * - morphology: Morphological type for transformation
 * - canonicalOrder: Role ordering for output
 * - markers: Grammatical markers for roles
 */
export interface UnifiedLanguageProfile {
  // === Identity ===
  /** ISO 639-1 language code */
  readonly code: string;
  /** Human-readable language name */
  readonly name: string;
  /** Native language name */
  readonly nativeName: string;
  /** Text direction */
  readonly direction: 'ltr' | 'rtl';

  // === Typological Features ===
  /** Primary word order (SVO, SOV, VSO, etc.) */
  readonly wordOrder: WordOrder;
  /** How grammatical roles are marked */
  readonly markingStrategy: MarkingStrategy;
  /** Morphological typology */
  readonly morphology: MorphologyType;
  /** Whether the language uses spaces between words */
  readonly usesSpaces: boolean;

  // === Role Markers (for both parsing and generation) ===
  /** Markers for each semantic role */
  readonly roleMarkers: Partial<Record<SemanticRole, UnifiedRoleMarker>>;
  /** Canonical role order for generation */
  readonly canonicalOrder: SemanticRole[];

  // === Parsing Configuration ===
  /** Verb configuration */
  readonly verb: VerbConfig;
  /** Command keyword translations */
  readonly keywords: Record<string, KeywordTranslation>;
  /** Special tokenization configuration */
  readonly tokenization?: TokenizationConfig;

  // === Generation Rules ===
  /** Special transformation rules */
  readonly rules?: GrammarRule[];
}

/**
 * Grammar rule for special transformations.
 * (Imported from i18n for consistency)
 */
export interface GrammarRule {
  name: string;
  description: string;
  match: PatternMatcher;
  transform: PatternTransform;
  priority: number;
}

export interface PatternMatcher {
  commands?: string[];
  requiredRoles: SemanticRole[];
  optionalRoles?: SemanticRole[];
  predicate?: (parsed: unknown) => boolean;
}

export interface PatternTransform {
  roleOrder: SemanticRole[];
  insertMarkers?: boolean;
  custom?: (parsed: unknown, profile: UnifiedLanguageProfile) => string;
}

// =============================================================================
// Conversion Utilities
// =============================================================================

/**
 * Convert marking strategy to AdpositionType for i18n compatibility.
 */
export function markingStrategyToAdpositionType(strategy: MarkingStrategy): AdpositionType {
  switch (strategy) {
    case 'preposition':
      return 'preposition';
    case 'postposition':
    case 'particle':
    case 'case-suffix':
      return 'postposition';
    default:
      return 'none';
  }
}

/**
 * Convert UnifiedRoleMarker to GrammaticalMarker for i18n compatibility.
 */
export function toGrammaticalMarker(
  role: SemanticRole,
  marker: UnifiedRoleMarker,
  strategy: MarkingStrategy
): GrammaticalMarker {
  const result: GrammaticalMarker = {
    form: marker.primary,
    role,
    position: markingStrategyToAdpositionType(strategy),
    required: marker.required ?? false,
  };

  // Only include alternatives if defined
  if (marker.alternatives) {
    (result as { alternatives?: string[] }).alternatives = marker.alternatives;
  }

  return result;
}

/**
 * Convert UnifiedLanguageProfile to i18n LanguageProfile.
 * This enables using unified profiles with existing i18n code.
 */
export function toI18nProfile(unified: UnifiedLanguageProfile): {
  code: string;
  name: string;
  wordOrder: WordOrder;
  adpositionType: AdpositionType;
  morphology: MorphologyType;
  direction: 'ltr' | 'rtl';
  markers: GrammaticalMarker[];
  canonicalOrder: SemanticRole[];
} {
  const markers: GrammaticalMarker[] = [];

  for (const [role, marker] of Object.entries(unified.roleMarkers)) {
    if (marker) {
      markers.push(toGrammaticalMarker(role as SemanticRole, marker, unified.markingStrategy));
    }
  }

  return {
    code: unified.code,
    name: unified.nativeName,
    wordOrder: unified.wordOrder,
    adpositionType: markingStrategyToAdpositionType(unified.markingStrategy),
    morphology: unified.morphology,
    direction: unified.direction,
    markers,
    canonicalOrder: unified.canonicalOrder,
  };
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if an object is a UnifiedLanguageProfile.
 */
export function isUnifiedProfile(obj: unknown): obj is UnifiedLanguageProfile {
  if (!obj || typeof obj !== 'object') return false;
  const profile = obj as Partial<UnifiedLanguageProfile>;
  return (
    typeof profile.code === 'string' &&
    typeof profile.name === 'string' &&
    typeof profile.wordOrder === 'string' &&
    typeof profile.markingStrategy === 'string' &&
    typeof profile.morphology === 'string' &&
    typeof profile.keywords === 'object' &&
    Array.isArray(profile.canonicalOrder)
  );
}
