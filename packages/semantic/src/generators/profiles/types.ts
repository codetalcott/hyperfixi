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
 * Writing system used by a language.
 * Non-latin scripts require AsciiIdentifierExtractor in their tokenizer
 * to handle mixed-script input (e.g., Arabic verb + CSS property name).
 */
export type ScriptType =
  'latin' | 'cyrillic' | 'arabic' | 'cjk' | 'devanagari' | 'hangul' | 'bengali' | 'thai' | 'hebrew';

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
  /**
   * Connector words that sit BETWEEN a possessor keyword and the property in a
   * possessor-first construction, e.g. Indonesian `saya punya *background`
   * ("I have *background" = "my *background"). The pattern matcher skips a
   * connector after the possessor keyword so the property is reached.
   * English ("my value") needs none; this is only for multi-word possessives.
   */
  readonly connectors?: readonly string[];
}

/**
 * Complete language profile for pattern generation.
 *
 * Canonical field mapping (Phase 4.1 — single source of truth):
 *
 * | Profile Field      | Downstream Artifact                           | Generator Script              |
 * |--------------------|-----------------------------------------------|-------------------------------|
 * | keywords.primary   | i18n dictionary files                         | generate-i18n-dictionaries    |
 * | wordOrder, markers | i18n grammar profiles                         | generate-i18n-grammar-profiles|
 * | grammarRules       | i18n grammar transformation rules             | generate-i18n-grammar-profiles|
 * | keywords (top-N)   | vite-plugin detection keyword sets            | generate-vite-keywords        |
 * | regions            | semantic bundle entry points + tsup config     | generate-bundle-entries       |
 * | code, extends      | language registration + variant inheritance    | (runtime)                     |
 */
export interface LanguageProfile {
  /** ISO 639-1 or BCP 47 language code (e.g., 'es' or 'en-US') */
  readonly code: string;
  /** Human-readable language name */
  readonly name: string;
  /** Native name */
  readonly nativeName: string;
  /** Text direction */
  readonly direction: 'ltr' | 'rtl';
  /** Writing system — non-latin scripts require AsciiIdentifierExtractor in their tokenizer */
  readonly script: ScriptType;
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
   * When true, role markers (case particles/postpositions) are emitted as
   * OPTIONAL pattern tokens, so colloquial marker-dropping input still parses
   * (e.g. Turkish `.active değiştir` alongside the canonical `.active i
   * değiştir`). The canonical marked form remains the higher-confidence match;
   * this only adds a lower-priority fallback. Leave unset (false) for languages
   * where the particle is grammatically load-bearing (e.g. Japanese/Korean).
   */
  readonly markersOptional?: boolean;
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
   * Example: 'en-GB' profile with extends: 'en' inherits from Spanish base.
   */
  readonly extends?: string;
  /**
   * Bundle region tags for automatic bundle selection (Phase 4.1).
   * Used by vite-plugin and bundle generation scripts.
   * Example: ['east-asian', 'priority'] for Japanese.
   */
  readonly regions?: readonly string[];
  /**
   * Grammar transformation rules for i18n word-order rewriting (Phase 4.1).
   * When present, these rules can generate i18n grammar profiles automatically.
   * Format TBD — currently the i18n package defines its own GrammarRule type.
   */
  readonly grammarRules?: readonly GrammarRuleRef[];
  /**
   * Non-command vocabulary: the words that appear INSIDE role values rather
   * than as the command verb or a role marker.
   *
   * `keywords` covers command verbs; `roleMarkers` covers the particles that
   * frame a role. Neither covers the interior of a value — the `true` in
   * `set @disabled to true`, the `value` in `put my value into #out`, the
   * `seconds` in `wait 2 seconds`. Without this block the renderer emits those
   * words in English, and the target-language parser cannot bind them back,
   * so the role is silently dropped (measured 2026-08-26: en→foreign render was
   * 73.3% structurally clean against the English reference, versus 97.0% for the
   * i18n corpus, and 99.6% of the loss is attributable to five value types).
   *
   * The parse side has always had this vocabulary — in the i18n dictionaries and
   * in each tokenizer's EXTRAS (`spanish.ts` knows `verdadero → true`). This block
   * is what makes it reachable from the RENDER side, so `translate('set @disabled
   * to true', 'en', 'es')` can emit `verdadero` rather than `true`.
   *
   * Category names mirror `Dictionary` in @lokascript/i18n so the derivation is
   * mechanical. `primary` is the form to RENDER; `alternatives` are additional
   * surfaces to ACCEPT when parsing.
   */
  readonly lexicon?: LanguageLexicon;
}

/**
 * Non-command vocabulary, grouped the way the i18n `Dictionary` groups it.
 *
 * Every category is optional: a language that lacks an entry renders that word
 * in English, which is exactly today's behaviour, so partial coverage is safe
 * and additive. (Hebrew ships 30 entries where most languages ship ~110.)
 */
export interface LanguageLexicon {
  /** DOM event names: click → クリック. A `render: false` entry parses but never renders. */
  readonly events?: Record<string, KeywordTranslation>;
  /** Boolean/comparison/connective words: and, or, not, is, then, else, end. */
  readonly logical?: Record<string, KeywordTranslation>;
  /** Time units and loop words: seconds, ms, times, forever, until. */
  readonly temporal?: Record<string, KeywordTranslation>;
  /** Literals and globals: true, false, null, window, document, value. */
  readonly values?: Record<string, KeywordTranslation>;
  /** Attribute-ish nouns: class, style, attribute, property (+ localized hx-* names). */
  readonly attributes?: Record<string, KeywordTranslation>;
  /** Expression-leaf words: first, last, next, closest, at, starts with. */
  readonly expressions?: Record<string, KeywordTranslation>;
}

/**
 * Reference to a grammar transformation rule (Phase 4.1).
 * Lightweight pointer — full rule definitions live in the i18n package.
 */
export interface GrammarRuleRef {
  /** Rule name (matches i18n GrammarRule.name) */
  readonly name: string;
  /** Priority override (higher = checked first) */
  readonly priority?: number;
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
