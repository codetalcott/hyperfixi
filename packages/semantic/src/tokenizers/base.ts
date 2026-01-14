/**
 * Base Tokenizer
 *
 * Provides the TokenStream implementation and shared tokenization utilities.
 * Language-specific tokenizers extend these base utilities.
 */

import type {
  LanguageToken,
  TokenKind,
  TokenStream,
  StreamMark,
  SourcePosition,
  LanguageTokenizer,
} from '../types';
import type { MorphologicalNormalizer, NormalizationResult } from './morphology/types';

// =============================================================================
// Time Unit Configuration
// =============================================================================

/**
 * Configuration for a native language time unit pattern.
 * Used by tryNumberWithTimeUnits() to match language-specific time units.
 */
export interface TimeUnitMapping {
  /** The pattern to match (e.g., 'segundos', 'ミリ秒') */
  readonly pattern: string;
  /** The standard suffix to use (ms, s, m, h) */
  readonly suffix: string;
  /** Length of the pattern (for optimization) */
  readonly length: number;
  /** Whether to check for word boundary after the pattern */
  readonly checkBoundary?: boolean;
  /** Character that cannot follow the pattern (e.g., 's' for 'm' to avoid 'ms') */
  readonly notFollowedBy?: string;
  /** Whether to do case-insensitive matching */
  readonly caseInsensitive?: boolean;
}

// =============================================================================
// Token Stream Implementation
// =============================================================================

/**
 * Concrete implementation of TokenStream.
 */
export class TokenStreamImpl implements TokenStream {
  readonly tokens: readonly LanguageToken[];
  readonly language: string;
  private pos: number = 0;

  constructor(tokens: LanguageToken[], language: string) {
    this.tokens = tokens;
    this.language = language;
  }

  peek(offset: number = 0): LanguageToken | null {
    const index = this.pos + offset;
    if (index < 0 || index >= this.tokens.length) {
      return null;
    }
    return this.tokens[index];
  }

  advance(): LanguageToken {
    if (this.isAtEnd()) {
      throw new Error('Unexpected end of token stream');
    }
    return this.tokens[this.pos++];
  }

  isAtEnd(): boolean {
    return this.pos >= this.tokens.length;
  }

  mark(): StreamMark {
    return { position: this.pos };
  }

  reset(mark: StreamMark): void {
    this.pos = mark.position;
  }

  position(): number {
    return this.pos;
  }

  /**
   * Get remaining tokens as an array.
   */
  remaining(): LanguageToken[] {
    return this.tokens.slice(this.pos);
  }

  /**
   * Consume tokens while predicate is true.
   */
  takeWhile(predicate: (token: LanguageToken) => boolean): LanguageToken[] {
    const result: LanguageToken[] = [];
    while (!this.isAtEnd() && predicate(this.peek()!)) {
      result.push(this.advance());
    }
    return result;
  }

  /**
   * Skip tokens while predicate is true.
   */
  skipWhile(predicate: (token: LanguageToken) => boolean): void {
    while (!this.isAtEnd() && predicate(this.peek()!)) {
      this.advance();
    }
  }
}

// =============================================================================
// Shared Tokenization Utilities
// =============================================================================

/**
 * Create a source position from start and end offsets.
 */
export function createPosition(start: number, end: number): SourcePosition {
  return { start, end };
}

/**
 * Options for creating a token with optional morphological data.
 */
export interface CreateTokenOptions {
  /** Explicitly normalized form from keyword map */
  normalized?: string;
  /** Morphologically normalized stem */
  stem?: string;
  /** Confidence in the stem (0.0-1.0) */
  stemConfidence?: number;
}

/**
 * Create a language token.
 */
export function createToken(
  value: string,
  kind: TokenKind,
  position: SourcePosition,
  normalizedOrOptions?: string | CreateTokenOptions
): LanguageToken {
  // Handle legacy string argument for backward compatibility
  if (typeof normalizedOrOptions === 'string') {
    return { value, kind, position, normalized: normalizedOrOptions };
  }

  // Handle options object
  if (normalizedOrOptions) {
    const { normalized, stem, stemConfidence } = normalizedOrOptions;
    const token: LanguageToken = { value, kind, position };

    // Build token with only defined properties
    if (normalized !== undefined) {
      (token as any).normalized = normalized;
    }
    if (stem !== undefined) {
      (token as any).stem = stem;
      if (stemConfidence !== undefined) {
        (token as any).stemConfidence = stemConfidence;
      }
    }

    return token;
  }

  return { value, kind, position };
}

