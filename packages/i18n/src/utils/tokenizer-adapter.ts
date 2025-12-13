/**
 * Tokenizer Adapter
 *
 * Bridges the semantic package's sophisticated tokenizers to i18n's
 * dictionary-based token categorization system.
 *
 * The semantic tokenizers handle:
 * - Language-specific word boundaries
 * - CSS selectors, URLs, string literals
 * - Grammatical particles (を, に, من)
 * - Morphological normalization
 *
 * This adapter converts semantic tokens to i18n tokens by:
 * 1. Using semantic's tokenize() for sophisticated tokenization
 * 2. Mapping TokenKind to TokenType via dictionary lookup for keywords
 * 3. Preserving position information for round-trip support
 */

import type { Token, TokenType } from '../types';
import { dictionaries } from '../dictionaries';

// =============================================================================
// Semantic Tokenizer Integration
// =============================================================================

// Types from semantic package (inlined to avoid circular dependency issues)
interface SourcePosition {
  readonly start: number;
  readonly end: number;
  readonly line?: number;
  readonly column?: number;
}

type TokenKind =
  | 'keyword'
  | 'selector'
  | 'literal'
  | 'particle'
  | 'identifier'
  | 'operator'
  | 'punctuation'
  | 'url';

interface LanguageToken {
  readonly value: string;
  readonly kind: TokenKind;
  readonly position: SourcePosition;
  readonly normalized?: string;
  readonly stem?: string;
  readonly stemConfidence?: number;
}

interface TokenStream {
  readonly tokens: readonly LanguageToken[];
  readonly language: string;
}

// Lazy load semantic tokenizers to avoid circular dependency at module load time
let _semanticTokenize: ((input: string, language: string) => TokenStream) | null = null;
let _isLanguageSupported: ((language: string) => boolean) | null = null;
let _semanticLoaded = false;
let _semanticLoadFailed = false;

async function loadSemantic(): Promise<boolean> {
  if (_semanticLoaded) return !_semanticLoadFailed;
  if (_semanticLoadFailed) return false;

  try {
    // Dynamic import to break circular dependency
    const semantic = await import('@hyperfixi/semantic');
    _semanticTokenize = semantic.tokenize;
    _isLanguageSupported = semantic.isLanguageSupported;
    _semanticLoaded = true;
    return true;
  } catch {
    _semanticLoadFailed = true;
    return false;
  }
}

// Synchronous check - only works after first async load
function isSemanticAvailable(): boolean {
  return _semanticLoaded && !_semanticLoadFailed;
}

function semanticTokenize(input: string, language: string): TokenStream | null {
  if (!_semanticTokenize) return null;
  try {
    return _semanticTokenize(input, language);
  } catch {
    return null;
  }
}

function semanticIsLanguageSupported(language: string): boolean {
  if (!_isLanguageSupported) return false;
  return _isLanguageSupported(language);
}

// =============================================================================
// Token Type Mapping
// =============================================================================

/**
 * Map semantic TokenKind to i18n TokenType.
 *
 * Semantic TokenKind → i18n TokenType:
 * - keyword: Use dictionary lookup to determine specific type
 * - selector: identifier (selectors don't get translated)
 * - literal: literal
 * - particle: modifier (grammatical particles)
 * - identifier: identifier
 * - operator: operator
 * - punctuation: operator
 * - url: literal
 */
function mapTokenKind(kind: TokenKind): TokenType {
  switch (kind) {
    case 'keyword':
      // Will be refined by dictionary lookup
      return 'identifier';
    case 'selector':
      return 'identifier';
    case 'literal':
      return 'literal';
    case 'particle':
      return 'modifier';
    case 'identifier':
      return 'identifier';
    case 'operator':
      return 'operator';
    case 'punctuation':
      return 'operator';
    case 'url':
      return 'literal';
    default:
      return 'identifier';
  }
}

