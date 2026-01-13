/**
 * Types for the prism-hyperfixi syntax highlighting plugin.
 */

/**
 * Token types for Prism syntax highlighting.
 * These map to CSS classes for styling.
 */
export type PrismTokenType =
  | 'command' // toggle, add, remove (bold)
  | 'modifier' // to, from, into, with
  | 'event' // click, focus, submit
  | 'logical' // when, where, and, or, not
  | 'temporal' // seconds, milliseconds, ms
  | 'value' // true, false, null, it, me
  | 'attribute' // class, style, property
  | 'expression' // first, last, next, closest
  | 'selector' // #id, .class, [attr]
  | 'string' // "text", 'text'
  | 'number' // 123, 1.5s
  | 'comment' // -- comment
  | 'operator' // ==, !=, >, <
  | 'punctuation'; // (, ), {, }

/**
 * Configuration options for the prism-hyperfixi plugin.
 */
export interface PrismHyperfixiOptions {
  /**
   * Language to use for highlighting.
   * - 'auto': Detect language from code content (default)
   * - Specific ISO code (e.g., 'en', 'ja', 'es'): Force that language
   */
  language?: 'auto' | string;

  /**
   * Custom CSS class prefix for tokens.
   * Default: 'hs-'
   */
  classPrefix?: string;

  /**
   * Apply bold styling to command keywords.
   * Default: true
   */
  boldCommands?: boolean;

  /**
   * Languages to preload patterns for (performance optimization).
   * Default: ['en']
   */
  preloadLanguages?: string[];

  /**
   * Custom keywords to add/override per category.
   */
  customKeywords?: Partial<Record<PrismTokenType, string[]>>;
}

/**
 * Generated patterns for a specific language.
 */
export interface LanguagePatterns {
  /** ISO language code */
  language: string;

  /** Text direction (ltr or rtl) */
  direction: 'ltr' | 'rtl';

  /** Whether this language uses non-Latin script */
  isNonLatin: boolean;

  /** Regex patterns for each token category */
  patterns: {
    command: RegExp;
    modifier: RegExp;
    event: RegExp;
    logical: RegExp;
    temporal: RegExp;
    value: RegExp;
    attribute: RegExp;
    expression: RegExp;
  };
}

/**
 * Result of language detection.
 */
export interface LanguageDetectionResult {
  /** Detected primary language code */
  language: string;

  /** Confidence score (0-1) */
  confidence: number;

  /** Keywords that matched this language */
  matchedKeywords: string[];

  /** Alternative possible languages with their confidence scores */
  alternatives: Array<{
    language: string;
    confidence: number;
  }>;
}

/**
 * Prism Grammar type (simplified for our use).
 * Full typing would require the prismjs package.
 */
export interface PrismGrammar {
  [key: string]: RegExp | PrismTokenDefinition | Array<RegExp | PrismTokenDefinition>;
}

/**
 * Prism token definition.
 */
export interface PrismTokenDefinition {
  pattern: RegExp;
  alias?: string | string[];
  inside?: PrismGrammar;
  lookbehind?: boolean;
  greedy?: boolean;
}

/**
 * Prism environment object passed to hooks.
 */
export interface PrismEnv {
  element?: Element;
  language: string;
  grammar: PrismGrammar;
  code: string;
  tokens?: unknown[];
}

/**
 * Minimal Prism type for registration.
 * This allows the plugin to work without a full Prism type dependency.
 */
export interface PrismLike {
  languages: Record<string, PrismGrammar>;
  hooks: {
    add: (hookName: string, callback: (env: PrismEnv) => void) => void;
  };
  highlight: (code: string, grammar: PrismGrammar, language: string) => string;
}
