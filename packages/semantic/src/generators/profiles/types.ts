/**
 * Language Profile Types
 *
 * Type definitions for language profiles, separated for tree-shaking.
 */

import type { SemanticRole } from '../../types';

/**
 * Word order in a language (for declarative statements).
 */
export type WordOrder = 'SVO' | 'SOV' | 'VSO' | 'VOS' | 'OSV' | 'OVS';

/**
 * How grammatical relationships are marked.
 */
export type MarkingStrategy = 'preposition' | 'postposition' | 'particle' | 'case-suffix';

/**
 * A grammatical marker (preposition, particle, etc.) for a semantic role.
 */
export interface RoleMarker {
  /** Primary marker for this role */
  readonly primary: string;
  /** Alternative markers that also work */
  readonly alternatives?: string[];
  /** Position relative to the role value */
  readonly position: 'before' | 'after';
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
 * Configuration for possessive expression construction.
 * Defines how "X's property" is expressed in a language.
 */
export interface PossessiveConfig {
  /** Possessive marker (e.g., "'s" in English, "の" in Japanese) */
  readonly marker: string;
  /** Position of marker: 'after-object' (X's Y), 'between' (X の Y), 'before-property' */
  readonly markerPosition: 'after-object' | 'between' | 'before-property';
  /** Special possessive forms (e.g., 'me' → 'my' in English) */
  readonly specialForms?: Record<string, string>;
  /** Whether to use possessive adjectives instead of marker (e.g., Spanish mi/tu/su) */
  readonly usePossessiveAdjectives?: boolean;
  /**
   * Possessive keywords mapped to their corresponding reference.
   * Used by pattern-matcher to recognize possessive expressions.
   * Example: { my: 'me', your: 'you', its: 'it' }
   */
  readonly keywords?: Record<string, string>;
}

/**
 * Complete language profile for pattern generation.
 */
export interface LanguageProfile {
  /** ISO 639-1 or BCP 47 language code (e.g., 'es' or 'es-MX') */
  readonly code: string;
  /** Human-readable language name */
  readonly name: string;
  /** Native name */
  readonly nativeName: string;
  /** Text direction */
  readonly direction: 'ltr' | 'rtl';
  /** Primary word order */
  readonly wordOrder: WordOrder;
  /** How this language marks grammatical roles */
  readonly markingStrategy: MarkingStrategy;
  /** Markers for each semantic role */
  readonly roleMarkers: Partial<Record<SemanticRole, RoleMarker>>;
  /** Verb configuration */
  readonly verb: VerbConfig;
  /** Command keyword translations */
  readonly keywords: Record<string, KeywordTranslation>;
  /** Whether the language uses spaces between words */
  readonly usesSpaces: boolean;
  /** Special tokenization notes */
  readonly tokenization?: TokenizationConfig;
  /** Reference translations (me, it, you, etc.) */
  readonly references?: Record<string, string>;
  /** Possessive expression configuration */
  readonly possessive?: PossessiveConfig;
  /** Event handler pattern configuration (for simple SVO languages) */
  readonly eventHandler?: EventHandlerConfig;
  /**
   * Default verb form for command keywords. Defaults to 'infinitive'.
   *
   * Based on software UI localization research:
   * - 'infinitive': Spanish, French, German, Portuguese, Russian (industry standard)
   * - 'imperative': Polish
   * - 'base': English, Japanese, Korean (no distinction or same form)
   *
   * Individual keywords can override this via KeywordTranslation.form
   */
  readonly defaultVerbForm?: VerbForm;
  /**
   * Base language code to extend (for regional variants).
   * When set, this profile inherits from the base and overrides specific fields.
   * Example: 'es-MX' profile with extends: 'es' inherits from Spanish base.
   */
  readonly extends?: string;
}

/**
 * Configuration for event handler pattern generation.
 * Supports both SVO and SOV/VSO languages.
 */
export interface EventHandlerConfig {
  /** Primary event keyword (e.g., 'on', 'bei', 'sur') for SVO */
  readonly keyword?: KeywordTranslation;
  /** Source filter marker (e.g., 'from', 'von', 'de') */
  readonly sourceMarker?: RoleMarker;
  /** Conditional keyword (e.g., 'when', 'wenn', 'quand') */
  readonly conditionalKeyword?: KeywordTranslation;

  /** Event marker for SOV/VSO languages (e.g., で (Japanese), 할 때 (Korean), da (Turkish), عند (Arabic)) */
  readonly eventMarker?: RoleMarker;
  /** Temporal/conditional markers that can optionally appear with events */
  readonly temporalMarkers?: string[];
  /**
   * Negation marker for expressing negated events (e.g., Arabic عدم = "not/lack of").
   * Used in patterns like: عند عدم التركيز = "when not focusing" = "on blur"
   */
  readonly negationMarker?: RoleMarker;
}

/**
 * Verb form used for command keywords.
 *
 * Based on software localization research:
 * - 'infinitive': Standard for most languages (Spanish, French, German, Russian)
 *   Example: "Guardar", "Enregistrer", "Speichern"
 * - 'imperative': Used by some languages (Polish)
 *   Example: "Zapisz", "Otwórz"
 * - 'base': For languages where forms are identical (English, Japanese, Korean)
 *   or where the distinction doesn't apply
 */
export type VerbForm = 'infinitive' | 'imperative' | 'base';

/**
 * Translation of a command keyword.
 */
export interface KeywordTranslation {
  /** Primary translation (used for output/rendering) */
  readonly primary: string;
  /** Alternative forms for parsing (conjugations, synonyms, informal variants) */
  readonly alternatives?: string[];
  /** Normalized English form for internal matching */
  readonly normalized?: string;
  /**
   * The grammatical form of 'primary'. Defaults to 'infinitive'.
   * This documents the form used and enables future form-switching features.
   * - 'infinitive': Dictionary form (alternar, basculer) - industry standard
   * - 'imperative': Command form (alterna, bascule) - for Polish, etc.
   * - 'base': Same form for both (toggle, トグル) - English, Japanese, Korean
   */
  readonly form?: VerbForm;
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