/**
 * Determine the specific i18n TokenType for a word by looking up
 * in the locale's dictionary.
 *
 * Order matters: events before commands since many events (click, focus)
 * also appear in commands.
 */
function categorizeWord(word: string, locale: string): TokenType {
  const lowerWord = word.toLowerCase();

  // Map dictionary categories to token types (events first to handle 'click' etc.)
  const categoryToType: Array<[string, TokenType]> = [
    ['events', 'event'],
    ['commands', 'command'],
    ['expressions', 'expression'],
    ['modifiers', 'modifier'],
    ['logical', 'logical'],
    ['temporal', 'temporal'],
    ['values', 'value'],
    ['attributes', 'attribute'],
  ];

  // Check all supported dictionaries (source locale + English)
  const localesToCheck = locale === 'en' ? ['en'] : [locale, 'en'];

  for (const loc of localesToCheck) {
    const dict = dictionaries[loc];
    if (!dict) continue;

    // Check categories in priority order (events before commands)
    for (const [category, tokenType] of categoryToType) {
      const translations = dict[category as keyof typeof dict];
      if (!translations || typeof translations !== 'object') continue;

      // Check if word matches a key (English) or value (translated)
      for (const [key, value] of Object.entries(translations)) {
        if (key.toLowerCase() === lowerWord || value.toLowerCase() === lowerWord) {
          return tokenType;
        }
      }
    }
  }

  // Default to identifier
  return 'identifier';
}

// =============================================================================
// Token Conversion
// =============================================================================

/**
 * Convert a semantic LanguageToken to an i18n Token.
 */
