/**
 * Framework ↔ Semantic bridge types.
 *
 * The bridge is injection-based: framework never imports the semantic package
 * (semantic depends on framework). Instead, these are *structural* types that
 * any `@lokascript/semantic` `LanguageProfile` satisfies without a cast, so a
 * domain package imports the profile data from semantic and injects it into
 * the builders in `./builders.ts`. Minimal hand-rolled fixtures satisfy them
 * too, so tests (and domains without a semantic dep) need nothing extra.
 */

/**
 * A grammatical marker (preposition, particle, case suffix) for one role.
 * Structural mirror of semantic's `RoleMarker` (position optional so
 * hand-rolled fixtures can omit it; word-order defaults apply downstream).
 */
export interface RoleMarkerSlice {
  readonly primary: string;
  readonly alternatives?: readonly string[];
  readonly position?: 'before' | 'after';
}

/** Structural mirror of semantic's `TokenizationConfig`. */
export interface TokenizationSlice {
  readonly particles?: readonly string[];
  readonly prefixes?: readonly string[];
  readonly boundaryStrategy?: 'space' | 'particle' | 'character';
}

/** Structural mirror of semantic's `VerbConfig` (all fields optional). */
export interface VerbSlice {
  readonly position?: 'start' | 'end' | 'second';
  readonly suffixes?: readonly string[];
  readonly subjectDrop?: boolean;
}

/**
 * The domain-reusable slice of a language profile: grammar and tokenization
 * facts that hold for the language regardless of vocabulary. Everything a
 * domain does NOT have to author when it inherits a language.
 *
 * Deliberately excludes the hyperscript-specific fields of semantic's
 * `LanguageProfile` (`keywords`, `eventHandler`, `possessive`, `references`)
 * — a domain supplies its own vocabulary via {@link DomainVocabulary}.
 *
 * `roleMarkers` values admit `undefined` so semantic's
 * `Partial<Record<SemanticRole, RoleMarker>>` assigns cleanly.
 */
export interface GrammarProfileSlice {
  /** ISO 639-1 / BCP 47 language code */
  readonly code: string;
  /** Primary word order */
  readonly wordOrder: 'SVO' | 'SOV' | 'VSO' | 'VOS' | 'OSV' | 'OVS';
  /** Default grammatical markers per semantic role */
  readonly roleMarkers?: { readonly [role: string]: RoleMarkerSlice | undefined };
  /** How the language marks grammatical roles */
  readonly markingStrategy?: 'preposition' | 'postposition' | 'particle' | 'case-suffix';
  /** Tokenization facts (particles, word-boundary strategy) */
  readonly tokenization?: TokenizationSlice;
  /** Verb placement/conjugation facts */
  readonly verb?: VerbSlice;
  /** Text direction (default 'ltr') */
  readonly direction?: 'ltr' | 'rtl';
  /** Writing system (semantic's `ScriptType`; 'latin' enables diacritic-safe identifiers) */
  readonly script?: string;
  /** Whether words are space-separated */
  readonly usesSpaces?: boolean;
  /** Human-readable English name */
  readonly name?: string;
  /** Native name */
  readonly nativeName?: string;
}

/** One domain keyword's translations in one language. */
export interface DomainKeywordTranslation {
  /** Primary translation (used for rendering and as the canonical parse form) */
  readonly primary: string;
  /** Alternative forms accepted when parsing (synonyms, informal variants) */
  readonly alternatives?: readonly string[];
  /** Normalized (English/action) form; defaults to the keyword's action name */
  readonly normalized?: string;
}

/**
 * A native→normalized tokenizer keyword mapping, structural mirror of the
 * tokenization layer's `KeywordEntry`.
 */
export interface DomainKeywordEntry {
  readonly native: string;
  readonly normalized: string;
}

/**
 * What a domain authors per language — and *only* this. Everything else
 * (word order, markers, particles, script, direction) comes from the injected
 * {@link GrammarProfileSlice}.
 */
export interface DomainVocabulary {
  /**
   * Per-action keyword translations for the domain's own verbs,
   * keyed by action name (e.g. `select`, `insert`).
   */
  readonly keywords: Readonly<Record<string, DomainKeywordTranslation>>;
  /**
   * Extra bare tokenizer keywords beyond the derived set — connectives,
   * literals, and operators-as-words (e.g. `and`, `or`, `null`, `between`).
   */
  readonly tokenizerKeywords?: readonly string[];
  /**
   * Extra native→normalized entries for the tokenizer's keyword map.
   * These OVERRIDE derived entries with the same native word.
   */
  readonly keywordExtras?: readonly DomainKeywordEntry[];
  /**
   * Domain-specific role markers for this language, merged over the slice's
   * `roleMarkers` (vocabulary wins). Use for roles the language profile has no
   * marker for (e.g. SQL `condition` → ja `条件`) or where the domain needs a
   * different marker than the language default.
   */
  readonly roleMarkerOverrides?: Readonly<Record<string, RoleMarkerSlice>>;
}
