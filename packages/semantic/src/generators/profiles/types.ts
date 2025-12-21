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
}

/**
 * Complete language profile for pattern generation.
 */
export interface LanguageProfile {
  /** ISO 639-1 language code */
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
}

/**
 * Configuration for event handler pattern generation.
 * Used by simple SVO languages that don't need hand-crafted patterns.
 */
export interface EventHandlerConfig {
  /** Primary event keyword (e.g., 'on', 'bei', 'sur') */
  readonly keyword: KeywordTranslation;
  /** Source filter marker (e.g., 'from', 'von', 'de') */
  readonly sourceMarker: RoleMarker;
  /** Conditional keyword (e.g., 'when', 'wenn', 'quand') */
  readonly conditionalKeyword?: KeywordTranslation;
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
