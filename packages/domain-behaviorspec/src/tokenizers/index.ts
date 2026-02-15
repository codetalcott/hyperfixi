/**
 * BehaviorSpec Tokenizers
 *
 * Language-specific tokenizers for interaction testing input. Each tokenizer
 * extends the framework's BaseTokenizer and includes custom extractors for
 * CSS selectors, URLs, durations, and viewport dimensions.
 */

import { BaseTokenizer, getDefaultExtractors } from '@lokascript/framework';
import type {
  TokenKind,
  KeywordEntry,
  ValueExtractor,
  ExtractionResult,
} from '@lokascript/framework';

// =============================================================================
// Custom Extractors
// =============================================================================

/**
 * Extracts CSS selectors (#id, .class) from input.
 */
class CSSSelectorExtractor implements ValueExtractor {
  readonly name = 'css-selector';

  canExtract(input: string, position: number): boolean {
    const char = input[position];
    if (char !== '#' && char !== '.') return false;
    const next = input[position + 1];
    return next !== undefined && /[a-zA-Z_-]/.test(next);
  }

  extract(input: string, position: number): ExtractionResult | null {
    let end = position + 1;
    while (end < input.length && /[a-zA-Z0-9_-]/.test(input[end])) {
      end++;
    }
    if (end === position + 1) return null;
    return { value: input.slice(position, end), length: end - position };
  }
}

/**
 * Extracts URL paths (/path/to/page) from input.
 */
class URLExtractor implements ValueExtractor {
  readonly name = 'url';

  canExtract(input: string, position: number): boolean {
    if (input[position] !== '/') return false;
    // Must be preceded by whitespace or start of input
    if (position > 0 && !/\s/.test(input[position - 1])) return false;
    // Must be followed by a word character
    const next = input[position + 1];
    return next !== undefined && /[a-zA-Z0-9_.-]/.test(next);
  }

  extract(input: string, position: number): ExtractionResult | null {
    let end = position;
    while (end < input.length && !/\s/.test(input[end])) {
      end++;
    }
    return end > position ? { value: input.slice(position, end), length: end - position } : null;
  }
}

/**
 * Extracts duration values (300ms, 2s, 2 seconds, 500 milliseconds).
 */
class DurationExtractor implements ValueExtractor {
  readonly name = 'duration';

  canExtract(input: string, position: number): boolean {
    return /\d/.test(input[position]);
  }

  extract(input: string, position: number): ExtractionResult | null {
    const match = input.slice(position).match(/^(\d+)\s*(ms|s|seconds?|milliseconds?)/);
    if (match) return { value: match[0], length: match[0].length };
    return null;
  }
}

/**
 * Extracts viewport dimensions (375x812).
 */
class DimensionExtractor implements ValueExtractor {
  readonly name = 'dimension';

  canExtract(input: string, position: number): boolean {
    return /\d/.test(input[position]);
  }

  extract(input: string, position: number): ExtractionResult | null {
    const match = input.slice(position).match(/^(\d+)x(\d+)/);
    if (match) return { value: match[0], length: match[0].length };
    return null;
  }
}

/**
 * Get BehaviorSpec-specific extractors.
 * Order matters: CSS selectors and URLs must come before default extractors
 * so that #button, .active, and /products/1 are captured as single tokens.
 * Duration and dimension extractors also come before defaults for numeric patterns.
 */
function getBehaviorSpecExtractors(): ValueExtractor[] {
  return [
    new CSSSelectorExtractor(),
    new URLExtractor(),
    new DurationExtractor(),
    new DimensionExtractor(),
    ...getDefaultExtractors(),
  ];
}

// =============================================================================
// English BehaviorSpec Tokenizer
// =============================================================================

const EN_KEYWORDS = new Set([
  // Command keywords
  'test',
  'given',
  'when',
  'expect',
  'after',
  'not',
  // Markers (appear as literals in generated patterns)
  'on',
  'into',
  'with',
  'saying',
  'by',
  'to',
  'class',
  // Note: 'user', 'page', 'viewport' are intentionally NOT keywords.
  // They are role values that must be identifiers (type='expression')
  // to match expectedTypes: ['expression'] in the schema.
]);

