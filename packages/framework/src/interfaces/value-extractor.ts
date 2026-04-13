/**
 * Value Extractor Interface - Pluggable Tokenization
 *
 * Extracts typed values from input strings.
 * DSLs can provide custom extractors for their domain-specific syntax.
 *
 * Includes the ContextAwareExtractor extension for extractors that need
 * access to tokenizer state (keyword maps, morphological normalizers, etc.).
 */

import type { MorphologicalNormalizer } from '../core/tokenization/morphology/types';

// =============================================================================
// Keyword Entry (needed by TokenizerContext)
// =============================================================================

/**
 * Keyword entry for tokenizer - maps native word to normalized English form.
 * Re-exported here so ContextAwareExtractor consumers can use it without
 * depending on the base-tokenizer module directly.
 */
export interface KeywordEntry {
  readonly native: string;
  readonly normalized: string;
}

// =============================================================================
// Core Extractor Types
// =============================================================================

/**
 * Extraction result with value and consumed length.
 */
export interface ExtractionResult {
  /** The extracted value */
  readonly value: string;

  /** Number of characters consumed */
  readonly length: number;

  /** Optional metadata about the extraction */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Value extractor - identifies and extracts typed values from input.
 */
export interface ValueExtractor {
  /** Name of this extractor (for debugging) */
  readonly name: string;

  /**
   * Check if this extractor can handle input at position.
   *
   * @param input - Full input string
   * @param position - Current position
   * @returns True if this extractor should try
   *
   * @example
   * // CSS selector extractor
   * canExtract('#button', 0) // → true (starts with #)
   * canExtract('button', 0)  // → false
   */
  canExtract(input: string, position: number): boolean;

  /**
   * Extract value from input at position.
   *
   * @param input - Full input string
   * @param position - Start position
   * @returns Extraction result or null if extraction failed
   *
   * @example
   * extract('#button', 0) // → { value: '#button', length: 7 }
   * extract('button', 0)  // → null (can't extract CSS selector)
   */
  extract(input: string, position: number): ExtractionResult | null;
}

/**
 * String literal extractor - handles quoted strings.
 */
export class StringLiteralExtractor implements ValueExtractor {
  readonly name = 'string-literal';

  canExtract(input: string, position: number): boolean {
    const char = input[position];
    return (
      char === '"' ||
      char === "'" ||
      char === '`' ||
      char === '\u201C' || // Chinese double quote open "
      char === '\u2018' // Chinese single quote open '
    );
  }

  extract(input: string, position: number): ExtractionResult | null {
    const quote = input[position];

    // Chinese double quotes " ... "
    if (quote === '\u201C') {
      let length = 1;
      while (position + length < input.length) {
        if (input[position + length] === '\u201D') {
          length++;
          return { value: input.substring(position, position + length), length };
        }
        length++;
      }
      return null;
    }

    // Chinese single quotes ' ... '
    if (quote === '\u2018') {
      let length = 1;
      while (position + length < input.length) {
        if (input[position + length] === '\u2019') {
          length++;
          return { value: input.substring(position, position + length), length };
        }
        length++;
      }
      return null;
    }

    // ASCII quotes (same open/close, support escaping)
    let length = 1;
    let escaped = false;

    while (position + length < input.length) {
      const char = input[position + length];

      if (escaped) {
        escaped = false;
        length++;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        length++;
        continue;
      }

      if (char === quote) {
        length++; // Include closing quote
        return {
          value: input.substring(position, position + length),
          length,
        };
      }

      length++;
    }

    // Unterminated string
    return null;
  }
}

/**
 * Number extractor - handles integers and floats.
 */
export class NumberExtractor implements ValueExtractor {
  readonly name = 'number';

  canExtract(input: string, position: number): boolean {
    return /\d/.test(input[position]);
  }

