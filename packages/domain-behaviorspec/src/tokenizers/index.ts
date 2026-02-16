/**
 * BehaviorSpec Tokenizers
 *
 * Language-specific tokenizers for interaction testing input. Each tokenizer
 * extends the framework's BaseTokenizer and includes custom extractors for
 * CSS selectors, URLs, durations, and viewport dimensions.
 *
 * 8 languages: EN, ES, JA, AR, KO, ZH, FR, TR
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
    if (!/\d/.test(input[position])) return false;
    // Must be preceded by whitespace or start of input to avoid matching inside identifiers
    return position === 0 || /\s/.test(input[position - 1]);
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
    if (!/\d/.test(input[position])) return false;
    // Must be preceded by whitespace or start of input
    return position === 0 || /\s/.test(input[position - 1]);
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

/** Standard classifyToken logic shared by Latin-script tokenizers */
function classifyLatinToken(token: string, keywords: Set<string>): TokenKind {
  if (keywords.has(token.toLowerCase())) return 'keyword';
  if (token.startsWith('#') || token.startsWith('.')) return 'selector';
  if (/^\d/.test(token)) return 'literal';
  if (/^['"]/.test(token)) return 'literal';
  if (token.startsWith('/')) return 'literal';
  return 'identifier';
}

/** Standard classifyToken logic shared by non-Latin-script tokenizers */
function classifyNonLatinToken(
  token: string,
  keywords: Set<string>,
  isKeywordFn: (t: string) => boolean
): TokenKind {
  if (keywords.has(token)) return 'keyword';
  if (isKeywordFn(token)) return 'keyword';
  if (token.startsWith('#') || token.startsWith('.')) return 'selector';
  if (/^\d/.test(token)) return 'literal';
  if (/^['"]/.test(token)) return 'literal';
  if (token.startsWith('/')) return 'literal';
  return 'identifier';
}

// =============================================================================
// English BehaviorSpec Tokenizer
// =============================================================================

const EN_KEYWORDS = new Set([
  'test',
  'given',
  'when',
  'expect',
  'after',
  'not',
  'on',
  'into',
  'with',
  'saying',
  'by',
  'to',
  'class',
  'feature',
  'setup',
]);

export class EnglishBehaviorSpecTokenizer extends BaseTokenizer {
  readonly language = 'en';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    this.registerExtractors(getBehaviorSpecExtractors());
  }

  classifyToken(token: string): TokenKind {
    return classifyLatinToken(token, EN_KEYWORDS);
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
  'dentro',
  'funcionalidad',
  'preparacion',
]);

export class SpanishBehaviorSpecTokenizer extends BaseTokenizer {
  readonly language = 'es';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    this.registerExtractors(getBehaviorSpecExtractors());
  }

  classifyToken(token: string): TokenKind {
    return classifyLatinToken(token, ES_KEYWORDS);
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
  '機能',
  '準備',
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
    return classifyNonLatinToken(token, JA_KEYWORDS, t => this.isKeyword(t));
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
  'ميزة',
  'إعداد',
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
    return classifyNonLatinToken(token, AR_KEYWORDS, t => this.isKeyword(t));
  }
}

// =============================================================================
// Korean BehaviorSpec Tokenizer (SOV)
// =============================================================================

const KO_KEYWORDS = new Set([
  '테스트',
  '전제',
  '동작',
  '기대',
  '후',
  '아님',
  '을',
  '에',
  '으로',
  '의',
  '기능',
  '설정',
]);

const KO_KEYWORD_EXTRAS: KeywordEntry[] = [
  { native: '테스트', normalized: 'test' },
  { native: '전제', normalized: 'given' },
  { native: '동작', normalized: 'when' },
  { native: '기대', normalized: 'expect' },
  { native: '후', normalized: 'after' },
  { native: '아님', normalized: 'not' },
  { native: '을', normalized: 'on' },
  { native: '에', normalized: 'into' },
  { native: '으로', normalized: 'saying' },
];

export class KoreanBehaviorSpecTokenizer extends BaseTokenizer {
  readonly language = 'ko';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    this.registerExtractors(getBehaviorSpecExtractors());
    this.initializeKeywordsFromProfile(
      {
        keywords: {
          test: { primary: '테스트' },
          given: { primary: '전제' },
          when: { primary: '동작' },
          expect: { primary: '기대' },
          after: { primary: '후' },
          not: { primary: '아님' },
        },
      },
      KO_KEYWORD_EXTRAS
    );
  }

  classifyToken(token: string): TokenKind {
    return classifyNonLatinToken(token, KO_KEYWORDS, t => this.isKeyword(t));
  }
}

// =============================================================================
// Chinese BehaviorSpec Tokenizer (SVO)
// =============================================================================

const ZH_KEYWORDS = new Set([
  '测试',
  '假设',
  '当',
  '期望',
  '之后',
  '不',
  '在',
  '到',
  '显示',
  '功能',
  '设置',
]);

const ZH_KEYWORD_EXTRAS: KeywordEntry[] = [
  { native: '测试', normalized: 'test' },
  { native: '假设', normalized: 'given' },
  { native: '当', normalized: 'when' },
  { native: '期望', normalized: 'expect' },
  { native: '之后', normalized: 'after' },
  { native: '不', normalized: 'not' },
  { native: '在', normalized: 'on' },
  { native: '到', normalized: 'into' },
  { native: '显示', normalized: 'saying' },
];

export class ChineseBehaviorSpecTokenizer extends BaseTokenizer {
  readonly language = 'zh';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    this.registerExtractors(getBehaviorSpecExtractors());
    this.initializeKeywordsFromProfile(
      {
        keywords: {
          test: { primary: '测试' },
          given: { primary: '假设' },
          when: { primary: '当' },
          expect: { primary: '期望' },
          after: { primary: '之后' },
          not: { primary: '不' },
        },
      },
      ZH_KEYWORD_EXTRAS
    );
  }

  classifyToken(token: string): TokenKind {
    return classifyNonLatinToken(token, ZH_KEYWORDS, t => this.isKeyword(t));
  }
}

// =============================================================================
// French BehaviorSpec Tokenizer (SVO)
// =============================================================================

const FR_KEYWORDS = new Set([
  'test',
  'soit',
  'quand',
  'attendre',
  'apres',
  'pas',
  'sur',
  'dans',
  'disant',
  'avec',
  'fonctionnalite',
  'preparation',
]);

export class FrenchBehaviorSpecTokenizer extends BaseTokenizer {
  readonly language = 'fr';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    this.registerExtractors(getBehaviorSpecExtractors());
  }

  classifyToken(token: string): TokenKind {
    return classifyLatinToken(token, FR_KEYWORDS);
  }
}

// =============================================================================
// Turkish BehaviorSpec Tokenizer (SOV)
// =============================================================================

const TR_KEYWORDS = new Set([
  'test',
  'verilen',
  'eylem',
  'bekle',
  'sonra',
  'degil',
  'üzerinde',
  'içine',
  'diyen',
  'ile',
  'ozellik',
  'hazirlik',
]);

export class TurkishBehaviorSpecTokenizer extends BaseTokenizer {
  readonly language = 'tr';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    this.registerExtractors(getBehaviorSpecExtractors());
  }

  classifyToken(token: string): TokenKind {
    return classifyLatinToken(token, TR_KEYWORDS);
  }
}
