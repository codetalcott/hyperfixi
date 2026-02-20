/**
 * FlowScript Tokenizers
 *
 * Language-specific tokenizers for data flow commands (4 languages).
 * Created via the framework's createSimpleTokenizer factory.
 *
 * Custom extractors handle:
 * - CSS selectors (#id, .class)
 * - URL paths (/api/users, /api/user/{id})
 * - Duration literals (5s, 30s, 1m, 500ms)
 * - Latin extended identifiers (diacritics in Spanish)
 */

import { createSimpleTokenizer } from '@lokascript/framework';
import type { LanguageTokenizer, ValueExtractor, ExtractionResult } from '@lokascript/framework';

// =============================================================================
// CSS Selector Extractor (#id, .class)
// =============================================================================

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

// =============================================================================
// URL Path Extractor (/api/users, /api/user/{id})
// =============================================================================

class URLPathExtractor implements ValueExtractor {
  readonly name = 'url-path';

  canExtract(input: string, position: number): boolean {
    if (input[position] !== '/') return false;
    const next = input[position + 1];
    // Must be followed by a letter, digit, or path char — not a space or operator
    return next !== undefined && /[a-zA-Z0-9_:{]/.test(next);
  }

  extract(input: string, position: number): ExtractionResult | null {
    let end = position + 1;
    // URL path characters: letters, digits, /, -, _, ., {, }, :, ?, =, &
    while (end < input.length && /[a-zA-Z0-9/_\-.{}:?=&]/.test(input[end])) {
      end++;
    }
    if (end <= position + 1) return null;
    return { value: input.slice(position, end), length: end - position };
  }
}

// =============================================================================
// Duration Extractor (5s, 30s, 1m, 500ms)
// =============================================================================

class DurationExtractor implements ValueExtractor {
  readonly name = 'duration';

  canExtract(input: string, position: number): boolean {
    return /[0-9]/.test(input[position]);
  }

  extract(input: string, position: number): ExtractionResult | null {
    let end = position;
    // Consume digits
    while (end < input.length && /[0-9]/.test(input[end])) {
      end++;
    }
    if (end === position) return null;

    // Check for duration suffix: ms, s, m, h
    const remaining = input.slice(end);
    if (remaining.startsWith('ms')) {
      end += 2;
    } else if (/^[smh](?![a-zA-Z])/.test(remaining)) {
      end += 1;
    } else {
      // Plain number — still valid as a literal
      return { value: input.slice(position, end), length: end - position };
    }

    return { value: input.slice(position, end), length: end - position };
  }
}

// =============================================================================
// Latin Extended Identifier Extractor (diacritics for Spanish)
// =============================================================================

class LatinExtendedIdentifierExtractor implements ValueExtractor {
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

// =============================================================================
// Shared custom extractors
// =============================================================================

const sharedExtractors = [
  new CSSSelectorExtractor(),
  new URLPathExtractor(),
  new DurationExtractor(),
];

// =============================================================================
// English FlowScript Tokenizer
// =============================================================================

export const EnglishFlowTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'en',
  customExtractors: sharedExtractors,
  keywords: [
    // Commands
    'fetch',
    'poll',
    'stream',
    'submit',
    'transform',
    // Role markers
    'as',
    'into',
    'every',
    'to',
    'with',
    'from',
  ],
  includeOperators: false,
  caseInsensitive: true,
});

// =============================================================================
// Spanish FlowScript Tokenizer
// =============================================================================