  extract(input: string, position: number): ExtractionResult | null {
    let length = 0;
    let hasDecimal = false;

    while (position + length < input.length) {
      const char = input[position + length];

      if (/\d/.test(char)) {
        length++;
      } else if (char === '.' && !hasDecimal) {
        hasDecimal = true;
        length++;
      } else {
        break;
      }
    }

    if (length === 0) return null;

    const numValue = input.substring(position, position + length);
    const afterNum = position + length;

    // Check for time unit suffixes
    if (afterNum < input.length) {
      const remaining = input.slice(afterNum);

      // CJK multi-char time units (longest first)
      const cjkMultiUnits: { pattern: string; suffix: string }[] = [
        { pattern: '毫秒', suffix: 'ms' }, // Chinese milliseconds
        { pattern: '分钟', suffix: 'm' }, // Chinese minutes
        { pattern: '小时', suffix: 'h' }, // Chinese hours
        { pattern: 'ミリ秒', suffix: 'ms' }, // Japanese milliseconds
        { pattern: '時間', suffix: 'h' }, // Japanese hours
      ];
      for (const unit of cjkMultiUnits) {
        if (remaining.startsWith(unit.pattern)) {
          return {
            value: numValue + unit.suffix,
            length: length + unit.pattern.length,
            metadata: { hasTimeUnit: true },
          };
        }
      }

      // ASCII 'ms' (2 chars, must check before single-char)
      if (remaining.startsWith('ms')) {
        return {
          value: numValue + 'ms',
          length: length + 2,
          metadata: { hasTimeUnit: true },
        };
      }

      // CJK single-char time units
      const cjkSingleUnits: { pattern: string; suffix: string }[] = [
        { pattern: '秒', suffix: 's' }, // CJK seconds
        { pattern: '分', suffix: 'm' }, // CJK minutes
      ];
      for (const unit of cjkSingleUnits) {
        if (remaining.startsWith(unit.pattern)) {
          return {
            value: numValue + unit.suffix,
            length: length + 1,
            metadata: { hasTimeUnit: true },
          };
        }
      }

      // ASCII single-char units: s, m, h (with word boundary check)
      if (/^[smh](?![a-zA-Z])/.test(remaining)) {
        return {
          value: numValue + remaining[0],
          length: length + 1,
          metadata: { hasTimeUnit: true },
        };
      }
    }

    return { value: numValue, length };
  }
}

/**
 * Identifier extractor - handles variable/property names.
 */
export class IdentifierExtractor implements ValueExtractor {
  readonly name = 'identifier';

  canExtract(input: string, position: number): boolean {
    return /[a-zA-Z_]/.test(input[position]);
  }

  extract(input: string, position: number): ExtractionResult | null {
    let length = 0;

    while (position + length < input.length) {
      const char = input[position + length];
      if (/[a-zA-Z0-9_]/.test(char)) {
        length++;
      } else {
        break;
      }
    }

    return length > 0
      ? {
          value: input.substring(position, position + length),
          length,
        }
      : null;
  }
}

/**
 * Unicode identifier extractor - handles non-Latin scripts.
 *
 * Matches contiguous runs of Unicode letters, numbers, and combining marks
 * that aren't ASCII (ASCII identifiers are handled by IdentifierExtractor).
 * Essential for DSLs supporting CJK, Arabic, Cyrillic, Devanagari, etc.
 */
export class UnicodeIdentifierExtractor implements ValueExtractor {
  readonly name = 'unicode-identifier';

  canExtract(input: string, position: number): boolean {
    const code = input.charCodeAt(position);
    // Skip ASCII range (handled by IdentifierExtractor)
    if (code < 0x80) return false;
    // Match any Unicode letter
    return /\p{L}/u.test(input[position]);
  }

  extract(input: string, position: number): ExtractionResult | null {
    let length = 0;

    while (position + length < input.length) {
      const char = input[position + length];
      // Match Unicode letters, numbers, and combining marks (e.g., Arabic diacritics)
      if (/[\p{L}\p{N}\p{M}]/u.test(char)) {
        length++;
      } else {
        break;
      }
    }

    return length > 0 ? { value: input.substring(position, position + length), length } : null;
  }
}

/**
 * Latin Extended identifier extractor — handles Latin-script languages with
 * diacritics (Spanish ñ/á/é/í/ó/ú; French é/à/ù/ç; Turkish ç/ş/ı/ü/ğ/ö;
 * Portuguese ã/õ; German ä/ö/ü/ß; etc).
 *
 * Use this in addition to (or instead of) the default `IdentifierExtractor`
 * for any tokenizer whose language is Latin-script and may contain diacritic
 * characters in identifiers. Without it, words like `añadir` tokenize as
 * `["a", "ñadir"]` because the default ASCII extractor stops at `ñ` and the
 * Unicode extractor only kicks in when a token *starts* with a non-ASCII
 * character.
 *
 * Matches contiguous runs of `/[\p{L}\p{N}_-]/u` — any Unicode letter or
 * number, plus underscore and hyphen.
 */
export class LatinExtendedIdentifierExtractor implements ValueExtractor {
  readonly name = 'latin-extended-identifier';

