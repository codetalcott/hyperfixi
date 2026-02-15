/**
 * BDD Tokenizers
 *
 * Language-specific tokenizers for BDD specification input. Each tokenizer
 * extends the framework's BaseTokenizer and uses the default generic extractors
 * plus a CSS selector extractor for DOM element references (#id, .class).
 */

import { BaseTokenizer, getDefaultExtractors } from '@lokascript/framework';
import type {
  TokenKind,
  KeywordEntry,
  ValueExtractor,
  ExtractionResult,
} from '@lokascript/framework';

// =============================================================================
// CSS Selector Extractor
// =============================================================================

/**
 * Extracts CSS selectors (#id, .class) from input.
 * BDD specs reference DOM elements by selector.
 */
class CSSSelectorExtractor implements ValueExtractor {
  readonly name = 'css-selector';

  canExtract(input: string, position: number): boolean {
    const char = input[position];
    if (char !== '#' && char !== '.') return false;
    // Must be followed by a letter or hyphen (not just punctuation)
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
 * Get BDD-specific extractors: default + CSS selectors.
 * CSS selector extractor must come before the default identifier extractor
 * so that #button and .active are captured as single tokens.
 */
function getBDDExtractors(): ValueExtractor[] {
  return [new CSSSelectorExtractor(), ...getDefaultExtractors()];
}

// =============================================================================
// English BDD Tokenizer
// =============================================================================

/** Only step keywords and markers — role values (states, actions) must be
 *  identifiers so the pattern matcher converts them to 'expression' type. */
const EN_KEYWORDS = new Set([
  // Step keywords
  'given',
  'when',
  'then',
  'and',
  // Markers (appear as literals in generated patterns)
  'is',
  'has',
  'on',
  'with',
  'the',
  'that',
]);

export class EnglishBDDTokenizer extends BaseTokenizer {
  readonly language = 'en';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    this.registerExtractors(getBDDExtractors());
  }

  classifyToken(token: string): TokenKind {
    if (EN_KEYWORDS.has(token.toLowerCase())) return 'keyword';
    if (token.startsWith('#') || token.startsWith('.')) return 'selector';
    if (/^\d/.test(token)) return 'literal';
    if (/^['"]/.test(token)) return 'literal';
    return 'identifier';
  }
}

// =============================================================================
// Spanish BDD Tokenizer
// =============================================================================

const ES_KEYWORDS = new Set([
  // Step keywords
  'dado',
  'cuando',
  'entonces',
  'y',
  // Markers
  'es',
  'tiene',
  'en',
  'con',
  'el',
  'la',
  'que',
]);

export class SpanishBDDTokenizer extends BaseTokenizer {
  readonly language = 'es';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    this.registerExtractors(getBDDExtractors());
  }

  classifyToken(token: string): TokenKind {
    if (ES_KEYWORDS.has(token.toLowerCase())) return 'keyword';
    if (token.startsWith('#') || token.startsWith('.')) return 'selector';
    if (/^\d/.test(token)) return 'literal';
    if (/^['"]/.test(token)) return 'literal';
    return 'identifier';
  }
}

// =============================================================================
// Japanese BDD Tokenizer
// =============================================================================

const JA_KEYWORDS = new Set([
  // Step keywords
  '前提',
  'したら',
  'ならば',
  'かつ',
  // Markers (particles used in patterns)
  'が',
  'を',
  'に',
  'で',
  'の',
]);

const JA_KEYWORD_EXTRAS: KeywordEntry[] = [
  { native: '前提', normalized: 'given' },
  { native: 'したら', normalized: 'when' },
  { native: 'ならば', normalized: 'then' },
  { native: 'かつ', normalized: 'and' },
  { native: 'が', normalized: 'is' },
  { native: 'を', normalized: 'on' },
  { native: 'に', normalized: 'has' },
  { native: 'で', normalized: 'with' },
];

export class JapaneseBDDTokenizer extends BaseTokenizer {
  readonly language = 'ja';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    this.registerExtractors(getBDDExtractors());
    this.initializeKeywordsFromProfile(
      {
        keywords: {
          given: { primary: '前提' },
          when: { primary: 'したら' },
          then: { primary: 'ならば' },
          and: { primary: 'かつ' },
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
    return 'identifier';
  }
}

// =============================================================================
// Arabic BDD Tokenizer
// =============================================================================

const AR_KEYWORDS = new Set([
  // Step keywords
  'بافتراض',
  'عند',
  'فإن',
  'و',
  // Markers
  'هو',
  'يحتوي',
  'على',
  'ب',
  'أن',
]);

const AR_KEYWORD_EXTRAS: KeywordEntry[] = [
  { native: 'بافتراض', normalized: 'given' },
  { native: 'عند', normalized: 'when' },
  { native: 'فإن', normalized: 'then' },
  { native: 'و', normalized: 'and' },
  { native: 'هو', normalized: 'is' },
  { native: 'يحتوي', normalized: 'has' },
  { native: 'على', normalized: 'on' },
  { native: 'ب', normalized: 'with' },
];

export class ArabicBDDTokenizer extends BaseTokenizer {
  readonly language = 'ar';
  readonly direction = 'rtl' as const;

  constructor() {
    super();
    this.registerExtractors(getBDDExtractors());
    this.initializeKeywordsFromProfile(
      {
        keywords: {
          given: { primary: 'بافتراض' },
          when: { primary: 'عند' },
          then: { primary: 'فإن' },
          and: { primary: 'و' },
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
    return 'identifier';
  }
}