function convertToken(token: LanguageToken, locale: string): Token {
  let type: TokenType;

  if (token.kind === 'keyword') {
    // For keywords, use dictionary lookup to get specific type
    // Use normalized form if available (e.g., 切り替え → toggle)
    const lookupWord = token.normalized || token.value;
    type = categorizeWord(lookupWord, locale);
  } else {
    type = mapTokenKind(token.kind);
  }

  return {
    type,
    value: token.value,
    position: {
      start: token.position.start,
      end: token.position.end,
      line: token.position.line ?? 1,
      column: token.position.column ?? token.position.start + 1,
    },
  };
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Initialize the semantic tokenizer (call once at app startup for best performance).
 * This is optional - tokenize() will work without it, using fallback tokenization.
 */
export async function initSemanticTokenizer(): Promise<boolean> {
  return loadSemantic();
}

/**
 * Tokenize input using semantic package's sophisticated tokenizers,
 * converting to i18n-compatible tokens.
 *
 * Falls back to basic tokenization if:
 * - Semantic package not loaded yet
 * - Language not supported by semantic
 * - Any error occurs
 *
 * For best performance, call initSemanticTokenizer() at app startup.
 */
export function tokenize(text: string, locale: string): Token[] {
  // Try semantic tokenization if available
  if (isSemanticAvailable() && semanticIsLanguageSupported(locale)) {
    const stream = semanticTokenize(text, locale);
    if (stream) {
      const tokens: Token[] = [];
      for (const semanticToken of stream.tokens) {
        tokens.push(convertToken(semanticToken, locale));
      }
      return tokens;
    }
  }

  // Fall back to basic tokenization
  return tokenizeBasic(text, locale);
}

/**
 * Tokenize with async initialization of semantic tokenizers.
 * Useful when you want to ensure semantic tokenization is used.
 */
export async function tokenizeAsync(text: string, locale: string): Promise<Token[]> {
  await loadSemantic();
  return tokenize(text, locale);
}

/**
 * Basic tokenization fallback for unsupported languages.
 * This is a simplified version that handles common patterns.
 */
function tokenizeBasic(text: string, locale: string): Token[] {
  const tokens: Token[] = [];
  let position = 0;
  let line = 1;
  let column = 1;

  while (position < text.length) {
    const start = position;
    const startLine = line;
    const startColumn = column;

    // Skip whitespace but track it
    if (isWhitespace(text[position])) {
      const whitespace = consumeWhitespace(text, position);
      tokens.push({
        type: 'literal',
        value: whitespace,
        position: {
          start,
          end: position + whitespace.length,
          line: startLine,
          column: startColumn,
        },
      });

      // Update position tracking
      for (let i = 0; i < whitespace.length; i++) {
        if (whitespace[i] === '\n') {
          line++;
          column = 1;
        } else {
          column++;
        }
      }
      position += whitespace.length;
      continue;
    }

    // String literals
    if (text[position] === '"' || text[position] === "'") {
      const quote = text[position];
      let value = quote;
      position++;
      column++;

      while (position < text.length && text[position] !== quote) {
        if (text[position] === '\\' && position + 1 < text.length) {
          value += text[position] + text[position + 1];
          position += 2;
          column += 2;
        } else {
          value += text[position];
          if (text[position] === '\n') {
            line++;
            column = 1;
          } else {
            column++;
          }
          position++;
        }
      }

      if (position < text.length) {
        value += text[position];
        position++;
        column++;
      }

      tokens.push({
        type: 'literal',
        value,
        position: {
          start,
          end: position,
          line: startLine,
          column: startColumn,
        },
      });
      continue;
    }

    // Numbers
    if (isDigit(text[position])) {
      const number = consumeNumber(text, position);
      tokens.push({
        type: 'literal',
        value: number,
        position: {
          start,
          end: position + number.length,
          line: startLine,
          column: startColumn,
        },
      });
      position += number.length;
      column += number.length;
      continue;
    }

    // Identifiers and keywords
    if (isIdentifierStart(text[position])) {
      const word = consumeIdentifier(text, position);
      const tokenType = categorizeWord(word, locale);

      tokens.push({
        type: tokenType,
        value: word,
        position: {
          start,
          end: position + word.length,
          line: startLine,
          column: startColumn,
        },
      });
      position += word.length;
      column += word.length;
      continue;
    }

    // Operators and punctuation
    const operator = consumeOperator(text, position);
    tokens.push({
      type: 'operator',
      value: operator,
      position: {
        start,
        end: position + operator.length,
        line: startLine,
        column: startColumn,
      },
    });
    position += operator.length;
    column += operator.length;
  }

  return tokens;
}

// =============================================================================
// Helper Functions
// =============================================================================

function isWhitespace(char: string): boolean {
  return /\s/.test(char);
}

function isDigit(char: string): boolean {
  return /\d/.test(char);
}

function isIdentifierStart(char: string): boolean {
  return /[a-zA-Z_$áéíóúñÑàèìòùÀÈÌÒÙ一-龯ㄱ-ㅎㅏ-ㅣ가-힣]/.test(char);
}

function isIdentifierPart(char: string): boolean {
  return /[a-zA-Z0-9_$áéíóúñÑàèìòùÀÈÌÒÙ一-龯ㄱ-ㅎㅏ-ㅣ가-힣-]/.test(char);
}

function consumeWhitespace(text: string, start: number): string {
  let end = start;
  while (end < text.length && isWhitespace(text[end])) {
    end++;
  }
  return text.substring(start, end);
}

function consumeNumber(text: string, start: number): string {
  let end = start;
  while (end < text.length && (isDigit(text[end]) || text[end] === '.')) {
    end++;
  }
  return text.substring(start, end);
}

function consumeIdentifier(text: string, start: number): string {
  let end = start;
  while (end < text.length && isIdentifierPart(text[end])) {
    end++;
  }
  return text.substring(start, end);
}

function consumeOperator(text: string, start: number): string {
  // Try to match multi-character operators first
  const twoChar = text.substring(start, start + 2);
  if (['==', '!=', '<=', '>=', '&&', '||', '..'].includes(twoChar)) {
    return twoChar;
  }

  // Single character operators
  return text[start];
}
