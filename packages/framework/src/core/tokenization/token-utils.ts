/**
 * Token Utilities
 *
 * Core token creation, stream implementation, and character classification.
 * These are the foundational building blocks used by all tokenizers.
 */

import type { LanguageToken, TokenKind, TokenStream, StreamMark, SourcePosition } from '../types';

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
 * Token creation options (object style).
 */
export interface TokenCreationParams extends CreateTokenOptions {
  value: string;
  kind: TokenKind;
  position: SourcePosition;
}

/**
 * Create a language token (object style).
 */
export function createToken(params: TokenCreationParams): LanguageToken;

/**
 * Create a language token (separate parameters style).
 */
export function createToken(
  value: string,
  kind: TokenKind,
  position: SourcePosition,
  normalizedOrOptions?: string | CreateTokenOptions
): LanguageToken;

/**
 * Create a language token.
 * Supports both object style and separate parameters style.
 */
export function createToken(
  valueOrParams: string | TokenCreationParams,
  kind?: TokenKind,
  position?: SourcePosition,
  normalizedOrOptions?: string | CreateTokenOptions
): LanguageToken {
  // Handle object style
  if (typeof valueOrParams === 'object') {
    const { value, kind, position, normalized, stem, stemConfidence } = valueOrParams;
    return {
      value,
      kind,
      position,
      ...(normalized !== undefined && { normalized }),
      ...(stem !== undefined && { stem }),
      ...(stemConfidence !== undefined && { stemConfidence }),
    };
  }

  // Handle separate parameters style
  const value = valueOrParams;
  if (!kind || !position) {
    throw new Error('createToken requires kind and position parameters');
  }
  // Handle legacy string argument for backward compatibility
  if (typeof normalizedOrOptions === 'string') {
    return { value, kind, position, normalized: normalizedOrOptions };
  }

  // Handle options object
  if (normalizedOrOptions) {
    const { normalized, stem, stemConfidence } = normalizedOrOptions;
    return {
      value,
      kind,
      position,
      ...(normalized !== undefined && { normalized }),
      ...(stem !== undefined && { stem }),
      ...(stemConfidence !== undefined && { stemConfidence }),
    };
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
