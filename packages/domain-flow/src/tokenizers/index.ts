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

import { createSimpleTokenizer, LatinExtendedIdentifierExtractor } from '@lokascript/framework';
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
    // HATEOAS commands
    'enter',
    'follow',
    'perform',
    'capture',
    // Role markers
    'as',
    'into',
    'every',
    'to',
    'with',
    'from',
    'item',
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
    // HATEOAS commands
    'entrar',
    'seguir',
    'ejecutar',
    'capturar',
    // Role markers
    'como',
    'en',
    'cada',
    'a',
    'con',
    'de',
    'elemento',
  ],
  keywordExtras: [
    { native: 'obtener', normalized: 'fetch' },
    { native: 'sondear', normalized: 'poll' },
    { native: 'transmitir', normalized: 'stream' },
    { native: 'enviar', normalized: 'submit' },
    { native: 'transformar', normalized: 'transform' },
    { native: 'entrar', normalized: 'enter' },
    { native: 'seguir', normalized: 'follow' },
    { native: 'ejecutar', normalized: 'perform' },
    { native: 'capturar', normalized: 'capture' },
    { native: 'como', normalized: 'as' },
    { native: 'en', normalized: 'into' },
    { native: 'cada', normalized: 'every' },
    { native: 'a', normalized: 'to' },
    { native: 'con', normalized: 'with' },
    { native: 'elemento', normalized: 'item' },
  ],
  keywordProfile: {
    keywords: {
      fetch: { primary: 'obtener' },
      poll: { primary: 'sondear' },
      stream: { primary: 'transmitir' },
      submit: { primary: 'enviar' },
      transform: { primary: 'transformar' },
      enter: { primary: 'entrar' },
      follow: { primary: 'seguir' },
      perform: { primary: 'ejecutar' },
      capture: { primary: 'capturar' },
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
    // HATEOAS commands
    '入る',
    '辿る',
    '実行',
    '取得変数',
    // Role markers / particles
    'で',
    'に',
    'ごとに',
    'を',
    'から',
    'の',
    'として',
  ],
  keywordExtras: [
    { native: '取得', normalized: 'fetch' },
    { native: 'ポーリング', normalized: 'poll' },
    { native: 'ストリーム', normalized: 'stream' },
    { native: '送信', normalized: 'submit' },
    { native: '変換', normalized: 'transform' },
    { native: '入る', normalized: 'enter' },
    { native: '辿る', normalized: 'follow' },
    { native: '実行', normalized: 'perform' },
    { native: '取得変数', normalized: 'capture' },
    { native: 'で', normalized: 'as' },
    { native: 'に', normalized: 'into' },
    { native: 'ごとに', normalized: 'every' },
    { native: 'を', normalized: 'patient' },
    { native: 'の', normalized: 'item' },
    { native: 'として', normalized: 'as' },
  ],
  keywordProfile: {
    keywords: {
      fetch: { primary: '取得' },
      poll: { primary: 'ポーリング' },
      stream: { primary: 'ストリーム' },
      submit: { primary: '送信' },
      transform: { primary: '変換' },
      enter: { primary: '入る' },
      follow: { primary: '辿る' },
      perform: { primary: '実行' },
      capture: { primary: '取得変数' },
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
    // HATEOAS commands
    'ادخل',
    'اتبع',
    'نفّذ',
    'التقط',
    // Role markers
    'ك',
    'في',
    'كل',
    'إلى',
    'ب',
    'من',
    'عنصر',
  ],
  keywordExtras: [
    { native: 'جلب', normalized: 'fetch' },
    { native: 'استطلع', normalized: 'poll' },
    { native: 'بث', normalized: 'stream' },
    { native: 'أرسل', normalized: 'submit' },
    { native: 'حوّل', normalized: 'transform' },
    { native: 'ادخل', normalized: 'enter' },
    { native: 'اتبع', normalized: 'follow' },
    { native: 'نفّذ', normalized: 'perform' },
    { native: 'التقط', normalized: 'capture' },
    { native: 'ك', normalized: 'as' },
    { native: 'في', normalized: 'into' },
    { native: 'كل', normalized: 'every' },
    { native: 'إلى', normalized: 'to' },
    { native: 'ب', normalized: 'with' },
    { native: 'عنصر', normalized: 'item' },
  ],
  keywordProfile: {
    keywords: {
      fetch: { primary: 'جلب' },
      poll: { primary: 'استطلع' },
      stream: { primary: 'بث' },
      submit: { primary: 'أرسل' },
      transform: { primary: 'حوّل' },
      enter: { primary: 'ادخل' },
      follow: { primary: 'اتبع' },
      perform: { primary: 'نفّذ' },
      capture: { primary: 'التقط' },
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
    // HATEOAS commands
    '진입',
    '따라가기',
    '실행',
    '캡처',
    // Role markers / particles
    '로',
    '에',
    '마다',
    '를',
    '에서',
    '항목',
  ],
  keywordExtras: [
    { native: '가져오기', normalized: 'fetch' },
    { native: '폴링', normalized: 'poll' },
    { native: '스트리밍', normalized: 'stream' },
    { native: '제출', normalized: 'submit' },
    { native: '변환', normalized: 'transform' },
    { native: '진입', normalized: 'enter' },
    { native: '따라가기', normalized: 'follow' },
    { native: '실행', normalized: 'perform' },
    { native: '캡처', normalized: 'capture' },
    { native: '로', normalized: 'as' },
    { native: '에', normalized: 'into' },
    { native: '마다', normalized: 'every' },
    { native: '를', normalized: 'patient' },
    { native: '항목', normalized: 'item' },
  ],
  keywordProfile: {
    keywords: {
      fetch: { primary: '가져오기' },
      poll: { primary: '폴링' },
      stream: { primary: '스트리밍' },
      submit: { primary: '제출' },
      transform: { primary: '변환' },
      enter: { primary: '진입' },
      follow: { primary: '따라가기' },
      perform: { primary: '실행' },
      capture: { primary: '캡처' },
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
    // HATEOAS commands
    '进入',
    '跟随',
    '执行',
    '捕获',
    // Role markers
    '以',
    '到',
    '每',
    '用',
    '从',
    '项',
    '为',
  ],
  keywordExtras: [
    { native: '获取', normalized: 'fetch' },
    { native: '轮询', normalized: 'poll' },
    { native: '流式', normalized: 'stream' },
    { native: '提交', normalized: 'submit' },
    { native: '转换', normalized: 'transform' },
    { native: '进入', normalized: 'enter' },
    { native: '跟随', normalized: 'follow' },
    { native: '执行', normalized: 'perform' },
    { native: '捕获', normalized: 'capture' },
    { native: '以', normalized: 'as' },
    { native: '到', normalized: 'into' },
    { native: '每', normalized: 'every' },
    { native: '用', normalized: 'with' },
    { native: '项', normalized: 'item' },
    { native: '为', normalized: 'as' },
  ],
  keywordProfile: {
    keywords: {
      fetch: { primary: '获取' },
      poll: { primary: '轮询' },
      stream: { primary: '流式' },
      submit: { primary: '提交' },
      transform: { primary: '转换' },
      enter: { primary: '进入' },
      follow: { primary: '跟随' },
      perform: { primary: '执行' },
      capture: { primary: '捕获' },
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
    // HATEOAS commands
    'gir',
    'izle',
    'yürüt',
    'yakala',
    // Role markers
    'olarak',
    'e',
    'her',
    'ile',
    'dan',
    'öğe',
  ],
  keywordExtras: [
    { native: 'getir', normalized: 'fetch' },
    { native: 'yokla', normalized: 'poll' },
    { native: 'aktar', normalized: 'stream' },
    { native: 'gönder', normalized: 'submit' },
    { native: 'dönüştür', normalized: 'transform' },
    { native: 'gir', normalized: 'enter' },
    { native: 'izle', normalized: 'follow' },
    { native: 'yürüt', normalized: 'perform' },
    { native: 'yakala', normalized: 'capture' },
    { native: 'olarak', normalized: 'as' },
    { native: 'e', normalized: 'into' },
    { native: 'her', normalized: 'every' },
    { native: 'ile', normalized: 'with' },
    { native: 'öğe', normalized: 'item' },
  ],
  keywordProfile: {
    keywords: {
      fetch: { primary: 'getir' },
      poll: { primary: 'yokla' },
      stream: { primary: 'aktar' },
      submit: { primary: 'gönder' },
      transform: { primary: 'dönüştür' },
      enter: { primary: 'gir' },
      follow: { primary: 'izle' },
      perform: { primary: 'yürüt' },
      capture: { primary: 'yakala' },
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
    // HATEOAS commands
    'entrer',
    'suivre',
    'exécuter',
    'capturer',
    // Role markers
    'comme',
    'dans',
    'chaque',
    'vers',
    'avec',
    'de',
    'élément',
  ],
  keywordExtras: [
    { native: 'récupérer', normalized: 'fetch' },
    { native: 'interroger', normalized: 'poll' },
    { native: 'diffuser', normalized: 'stream' },
    { native: 'soumettre', normalized: 'submit' },
    { native: 'transformer', normalized: 'transform' },
    { native: 'entrer', normalized: 'enter' },
    { native: 'suivre', normalized: 'follow' },
    { native: 'exécuter', normalized: 'perform' },
    { native: 'capturer', normalized: 'capture' },
    { native: 'comme', normalized: 'as' },
    { native: 'dans', normalized: 'into' },
    { native: 'chaque', normalized: 'every' },
    { native: 'vers', normalized: 'to' },
    { native: 'avec', normalized: 'with' },
    { native: 'élément', normalized: 'item' },
  ],
  keywordProfile: {
    keywords: {
      fetch: { primary: 'récupérer' },
      poll: { primary: 'interroger' },
      stream: { primary: 'diffuser' },
      submit: { primary: 'soumettre' },
      transform: { primary: 'transformer' },
      enter: { primary: 'entrer' },
      follow: { primary: 'suivre' },
      perform: { primary: 'exécuter' },
      capture: { primary: 'capturer' },
    },
  },
  includeOperators: false,
  caseInsensitive: true,
});