export class EnglishBehaviorSpecTokenizer extends BaseTokenizer {
  readonly language = 'en';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    this.registerExtractors(getBehaviorSpecExtractors());
  }

  classifyToken(token: string): TokenKind {
    if (EN_KEYWORDS.has(token.toLowerCase())) return 'keyword';
    if (token.startsWith('#') || token.startsWith('.')) return 'selector';
    if (/^\d/.test(token)) return 'literal';
    if (/^['"]/.test(token)) return 'literal';
    if (token.startsWith('/')) return 'literal';
    return 'identifier';
  }
}

// =============================================================================
// Spanish BehaviorSpec Tokenizer
// =============================================================================

const ES_KEYWORDS = new Set([
  'prueba',
  'dado',
  'cuando',
  'esperar',
  'despues',
  'no',
  'en',
  'con',
  'diciendo',
  'por',
  'a',
  'clase',
]);

export class SpanishBehaviorSpecTokenizer extends BaseTokenizer {
  readonly language = 'es';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    this.registerExtractors(getBehaviorSpecExtractors());
  }

  classifyToken(token: string): TokenKind {
    if (ES_KEYWORDS.has(token.toLowerCase())) return 'keyword';
    if (token.startsWith('#') || token.startsWith('.')) return 'selector';
    if (/^\d/.test(token)) return 'literal';
    if (/^['"]/.test(token)) return 'literal';
    if (token.startsWith('/')) return 'literal';
    return 'identifier';
  }
}

// =============================================================================
// Japanese BehaviorSpec Tokenizer (SOV)
// =============================================================================

const JA_KEYWORDS = new Set([
  'テスト',
  '前提',
  '操作',
  '期待',
  '後',
  '否定',
  'を',
  'に',
  'で',
  'と',
  'が',
  'の',
]);

const JA_KEYWORD_EXTRAS: KeywordEntry[] = [
  { native: 'テスト', normalized: 'test' },
  { native: '前提', normalized: 'given' },
  { native: '操作', normalized: 'when' },
  { native: '期待', normalized: 'expect' },
  { native: '後', normalized: 'after' },
  { native: '否定', normalized: 'not' },
  { native: 'を', normalized: 'on' },
  { native: 'に', normalized: 'into' },
  { native: 'で', normalized: 'with' },
  { native: 'と', normalized: 'saying' },
];

export class JapaneseBehaviorSpecTokenizer extends BaseTokenizer {
  readonly language = 'ja';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    this.registerExtractors(getBehaviorSpecExtractors());
    this.initializeKeywordsFromProfile(
      {
        keywords: {
          test: { primary: 'テスト' },
          given: { primary: '前提' },
          when: { primary: '操作' },
          expect: { primary: '期待' },
          after: { primary: '後' },
          not: { primary: '否定' },
        },
      },
      JA_KEYWORD_EXTRAS
    );
  }

  classifyToken(token: string): TokenKind {
    if (JA_KEYWORDS.has(token)) return 'keyword';
    if (this.isKeyword(token)) return 'keyword';
    if (token.startsWith('#') || token.startsWith('.')) return 'selector';
    if (/^\d/.test(token)) return 'literal';
    if (/^['"]/.test(token)) return 'literal';
    if (token.startsWith('/')) return 'literal';
    return 'identifier';
  }
}

// =============================================================================
// Arabic BehaviorSpec Tokenizer (VSO)
// =============================================================================

const AR_KEYWORDS = new Set([
  'اختبار',
  'بافتراض',
  'عندما',
  'توقع',
  'بعد',
  'ليس',
  'على',
  'في',
  'ب',
  'يقول',
  'من',
]);

const AR_KEYWORD_EXTRAS: KeywordEntry[] = [
  { native: 'اختبار', normalized: 'test' },
  { native: 'بافتراض', normalized: 'given' },
  { native: 'عندما', normalized: 'when' },
  { native: 'توقع', normalized: 'expect' },
  { native: 'بعد', normalized: 'after' },
  { native: 'ليس', normalized: 'not' },
  { native: 'على', normalized: 'on' },
  { native: 'في', normalized: 'into' },
  { native: 'ب', normalized: 'with' },
  { native: 'يقول', normalized: 'saying' },
];

export class ArabicBehaviorSpecTokenizer extends BaseTokenizer {
  readonly language = 'ar';
  readonly direction = 'rtl' as const;

  constructor() {
    super();
    this.registerExtractors(getBehaviorSpecExtractors());
    this.initializeKeywordsFromProfile(
      {
        keywords: {
          test: { primary: 'اختبار' },
          given: { primary: 'بافتراض' },
          when: { primary: 'عندما' },
          expect: { primary: 'توقع' },
          after: { primary: 'بعد' },
          not: { primary: 'ليس' },
        },
      },
      AR_KEYWORD_EXTRAS
    );
  }

  classifyToken(token: string): TokenKind {
    if (AR_KEYWORDS.has(token)) return 'keyword';
    if (this.isKeyword(token)) return 'keyword';
    if (token.startsWith('#') || token.startsWith('.')) return 'selector';
    if (/^\d/.test(token)) return 'literal';
    if (/^['"]/.test(token)) return 'literal';
    if (token.startsWith('/')) return 'literal';
    return 'identifier';
  }
}
