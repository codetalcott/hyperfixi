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
  return char === '#' || char === '.' || char === '[' || char === '@' || char === '*' || char === '<';
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
 * Extract a string literal from the input starting at pos.
 * Handles both ASCII quotes and Unicode quotes.
 */
export function extractStringLiteral(input: string, startPos: number): string | null {
  if (startPos >= input.length) return null;

  const openQuote = input[startPos];
  if (!isQuote(openQuote)) return null;

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
 * Abstract base class for language-specific tokenizers.
 * Provides common functionality for CSS selectors, strings, and numbers.
 */
export abstract class BaseTokenizer implements LanguageTokenizer {
  abstract readonly language: string;
  abstract readonly direction: 'ltr' | 'rtl';

  /** Optional morphological normalizer for this language */
  protected normalizer?: MorphologicalNormalizer;

  abstract tokenize(input: string): TokenStream;
  abstract classifyToken(token: string): TokenKind;

  /**
   * Set the morphological normalizer for this tokenizer.
   */
  setNormalizer(normalizer: MorphologicalNormalizer): void {
    this.normalizer = normalizer;
  }

  /**
   * Try to normalize a word using the morphological normalizer.
   * Returns null if no normalizer is set or normalization fails.
   */
  protected tryNormalize(word: string): NormalizationResult | null {
    if (!this.normalizer) return null;

    // Check if word is normalizable (if the method exists)
    if (this.normalizer.isNormalizable && !this.normalizer.isNormalizable(word)) {
      return null;
    }

    const result = this.normalizer.normalize(word);

    // Only return if actually normalized (stem differs from input)
    if (result.stem !== word && result.confidence >= 0.7) {
      return result;
    }

    return null;
  }

  /**
   * Try to extract a CSS selector at the current position.
   */
  protected trySelector(input: string, pos: number): LanguageToken | null {
    const selector = extractCssSelector(input, pos);
    if (selector) {
      return createToken(
        selector,
        'selector',
        createPosition(pos, pos + selector.length)
      );
    }
    return null;
  }

  /**
   * Try to extract a string literal at the current position.
   */
  protected tryString(input: string, pos: number): LanguageToken | null {
    const literal = extractStringLiteral(input, pos);
    if (literal) {
      return createToken(
        literal,
        'literal',
        createPosition(pos, pos + literal.length)
      );
    }
    return null;
  }

  /**
   * Try to extract a number at the current position.
   */
  protected tryNumber(input: string, pos: number): LanguageToken | null {
    const number = extractNumber(input, pos);
    if (number) {
      return createToken(
        number,
        'literal',
        createPosition(pos, pos + number.length)
      );
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
    return createToken(
      varRef,
      'identifier',
      createPosition(pos, endPos)
    );
  }
}