/**
 * Check if a character is whitespace.
 */
export function isWhitespace(char: string): boolean {
  return /\s/.test(char);
}

/**
 * Check if a string starts with a CSS selector prefix.
 * Includes JSX-style element selectors: <form />, <div>
 */
export function isSelectorStart(char: string): boolean {
  return (
    char === '#' || char === '.' || char === '[' || char === '@' || char === '*' || char === '<'
  );
}

/**
 * Check if a character is a quote (string delimiter).
 */
export function isQuote(char: string): boolean {
  return char === '"' || char === "'" || char === '`' || char === '「' || char === '」';
}

/**
 * Check if a character is a digit.
 */
export function isDigit(char: string): boolean {
  return /\d/.test(char);
}

/**
 * Check if a character is an ASCII letter.
 */
export function isAsciiLetter(char: string): boolean {
  return /[a-zA-Z]/.test(char);
}

/**
 * Check if a character is part of an ASCII identifier.
 */
export function isAsciiIdentifierChar(char: string): boolean {
  return /[a-zA-Z0-9_-]/.test(char);
}

// =============================================================================
// Unicode Range Classification
// =============================================================================

/**
 * Unicode range tuple: [start, end] (inclusive).
 */
export type UnicodeRange = readonly [number, number];

/**
 * Create a character classifier for Unicode ranges.
 * Returns a function that checks if a character's code point falls within any of the ranges.
 *
 * @example
 * // Japanese Hiragana
 * const isHiragana = createUnicodeRangeClassifier([[0x3040, 0x309f]]);
 *
 * // Korean (Hangul syllables + Jamo)
 * const isKorean = createUnicodeRangeClassifier([
 *   [0xac00, 0xd7a3],  // Hangul syllables
 *   [0x1100, 0x11ff],  // Hangul Jamo
 *   [0x3130, 0x318f],  // Hangul Compatibility Jamo
 * ]);
 */
export function createUnicodeRangeClassifier(
  ranges: readonly UnicodeRange[]
): (char: string) => boolean {
  return (char: string): boolean => {
    const code = char.charCodeAt(0);
    return ranges.some(([start, end]) => code >= start && code <= end);
  };
}

/**
 * Combine multiple character classifiers into one.
 * Returns true if any of the classifiers return true.
 *
 * @example
 * const isJapanese = combineClassifiers(isHiragana, isKatakana, isKanji);
 */
export function combineClassifiers(
  ...classifiers: Array<(char: string) => boolean>
): (char: string) => boolean {
  return (char: string): boolean => classifiers.some(fn => fn(char));
}

/**
 * Character classifiers for a Latin-based language.
 */
export interface LatinCharClassifiers {
  /** Check if character is a letter in this language (including accented chars). */
  isLetter: (char: string) => boolean;
  /** Check if character is part of an identifier (letter, digit, underscore, hyphen). */
  isIdentifierChar: (char: string) => boolean;
}

/**
 * Create character classifiers for a Latin-based language.
 * Returns isLetter and isIdentifierChar functions based on the provided regex.
 *
 * @example
 * // Spanish letters
 * const { isLetter, isIdentifierChar } = createLatinCharClassifiers(/[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]/);
 *
 * // German letters
 * const { isLetter, isIdentifierChar } = createLatinCharClassifiers(/[a-zA-ZäöüÄÖÜß]/);
 */
export function createLatinCharClassifiers(letterPattern: RegExp): LatinCharClassifiers {
  const isLetter = (char: string): boolean => letterPattern.test(char);
  const isIdentifierChar = (char: string): boolean => isLetter(char) || /[0-9_-]/.test(char);
  return { isLetter, isIdentifierChar };
}

// =============================================================================
// CSS Selector Tokenization
// =============================================================================