export const SpanishFlowTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'es',
  customExtractors: [...sharedExtractors, new LatinExtendedIdentifierExtractor()],
  keywords: [
    // Commands
    'obtener',
    'sondear',
    'transmitir',
    'enviar',
    'transformar',
    // Role markers
    'como',
    'en',
    'cada',
    'a',
    'con',
    'de',
  ],
  keywordExtras: [
    { native: 'obtener', normalized: 'fetch' },
    { native: 'sondear', normalized: 'poll' },
    { native: 'transmitir', normalized: 'stream' },
    { native: 'enviar', normalized: 'submit' },
    { native: 'transformar', normalized: 'transform' },
    { native: 'como', normalized: 'as' },
    { native: 'en', normalized: 'into' },
    { native: 'cada', normalized: 'every' },
    { native: 'a', normalized: 'to' },
    { native: 'con', normalized: 'with' },
  ],
  keywordProfile: {
    keywords: {
      fetch: { primary: 'obtener' },
      poll: { primary: 'sondear' },
      stream: { primary: 'transmitir' },
      submit: { primary: 'enviar' },
      transform: { primary: 'transformar' },
    },
  },
  includeOperators: false,
  caseInsensitive: true,
});

// =============================================================================
// Japanese FlowScript Tokenizer
// =============================================================================

export const JapaneseFlowTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'ja',
  customExtractors: sharedExtractors,
  keywords: [
    // Commands
    '取得',
    'ポーリング',
    'ストリーム',
    '送信',
    '変換',
    // Role markers / particles
    'で',
    'に',
    'ごとに',
    'を',
    'から',
  ],
  keywordExtras: [
    { native: '取得', normalized: 'fetch' },
    { native: 'ポーリング', normalized: 'poll' },
    { native: 'ストリーム', normalized: 'stream' },
    { native: '送信', normalized: 'submit' },
    { native: '変換', normalized: 'transform' },
    { native: 'で', normalized: 'as' },
    { native: 'に', normalized: 'into' },
    { native: 'ごとに', normalized: 'every' },
    { native: 'を', normalized: 'patient' },
  ],
  keywordProfile: {
    keywords: {
      fetch: { primary: '取得' },
      poll: { primary: 'ポーリング' },
      stream: { primary: 'ストリーム' },
      submit: { primary: '送信' },
      transform: { primary: '変換' },
    },
  },
  includeOperators: false,
  caseInsensitive: false,
});

// =============================================================================
// Arabic FlowScript Tokenizer
// =============================================================================

export const ArabicFlowTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'ar',
  direction: 'rtl',
  customExtractors: sharedExtractors,
  keywords: [
    // Commands
    'جلب',
    'استطلع',
    'بث',
    'أرسل',
    'حوّل',
    // Role markers
    'ك',
    'في',
    'كل',
    'إلى',
    'ب',
    'من',
  ],
  keywordExtras: [
    { native: 'جلب', normalized: 'fetch' },
    { native: 'استطلع', normalized: 'poll' },
    { native: 'بث', normalized: 'stream' },
    { native: 'أرسل', normalized: 'submit' },
    { native: 'حوّل', normalized: 'transform' },
    { native: 'ك', normalized: 'as' },
    { native: 'في', normalized: 'into' },
    { native: 'كل', normalized: 'every' },
    { native: 'إلى', normalized: 'to' },
    { native: 'ب', normalized: 'with' },
  ],
  keywordProfile: {
    keywords: {
      fetch: { primary: 'جلب' },
      poll: { primary: 'استطلع' },
      stream: { primary: 'بث' },
      submit: { primary: 'أرسل' },
      transform: { primary: 'حوّل' },
    },
  },
  includeOperators: false,
  caseInsensitive: false,
});

// =============================================================================
// Korean FlowScript Tokenizer
// =============================================================================

export const KoreanFlowTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'ko',
  customExtractors: sharedExtractors,
  keywords: [
    // Commands
    '가져오기',
    '폴링',
    '스트리밍',
    '제출',
    '변환',
    // Role markers / particles
    '로',
    '에',
    '마다',
    '를',
    '에서',
  ],
  keywordExtras: [
    { native: '가져오기', normalized: 'fetch' },
    { native: '폴링', normalized: 'poll' },
    { native: '스트리밍', normalized: 'stream' },
    { native: '제출', normalized: 'submit' },
    { native: '변환', normalized: 'transform' },
    { native: '로', normalized: 'as' },
    { native: '에', normalized: 'into' },
    { native: '마다', normalized: 'every' },
    { native: '를', normalized: 'patient' },
  ],
  keywordProfile: {
    keywords: {
      fetch: { primary: '가져오기' },
      poll: { primary: '폴링' },
      stream: { primary: '스트리밍' },
      submit: { primary: '제출' },
      transform: { primary: '변환' },
    },
  },
  includeOperators: false,
  caseInsensitive: false,
});