  canExtract(input: string, position: number): boolean {
    return /\p{L}/u.test(input[position]);
  }

  extract(input: string, position: number): ExtractionResult | null {
    let end = position;
    while (end < input.length && /[\p{L}\p{N}_-]/u.test(input[end])) {
      end++;
    }
    if (end === position) return null;
    return { value: input.slice(position, end), length: end - position };
  }
}

/**
 * Whitespace extractor - handles spaces, tabs, newlines.
 */
export class WhitespaceExtractor implements ValueExtractor {
  readonly name = 'whitespace';

  canExtract(input: string, position: number): boolean {
    return /\s/.test(input[position]);
  }

  extract(input: string, position: number): ExtractionResult | null {
    let length = 0;

    while (position + length < input.length && /\s/.test(input[position + length])) {
      length++;
    }

    return length > 0
      ? {
          value: input.substring(position, position + length),
          length,
        }
      : null;
  }
}

// =============================================================================
// Context-Aware Extractor System
// =============================================================================

/**
 * Tokenizer context provided to context-aware extractors.
 * Gives extractors access to tokenizer state without tight coupling.
 */
export interface TokenizerContext {
  /** ISO 639-1 language code */
  readonly language: string;

  /** Text direction */
  readonly direction: 'ltr' | 'rtl';

  /**
   * Look up a keyword by its native form.
   * Returns keyword entry with normalized form, or undefined if not found.
   */
  lookupKeyword(native: string): KeywordEntry | undefined;

  /**
   * Check if a word is a known keyword.
   */
  isKeyword(native: string): boolean;

  /**
   * Check if a known keyword starts at the given position.
   * Useful for word boundary detection in non-space languages.
   */
  isKeywordStart(input: string, position: number): boolean;

  /**
   * Optional morphological normalizer for this language.
   */
  readonly normalizer?: MorphologicalNormalizer;
}

/**
 * Context-aware extractor - has access to tokenizer state.
 *
 * Use this for extractors that need:
 * - Keyword lookup (for normalization)
 * - Morphological analysis (for conjugation handling)
 * - Language-specific rules
 *
 * For stateless extractors (strings, numbers, operators), use ValueExtractor.
 */
export interface ContextAwareExtractor extends ValueExtractor {
  /**
   * Set the tokenizer context.
   * Called once by the tokenizer during registration.
   */
  setContext(context: TokenizerContext): void;
}

/**
 * Type guard to check if an extractor is context-aware.
 */
export function isContextAwareExtractor(
  extractor: ValueExtractor | ContextAwareExtractor
): extractor is ContextAwareExtractor {
  return 'setContext' in extractor && typeof extractor.setContext === 'function';
}

/**
 * Create a TokenizerContext from a tokenizer instance.
 * Works with any object that exposes the required methods.
 */
export function createTokenizerContext(tokenizer: {
  language: string;
  direction: 'ltr' | 'rtl';
  lookupKeyword(native: string): KeywordEntry | undefined;
  isKeyword(native: string): boolean;
  isKeywordStart(input: string, position: number): boolean;
  normalizer?: MorphologicalNormalizer;
}): TokenizerContext {
  const ctx: TokenizerContext = {
    language: tokenizer.language,
    direction: tokenizer.direction,
    lookupKeyword: tokenizer.lookupKeyword.bind(tokenizer),
    isKeyword: tokenizer.isKeyword.bind(tokenizer),
    isKeywordStart: tokenizer.isKeywordStart.bind(tokenizer),
  };

  if (tokenizer.normalizer) {
    return { ...ctx, normalizer: tokenizer.normalizer };
  }

  return ctx;
}