/**
 * Extract a CSS selector from the input string starting at pos.
 * CSS selectors are universal across languages.
 *
 * Supported formats:
 * - #id
 * - .class
 * - [attribute]
 * - [attribute=value]
 * - @attribute (shorthand)
 * - *property (CSS property shorthand)
 * - Complex selectors with combinators (limited)
 *
 * Method call handling:
 * - #dialog.showModal() → stops after #dialog (method call, not compound selector)
 * - #box.active → compound selector (no parens)
 */
export function extractCssSelector(input: string, startPos: number): string | null {
  if (startPos >= input.length) return null;

  const char = input[startPos];
  if (!isSelectorStart(char)) return null;

  let pos = startPos;
  let selector = '';

  // Handle different selector types
  if (char === '#' || char === '.') {
    // ID or class selector: #id, .class
    selector += input[pos++];
    while (pos < input.length && isAsciiIdentifierChar(input[pos])) {
      selector += input[pos++];
    }
    // Must have at least one character after prefix
    if (selector.length <= 1) return null;

    // Check for method call pattern: #id.method() or .class.method()
    // If we see .identifier followed by (, don't consume it - it's a method call
    if (pos < input.length && input[pos] === '.' && char === '#') {
      // Look ahead to see if this is a method call
      const methodStart = pos + 1;
      let methodEnd = methodStart;
      while (methodEnd < input.length && isAsciiIdentifierChar(input[methodEnd])) {
        methodEnd++;
      }
      // If followed by (, it's a method call - stop here
      if (methodEnd < input.length && input[methodEnd] === '(') {
        return selector;
      }
    }
  } else if (char === '[') {
    // Attribute selector: [attr] or [attr=value]
    let depth = 1;
    selector += input[pos++];
    while (pos < input.length && depth > 0) {
      const c = input[pos];
      selector += c;
      if (c === '[') depth++;
      else if (c === ']') depth--;
      pos++;
    }
    if (depth !== 0) return null;
  } else if (char === '@') {
    // Attribute shorthand: @disabled
    selector += input[pos++];
    while (pos < input.length && isAsciiIdentifierChar(input[pos])) {
      selector += input[pos++];
    }
    if (selector.length <= 1) return null;
  } else if (char === '*') {
    // CSS property shorthand: *display
    selector += input[pos++];
    while (pos < input.length && isAsciiIdentifierChar(input[pos])) {
      selector += input[pos++];
    }
    if (selector.length <= 1) return null;
  } else if (char === '<') {
    // JSX-style element selector: <form>, <form />, <div>
    selector += input[pos++]; // <

    // Must be followed by an identifier (tag name)
    if (pos >= input.length || !isAsciiLetter(input[pos])) return null;

    // Extract tag name
    while (pos < input.length && isAsciiIdentifierChar(input[pos])) {
      selector += input[pos++];
    }

    // Skip whitespace
    while (pos < input.length && isWhitespace(input[pos])) {
      selector += input[pos++];
    }

    // Optional self-closing /
    if (pos < input.length && input[pos] === '/') {
      selector += input[pos++];
      // Skip whitespace after /
      while (pos < input.length && isWhitespace(input[pos])) {
        selector += input[pos++];
      }
    }

    // Must end with >
    if (pos >= input.length || input[pos] !== '>') return null;
    selector += input[pos++]; // >
  }

  return selector || null;
}

// =============================================================================
// String Literal Tokenization
// =============================================================================

/**
 * Check if a single quote at pos is a possessive marker ('s).
 * Returns true if this looks like possessive, not a string start.
 *
 * Examples:
 * - #element's *opacity → possessive (returns true)
 * - 'hello' → string (returns false)
 * - it's value → possessive (returns true)
 */
export function isPossessiveMarker(input: string, pos: number): boolean {
  if (pos >= input.length || input[pos] !== "'") return false;

  // Check if followed by 's' or 'S'
  if (pos + 1 >= input.length) return false;
  const nextChar = input[pos + 1].toLowerCase();
  if (nextChar !== 's') return false;

  // After 's, should be end, whitespace, or special char (not alphanumeric)
  if (pos + 2 >= input.length) return true; // end of input
  const afterS = input[pos + 2];
  return isWhitespace(afterS) || afterS === '*' || !isAsciiIdentifierChar(afterS);
}