// =============================================================================
// Chinese FlowScript Tokenizer
// =============================================================================

export const ChineseFlowTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'zh',
  customExtractors: sharedExtractors,
  keywords: [
    // Commands
    '获取',
    '轮询',
    '流式',
    '提交',
    '转换',
    // Role markers
    '以',
    '到',
    '每',
    '用',
    '从',
  ],
  keywordExtras: [
    { native: '获取', normalized: 'fetch' },
    { native: '轮询', normalized: 'poll' },
    { native: '流式', normalized: 'stream' },
    { native: '提交', normalized: 'submit' },
    { native: '转换', normalized: 'transform' },
    { native: '以', normalized: 'as' },
    { native: '到', normalized: 'into' },
    { native: '每', normalized: 'every' },
    { native: '用', normalized: 'with' },
  ],
  keywordProfile: {
    keywords: {
      fetch: { primary: '获取' },
      poll: { primary: '轮询' },
      stream: { primary: '流式' },
      submit: { primary: '提交' },
      transform: { primary: '转换' },
    },
  },
  includeOperators: false,
  caseInsensitive: false,
});

// =============================================================================
// Turkish FlowScript Tokenizer
// =============================================================================

export const TurkishFlowTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'tr',
  customExtractors: [...sharedExtractors, new LatinExtendedIdentifierExtractor()],
  keywords: [
    // Commands
    'getir',
    'yokla',
    'aktar',
    'gönder',
    'dönüştür',
    // Role markers
    'olarak',
    'e',
    'her',
    'ile',
    'dan',
  ],
  keywordExtras: [
    { native: 'getir', normalized: 'fetch' },
    { native: 'yokla', normalized: 'poll' },
    { native: 'aktar', normalized: 'stream' },
    { native: 'gönder', normalized: 'submit' },
    { native: 'dönüştür', normalized: 'transform' },
    { native: 'olarak', normalized: 'as' },
    { native: 'e', normalized: 'into' },
    { native: 'her', normalized: 'every' },
    { native: 'ile', normalized: 'with' },
  ],
  keywordProfile: {
    keywords: {
      fetch: { primary: 'getir' },
      poll: { primary: 'yokla' },
      stream: { primary: 'aktar' },
      submit: { primary: 'gönder' },
      transform: { primary: 'dönüştür' },
    },
  },
  includeOperators: false,
  caseInsensitive: true,
});

// =============================================================================
// French FlowScript Tokenizer
// =============================================================================

export const FrenchFlowTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'fr',
  customExtractors: [...sharedExtractors, new LatinExtendedIdentifierExtractor()],
  keywords: [
    // Commands
    'récupérer',
    'interroger',
    'diffuser',
    'soumettre',
    'transformer',
    // Role markers
    'comme',
    'dans',
    'chaque',
    'vers',
    'avec',
    'de',
  ],
  keywordExtras: [
    { native: 'récupérer', normalized: 'fetch' },
    { native: 'interroger', normalized: 'poll' },
    { native: 'diffuser', normalized: 'stream' },
    { native: 'soumettre', normalized: 'submit' },
    { native: 'transformer', normalized: 'transform' },
    { native: 'comme', normalized: 'as' },
    { native: 'dans', normalized: 'into' },
    { native: 'chaque', normalized: 'every' },
    { native: 'vers', normalized: 'to' },
    { native: 'avec', normalized: 'with' },
  ],
  keywordProfile: {
    keywords: {
      fetch: { primary: 'récupérer' },
      poll: { primary: 'interroger' },
      stream: { primary: 'diffuser' },
      submit: { primary: 'soumettre' },
      transform: { primary: 'transformer' },
    },
  },
  includeOperators: false,
  caseInsensitive: true,
});
