/**
 * A language's grammar: the facts that hold for it whatever a DSL says in it.
 *
 * `@lokascript/semantic`'s `LanguageProfile` spreads one of these and adds
 * hyperscript's vocabulary (keywords, references, event-handler words); a
 * domain injects one into the bridge builders (`./multilingual`) with its own
 * vocabulary. Each `languages/<code>` module exports one, as data: no
 * registration, no side effects.
 */

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
 * How "X's Y" is built in a language. The possessive WORDS (my, your, its)
 * are vocabulary, and stay with the DSL that names the references.
 */
export interface PossessiveGrammar {
  /** Possessive marker (e.g., "'s" in English, "の" in Japanese) */
  readonly marker: string;
  /** Position of marker: 'after-object' (X's Y), 'between' (X の Y), 'before-property' */
  readonly markerPosition: 'after-object' | 'between' | 'before-property';
  /** Whether to use possessive adjectives instead of marker (e.g., Spanish mi/tu/su) */
  readonly usePossessiveAdjectives?: boolean;
}

/**
 * Role markers written onto the word before them, as the language writes its
 * case particles (M2 N5): ko `#out에`, ja `#outに`, bn `#outকে`. `markers`
 * attach after code (a selector, a variable, a string); `afterWords` also
 * after a word of the language, where its spelling does not change the
 * marker (`'all'`; bn lists `কে`, and its locative takes the word's form by
 * its own rule: `ক্লিকে`, `জমাতে`). ko picks each particle's form by the
 * word's final consonant (`나를`).
 */
export interface AttachedMarkers {
  readonly markers: readonly string[];
  readonly afterWords?: 'all' | readonly string[];
}

/**
 * One language's grammar. A structural superset of the bridge's
 * `GrammarProfileSlice`, so it injects into the builders as is.
 */
export interface GrammarProfile {
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
  /** Whether the language uses spaces between words */
  readonly usesSpaces: boolean;
  /** Markers for each semantic role */
  readonly roleMarkers: { readonly [role: string]: RoleMarker | undefined };
  /** Verb configuration */
  readonly verb: VerbConfig;
  /** Special tokenization notes */
  readonly tokenization?: TokenizationConfig;
  /**
   * Default verb form for command keywords. Defaults to 'infinitive'.
   *
   * Based on software UI localization research:
   * - 'infinitive': Spanish, French, German, Portuguese, Russian (industry standard)
   * - 'imperative': Polish
   * - 'base': English, Japanese, Korean (no distinction or same form)
   */
  readonly defaultVerbForm?: VerbForm;
  /** Role markers the language writes onto the word before them */
  readonly attachedMarkers?: AttachedMarkers;
  /** How the language builds "X's Y" */
  readonly possessive?: PossessiveGrammar;
}