/**
 * Extract a string literal from the input starting at pos.
 * Handles both ASCII quotes and Unicode quotes.
 *
 * Note: Single quotes that look like possessive markers ('s) are skipped.
 */
export function extractStringLiteral(input: string, startPos: number): string | null {
  if (startPos >= input.length) return null;

  const openQuote = input[startPos];
  if (!isQuote(openQuote)) return null;

  // Check for possessive marker - don't treat as string
  if (openQuote === "'" && isPossessiveMarker(input, startPos)) {
    return null;
  }

  // Map opening quotes to closing quotes
  const closeQuoteMap: Record<string, string> = {
    '"': '"',
    "'": "'",
    '`': '`',
    '「': '」',
  };

  const closeQuote = closeQuoteMap[openQuote];
  if (!closeQuote) return null;

  let pos = startPos + 1;
  let literal = openQuote;
  let escaped = false;

  while (pos < input.length) {
    const char = input[pos];
    literal += char;

    if (escaped) {
      escaped = false;
    } else if (char === '\\') {
      escaped = true;
    } else if (char === closeQuote) {
      // Found closing quote
      return literal;
    }
    pos++;
  }

  // Unclosed string - return what we have
  return literal;
}

// =============================================================================
// URL Tokenization
// =============================================================================

/**
 * Check if the input at position starts a URL.
 * Detects: /path, ./path, ../path, //domain.com, http://, https://
 */
export function isUrlStart(input: string, pos: number): boolean {
  if (pos >= input.length) return false;

  const char = input[pos];
  const next = input[pos + 1] || '';
  const third = input[pos + 2] || '';

  // Absolute path: /something (but not just /)
  // Must be followed by alphanumeric or path char, not another / (that's protocol-relative)
  if (char === '/' && next !== '/' && /[a-zA-Z0-9._-]/.test(next)) {
    return true;
  }

  // Protocol-relative: //domain.com
  if (char === '/' && next === '/' && /[a-zA-Z]/.test(third)) {
    return true;
  }

  // Relative path: ./ or ../
  if (char === '.' && (next === '/' || (next === '.' && third === '/'))) {
    return true;
  }

  // Full URL: http:// or https://
  const slice = input.slice(pos, pos + 8).toLowerCase();
  if (slice.startsWith('http://') || slice.startsWith('https://')) {
    return true;
  }

  return false;
}

/**
 * Extract a URL from the input starting at pos.
 * Handles paths, query strings, and fragments.
 *
 * Fragment (#) handling:
 * - /page#section → includes fragment as part of URL
 * - #id alone → not a URL (CSS selector)
 */
