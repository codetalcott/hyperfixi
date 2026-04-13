/**
 * BDD Tokenizers
 *
 * Language-specific tokenizers for BDD specification input. Each tokenizer
 * extends the framework's BaseTokenizer and uses the default generic extractors
 * plus a CSS selector extractor for DOM element references (#id, .class).
 */

import {
  BaseTokenizer,
  getDefaultExtractors,
  LatinExtendedIdentifierExtractor,
} from '@lokascript/framework';
import type {
  TokenKind,
  KeywordEntry,
  ValueExtractor,
  ExtractionResult,
} from '@lokascript/framework';

/**
 * Get extractors for languages with extended Latin characters (Turkish, French).
 * The LatinExtendedIdentifierExtractor replaces both the default
 * IdentifierExtractor and UnicodeIdentifierExtractor.
 */
function getExtendedLatinBDDExtractors(): ValueExtractor[] {
  const defaults = getDefaultExtractors();
  // Remove the default IdentifierExtractor and UnicodeIdentifierExtractor
  // and add our combined one instead
  const filtered = defaults.filter(e => e.name !== 'identifier' && e.name !== 'unicode-identifier');
  return [new CSSSelectorExtractor(), new LatinExtendedIdentifierExtractor(), ...filtered];
}

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

// =============================================================================
// Korean BDD Tokenizer (SOV)
// =============================================================================

const KO_KEYWORDS = new Set([
  '전제',
  '만약',
  '그러면',
  '그리고',
  '이',
  '가',
  '을',
  '를',
  '에',
  '의',
  '로',
]);

const KO_KEYWORD_EXTRAS: KeywordEntry[] = [
  { native: '전제', normalized: 'given' },
  { native: '만약', normalized: 'when' },
  { native: '그러면', normalized: 'then' },
  { native: '그리고', normalized: 'and' },
  { native: '이', normalized: 'is' },
  { native: '가', normalized: 'is' },
  { native: '을', normalized: 'on' },
  { native: '를', normalized: 'on' },
  { native: '에', normalized: 'has' },
  { native: '로', normalized: 'with' },
];

export class KoreanBDDTokenizer extends BaseTokenizer {
  readonly language = 'ko';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    this.registerExtractors(getBDDExtractors());
    this.initializeKeywordsFromProfile(
      {
        keywords: {
          given: { primary: '전제' },
          when: { primary: '만약' },
          then: { primary: '그러면' },
          and: { primary: '그리고' },
        },
      },
      KO_KEYWORD_EXTRAS
    );
  }

  classifyToken(token: string): TokenKind {
    if (KO_KEYWORDS.has(token)) return 'keyword';
    if (this.isKeyword(token)) return 'keyword';
    if (token.startsWith('#') || token.startsWith('.')) return 'selector';
    if (/^\d/.test(token)) return 'literal';
    if (/^['"]/.test(token)) return 'literal';
    return 'identifier';
  }
}

// =============================================================================
// Chinese BDD Tokenizer (SVO)
// =============================================================================

const ZH_KEYWORDS = new Set(['假设', '当', '那么', '并且', '是', '有', '在', '用']);

const ZH_KEYWORD_EXTRAS: KeywordEntry[] = [
  { native: '假设', normalized: 'given' },
  { native: '当', normalized: 'when' },
  { native: '那么', normalized: 'then' },
  { native: '并且', normalized: 'and' },
  { native: '是', normalized: 'is' },
  { native: '有', normalized: 'has' },
  { native: '在', normalized: 'on' },
  { native: '用', normalized: 'with' },
];

export class ChineseBDDTokenizer extends BaseTokenizer {
  readonly language = 'zh';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    this.registerExtractors(getBDDExtractors());
    this.initializeKeywordsFromProfile(
      {
        keywords: {
          given: { primary: '假设' },
          when: { primary: '当' },
          then: { primary: '那么' },
          and: { primary: '并且' },
        },
      },
      ZH_KEYWORD_EXTRAS
    );
  }

  classifyToken(token: string): TokenKind {
    if (ZH_KEYWORDS.has(token)) return 'keyword';
    if (this.isKeyword(token)) return 'keyword';
    if (token.startsWith('#') || token.startsWith('.')) return 'selector';
    if (/^\d/.test(token)) return 'literal';
    if (/^['"]/.test(token)) return 'literal';
    return 'identifier';
  }
}

// =============================================================================
// Turkish BDD Tokenizer (SOV)
// =============================================================================

const TR_KEYWORDS = new Set([
  'varsayalım',
  'olduğunda',
  'sonra',
  've',
  'dir',
  'sahip',
  'üzerinde',
  'ile',
  'de',
]);

const TR_KEYWORD_EXTRAS: KeywordEntry[] = [
  { native: 'varsayalım', normalized: 'given' },
  { native: 'olduğunda', normalized: 'when' },
  { native: 'sonra', normalized: 'then' },
  { native: 've', normalized: 'and' },
  { native: 'dir', normalized: 'is' },
  { native: 'sahip', normalized: 'has' },
  { native: 'üzerinde', normalized: 'on' },
  { native: 'ile', normalized: 'with' },
  { native: 'de', normalized: 'at' },
];

export class TurkishBDDTokenizer extends BaseTokenizer {
  readonly language = 'tr';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    this.registerExtractors(getExtendedLatinBDDExtractors());
    this.initializeKeywordsFromProfile(
      {
        keywords: {
          given: { primary: 'varsayalım' },
          when: { primary: 'olduğunda' },
          then: { primary: 'sonra' },
          and: { primary: 've' },
        },
      },
      TR_KEYWORD_EXTRAS
    );
  }

  classifyToken(token: string): TokenKind {
    if (TR_KEYWORDS.has(token.toLowerCase())) return 'keyword';
    if (this.isKeyword(token)) return 'keyword';
    if (token.startsWith('#') || token.startsWith('.')) return 'selector';
    if (/^\d/.test(token)) return 'literal';
    if (/^['"]/.test(token)) return 'literal';
    return 'identifier';
  }
}

// =============================================================================
// French BDD Tokenizer (SVO)
// =============================================================================

const FR_KEYWORDS = new Set(['soit', 'quand', 'alors', 'et', 'est', 'a', 'sur', 'avec']);

const FR_KEYWORD_EXTRAS: KeywordEntry[] = [
  { native: 'soit', normalized: 'given' },
  { native: 'quand', normalized: 'when' },
  { native: 'alors', normalized: 'then' },
  { native: 'et', normalized: 'and' },
  { native: 'est', normalized: 'is' },
  { native: 'a', normalized: 'has' },
  { native: 'sur', normalized: 'on' },
  { native: 'avec', normalized: 'with' },
];

export class FrenchBDDTokenizer extends BaseTokenizer {
  readonly language = 'fr';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    this.registerExtractors(getExtendedLatinBDDExtractors());
    this.initializeKeywordsFromProfile(
      {
        keywords: {
          given: { primary: 'soit' },
          when: { primary: 'quand' },
          then: { primary: 'alors' },
          and: { primary: 'et' },
        },
      },
      FR_KEYWORD_EXTRAS
    );
  }

  classifyToken(token: string): TokenKind {
    if (FR_KEYWORDS.has(token.toLowerCase())) return 'keyword';
    if (this.isKeyword(token)) return 'keyword';
    if (token.startsWith('#') || token.startsWith('.')) return 'selector';
    if (/^\d/.test(token)) return 'literal';
    if (/^['"]/.test(token)) return 'literal';
    return 'identifier';
  }
}