export function extractUrl(input: string, startPos: number): string | null {
  if (!isUrlStart(input, startPos)) return null;

  let pos = startPos;
  let url = '';

  // Core URL characters (RFC 3986 unreserved + sub-delims + path/query chars)
  // Includes: letters, digits, and - . _ ~ : / ? # [ ] @ ! $ & ' ( ) * + , ; = %
  const urlChars = /[a-zA-Z0-9/:._\-?&=%@+~!$'()*,;[\]]/;

  while (pos < input.length) {
    const char = input[pos];

    // Special handling for #
    if (char === '#') {
      // Only include # if we have path content before it (it's a fragment)
      // If # appears at URL start or after certain chars, stop (might be CSS selector)
      if (url.length > 0 && /[a-zA-Z0-9/.]$/.test(url)) {
        // Include fragment
        url += char;
        pos++;
        // Consume fragment identifier (letters, digits, underscore, hyphen)
        while (pos < input.length && /[a-zA-Z0-9_-]/.test(input[pos])) {
          url += input[pos++];
        }
      }
      // Stop either way - fragment consumed or # is separate token
      break;
    }

    if (urlChars.test(char)) {
      url += char;
      pos++;
    } else {
      break;
    }
  }

  // Minimum length validation
  if (url.length < 2) return null;

  return url;
}

// =============================================================================
// Number Tokenization
// =============================================================================

/**
 * Extract a number from the input starting at pos.
 * Handles integers and decimals.
 */
export function extractNumber(input: string, startPos: number): string | null {
  if (startPos >= input.length) return null;

  const char = input[startPos];
  if (!isDigit(char) && char !== '-' && char !== '+') return null;

  let pos = startPos;
  let number = '';

  // Optional sign
  if (input[pos] === '-' || input[pos] === '+') {
    number += input[pos++];
  }

  // Must have at least one digit
  if (pos >= input.length || !isDigit(input[pos])) {
    return null;
  }

  // Integer part
  while (pos < input.length && isDigit(input[pos])) {
    number += input[pos++];
  }

  // Optional decimal part
  if (pos < input.length && input[pos] === '.') {
    number += input[pos++];
    while (pos < input.length && isDigit(input[pos])) {
      number += input[pos++];
    }
  }

  // Optional duration suffix (s, ms, m, h)
  if (pos < input.length) {
    const suffix = input.slice(pos, pos + 2);
    if (suffix === 'ms') {
      number += 'ms';
    } else if (input[pos] === 's' || input[pos] === 'm' || input[pos] === 'h') {
      number += input[pos];
    }
  }

  return number;
}

// =============================================================================
// Base Tokenizer Class
// =============================================================================

/**
 * Keyword entry for tokenizer - maps native word to normalized English form.
 */
export interface KeywordEntry {
  readonly native: string;
  readonly normalized: string;
}

/**
 * Profile interface for keyword derivation.
 * Matches the structure of LanguageProfile but only includes fields needed for tokenization.
 */
export interface TokenizerProfile {
  readonly keywords?: Record<
    string,
    { primary: string; alternatives?: string[]; normalized?: string }
  >;
  readonly references?: Record<string, string>;
  readonly roleMarkers?: Record<
    string,
    { primary: string; alternatives?: string[]; position?: string }
  >;
}

/**
 * Abstract base class for language-specific tokenizers.
 * Provides common functionality for CSS selectors, strings, and numbers.
 */
export abstract class BaseTokenizer implements LanguageTokenizer {
  abstract readonly language: string;
  abstract readonly direction: 'ltr' | 'rtl';

  /** Optional morphological normalizer for this language */
  protected normalizer?: MorphologicalNormalizer;

  /** Keywords derived from profile, sorted longest-first for greedy matching */
  protected profileKeywords: KeywordEntry[] = [];

  /** Map for O(1) keyword lookups by lowercase native word */
  protected profileKeywordMap: Map<string, KeywordEntry> = new Map();

  abstract tokenize(input: string): TokenStream;
  abstract classifyToken(token: string): TokenKind;

  /**
   * Initialize keyword mappings from a language profile.
   * Builds a list of native→english mappings from:
   * - profile.keywords (primary + alternatives)
   * - profile.references (me, it, you, etc.)
   * - profile.roleMarkers (into, from, with, etc.)
   *
   * Results are sorted longest-first for greedy matching (important for non-space languages).
   * Extras take precedence over profile entries when there are duplicates.
   *
   * @param profile - Language profile containing keyword translations
   * @param extras - Additional keyword entries to include (literals, positional, events)
   */
  protected initializeKeywordsFromProfile(
    profile: TokenizerProfile,
    extras: KeywordEntry[] = []
  ): void {
    // Use a Map to deduplicate, with extras taking precedence
    const keywordMap = new Map<string, KeywordEntry>();

    // Extract from keywords (command translations)
    if (profile.keywords) {
      for (const [normalized, translation] of Object.entries(profile.keywords)) {
        // Primary translation
        keywordMap.set(translation.primary, {
          native: translation.primary,
          normalized: translation.normalized || normalized,
        });

        // Alternative forms
        if (translation.alternatives) {
          for (const alt of translation.alternatives) {
            keywordMap.set(alt, {
              native: alt,
              normalized: translation.normalized || normalized,
            });
          }
        }
      }
    }

    // Extract from references (me, it, you, etc.)
    if (profile.references) {
      for (const [normalized, native] of Object.entries(profile.references)) {
        keywordMap.set(native, { native, normalized });
      }
    }

    // Extract from roleMarkers (into, from, with, etc.)
    if (profile.roleMarkers) {
      for (const [role, marker] of Object.entries(profile.roleMarkers)) {
        if (marker.primary) {
          keywordMap.set(marker.primary, { native: marker.primary, normalized: role });
        }
        if (marker.alternatives) {
          for (const alt of marker.alternatives) {
            keywordMap.set(alt, { native: alt, normalized: role });
          }
        }
      }
    }

    // Add extra entries (literals, positional, events) - these OVERRIDE profile entries
    for (const extra of extras) {
      keywordMap.set(extra.native, extra);
    }

    // Convert to array and sort longest-first for greedy matching
    this.profileKeywords = Array.from(keywordMap.values()).sort(
      (a, b) => b.native.length - a.native.length
    );

    // Build Map for O(1) lookups (case-insensitive)
    this.profileKeywordMap = new Map(this.profileKeywords.map(k => [k.native.toLowerCase(), k]));
  }

  /**
   * Try to match a keyword from profile at the current position.
   * Uses longest-first greedy matching (important for non-space languages).
   *
   * @param input - Input string
   * @param pos - Current position
   * @returns Token if matched, null otherwise
   */
  protected tryProfileKeyword(input: string, pos: number): LanguageToken | null {
    for (const entry of this.profileKeywords) {
      if (input.slice(pos).startsWith(entry.native)) {
        return createToken(
          entry.native,
          'keyword',
          createPosition(pos, pos + entry.native.length),
          entry.normalized
        );
      }
    }
    return null;
  }

  /**
   * Check if the remaining input starts with any known keyword.
   * Useful for non-space languages to detect word boundaries.
   *
   * @param input - Input string
   * @param pos - Current position
   * @returns true if a keyword starts at this position
   */
  protected isKeywordStart(input: string, pos: number): boolean {
    const remaining = input.slice(pos);
    return this.profileKeywords.some(entry => remaining.startsWith(entry.native));
  }

  /**
   * Look up a keyword by native word (case-insensitive).
   * O(1) lookup using the keyword map.
   *
   * @param native - Native word to look up
   * @returns KeywordEntry if found, undefined otherwise
   */
  protected lookupKeyword(native: string): KeywordEntry | undefined {
    return this.profileKeywordMap.get(native.toLowerCase());
  }

  /**
   * Check if a word is a known keyword (case-insensitive).
   * O(1) lookup using the keyword map.
   *
   * @param native - Native word to check
   * @returns true if the word is a keyword
   */
  protected isKeyword(native: string): boolean {
    return this.profileKeywordMap.has(native.toLowerCase());
  }

  /**
   * Set the morphological normalizer for this tokenizer.
   */
  setNormalizer(normalizer: MorphologicalNormalizer): void {
    this.normalizer = normalizer;
  }

  /**
   * Try to normalize a word using the morphological normalizer.
   * Returns null if no normalizer is set or normalization fails.
   *
   * Note: We don't check isNormalizable() here because the individual tokenizers
   * historically called normalize() directly without that check. The normalize()
   * method itself handles returning noChange() for words that can't be normalized.
   */
  protected tryNormalize(word: string): NormalizationResult | null {
    if (!this.normalizer) return null;

    const result = this.normalizer.normalize(word);

    // Only return if actually normalized (stem differs from input)
    if (result.stem !== word && result.confidence >= 0.7) {
      return result;
    }

    return null;
  }

  /**
   * Try morphological normalization and keyword lookup.
   *
   * If the word can be normalized to a stem that matches a known keyword,
   * returns a keyword token with morphological metadata (stem, stemConfidence).
   *
   * This is the common pattern for handling conjugated verbs across languages:
   * 1. Normalize the word (e.g., "toggled" → "toggle")
   * 2. Look up the stem in the keyword map
   * 3. Create a token with both the original form and stem metadata
   *
   * @param word - The word to normalize and look up
   * @param startPos - Start position for the token
   * @param endPos - End position for the token
   * @returns Token if stem matches a keyword, null otherwise
   */
  protected tryMorphKeywordMatch(
    word: string,
    startPos: number,
    endPos: number
  ): LanguageToken | null {
    const result = this.tryNormalize(word);
    if (!result) return null;

    // Check if the stem is a known keyword
    const stemEntry = this.lookupKeyword(result.stem);
    if (!stemEntry) return null;

    const tokenOptions: CreateTokenOptions = {
      normalized: stemEntry.normalized,
      stem: result.stem,
      stemConfidence: result.confidence,
    };
    return createToken(word, 'keyword', createPosition(startPos, endPos), tokenOptions);
  }

  /**
   * Try to extract a CSS selector at the current position.
   */
  protected trySelector(input: string, pos: number): LanguageToken | null {
    const selector = extractCssSelector(input, pos);
    if (selector) {
      return createToken(selector, 'selector', createPosition(pos, pos + selector.length));
    }
    return null;
  }

  /**
   * Try to extract a string literal at the current position.
   */
  protected tryString(input: string, pos: number): LanguageToken | null {
    const literal = extractStringLiteral(input, pos);
    if (literal) {
      return createToken(literal, 'literal', createPosition(pos, pos + literal.length));
    }
    return null;
  }

  /**
   * Try to extract a number at the current position.
   */
  protected tryNumber(input: string, pos: number): LanguageToken | null {
    const number = extractNumber(input, pos);
    if (number) {
      return createToken(number, 'literal', createPosition(pos, pos + number.length));
    }
    return null;
  }

  /**
   * Configuration for native language time units.
   * Maps patterns to their standard suffix (ms, s, m, h).
   */
  protected static readonly STANDARD_TIME_UNITS: readonly TimeUnitMapping[] = [
    { pattern: 'ms', suffix: 'ms', length: 2 },
    { pattern: 's', suffix: 's', length: 1, checkBoundary: true },
    { pattern: 'm', suffix: 'm', length: 1, checkBoundary: true, notFollowedBy: 's' },
    { pattern: 'h', suffix: 'h', length: 1, checkBoundary: true },
  ];

  /**
   * Try to match a time unit from a list of patterns.
   *
   * @param input - Input string
   * @param pos - Position after the number
   * @param timeUnits - Array of time unit mappings (native pattern → standard suffix)
   * @param skipWhitespace - Whether to skip whitespace before time unit (default: false)
   * @returns Object with matched suffix and new position, or null if no match
   */
  protected tryMatchTimeUnit(
    input: string,
    pos: number,
    timeUnits: readonly TimeUnitMapping[],
    skipWhitespace = false
  ): { suffix: string; endPos: number } | null {
    let unitPos = pos;

    // Optionally skip whitespace before time unit
    if (skipWhitespace) {
      while (unitPos < input.length && isWhitespace(input[unitPos])) {
        unitPos++;
      }
    }

    const remaining = input.slice(unitPos);

    // Check each time unit pattern
    for (const unit of timeUnits) {
      const candidate = remaining.slice(0, unit.length);
      const matches = unit.caseInsensitive
        ? candidate.toLowerCase() === unit.pattern.toLowerCase()
        : candidate === unit.pattern;

      if (matches) {
        // Check notFollowedBy constraint (e.g., 'm' should not match 'ms')
        if (unit.notFollowedBy) {
          const nextChar = remaining[unit.length] || '';
          if (nextChar === unit.notFollowedBy) continue;
        }

        // Check word boundary if required
        if (unit.checkBoundary) {
          const nextChar = remaining[unit.length] || '';
          if (isAsciiIdentifierChar(nextChar)) continue;
        }

        return { suffix: unit.suffix, endPos: unitPos + unit.length };
      }
    }

    return null;
  }

  /**
   * Parse a base number (sign, integer, decimal) without time units.
   * Returns the number string and end position.
   *
   * @param input - Input string
   * @param startPos - Start position
   * @param allowSign - Whether to allow +/- sign (default: true)
   * @returns Object with number string and end position, or null
   */
  protected parseBaseNumber(
    input: string,
    startPos: number,
    allowSign = true
  ): { number: string; endPos: number } | null {
    let pos = startPos;
    let number = '';

    // Optional sign
    if (allowSign && (input[pos] === '-' || input[pos] === '+')) {
      number += input[pos++];
    }

    // Must have at least one digit
    if (pos >= input.length || !isDigit(input[pos])) {
      return null;
    }

    // Integer part
    while (pos < input.length && isDigit(input[pos])) {
      number += input[pos++];
    }

    // Optional decimal
    if (pos < input.length && input[pos] === '.') {
      number += input[pos++];
      while (pos < input.length && isDigit(input[pos])) {
        number += input[pos++];
      }
    }

    if (!number || number === '-' || number === '+') return null;

    return { number, endPos: pos };
  }

  /**
   * Try to extract a number with native language time units.
   *
   * This is a template method that handles the common pattern:
   * 1. Parse the base number (sign, integer, decimal)
   * 2. Try to match native language time units
   * 3. Fall back to standard time units (ms, s, m, h)
   *
   * @param input - Input string
   * @param pos - Start position
   * @param nativeTimeUnits - Language-specific time unit mappings
   * @param options - Configuration options
   * @returns Token if number found, null otherwise
   */
  protected tryNumberWithTimeUnits(
    input: string,
    pos: number,
    nativeTimeUnits: readonly TimeUnitMapping[],
    options: { allowSign?: boolean; skipWhitespace?: boolean } = {}
  ): LanguageToken | null {
    const { allowSign = true, skipWhitespace = false } = options;

    // Parse base number
    const baseResult = this.parseBaseNumber(input, pos, allowSign);
    if (!baseResult) return null;

    let { number, endPos } = baseResult;

    // Try native time units first, then standard
    const allUnits = [...nativeTimeUnits, ...BaseTokenizer.STANDARD_TIME_UNITS];
    const timeMatch = this.tryMatchTimeUnit(input, endPos, allUnits, skipWhitespace);

    if (timeMatch) {
      number += timeMatch.suffix;
      endPos = timeMatch.endPos;
    }

    return createToken(number, 'literal', createPosition(pos, endPos));
  }

  /**
   * Try to extract a URL at the current position.
   * Handles /path, ./path, ../path, //domain.com, http://, https://
   */
  protected tryUrl(input: string, pos: number): LanguageToken | null {
    const url = extractUrl(input, pos);
    if (url) {
      return createToken(url, 'url', createPosition(pos, pos + url.length));
    }
    return null;
  }

  /**
   * Try to extract a variable reference (:varname) at the current position.
   * In hyperscript, :x refers to a local variable named x.
   */
  protected tryVariableRef(input: string, pos: number): LanguageToken | null {
    if (input[pos] !== ':') return null;
    if (pos + 1 >= input.length) return null;
    if (!isAsciiIdentifierChar(input[pos + 1])) return null;

    let endPos = pos + 1;
    while (endPos < input.length && isAsciiIdentifierChar(input[endPos])) {
      endPos++;
    }

    const varRef = input.slice(pos, endPos);
    return createToken(varRef, 'identifier', createPosition(pos, endPos));
  }

  /**
   * Try to extract an operator or punctuation token at the current position.
   * Handles two-character operators (==, !=, etc.) and single-character operators.
   */
  protected tryOperator(input: string, pos: number): LanguageToken | null {
    // Two-character operators
    const twoChar = input.slice(pos, pos + 2);
    if (['==', '!=', '<=', '>=', '&&', '||', '->'].includes(twoChar)) {
      return createToken(twoChar, 'operator', createPosition(pos, pos + 2));
    }

    // Single-character operators
    const oneChar = input[pos];
    if (['<', '>', '!', '+', '-', '*', '/', '='].includes(oneChar)) {
      return createToken(oneChar, 'operator', createPosition(pos, pos + 1));
    }

    // Punctuation
    if (['(', ')', '{', '}', ',', ';', ':'].includes(oneChar)) {
      return createToken(oneChar, 'punctuation', createPosition(pos, pos + 1));
    }

    return null;
  }

  /**
   * Try to match a multi-character particle from a list.
   *
   * Used by languages like Japanese, Korean, and Chinese that have
   * multi-character particles (e.g., Japanese から, まで, より).
   *
   * @param input - Input string
   * @param pos - Current position
   * @param particles - Array of multi-character particles to match
   * @returns Token if matched, null otherwise
   */
  protected tryMultiCharParticle(
    input: string,
    pos: number,
    particles: readonly string[]
  ): LanguageToken | null {
    for (const particle of particles) {
      if (input.slice(pos, pos + particle.length) === particle) {
        return createToken(particle, 'particle', createPosition(pos, pos + particle.length));
      }
    }
    return null;
  }
}
