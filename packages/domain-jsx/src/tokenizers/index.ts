/**
 * JSX Tokenizers
 *
 * Language-specific tokenizers for JSX DSL input. Each tokenizer extends
 * the framework's BaseTokenizer and classifies tokens for JSX/React code.
 */

import { BaseTokenizer, getDefaultExtractors } from '@lokascript/framework';
import type { TokenKind, KeywordEntry } from '@lokascript/framework';

// =============================================================================
// English JSX Tokenizer
// =============================================================================

const EN_KEYWORDS = new Set([
  'element',
  'component',
  'render',
  'state',
  'effect',
  'fragment',
  'with',
  'into',
  'initial',
  'on',
  'containing',
  'returning',
  'props',
  'with props',
]);

export class EnglishJSXTokenizer extends BaseTokenizer {
  readonly language = 'en';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    this.registerExtractors(getDefaultExtractors());
  }

  classifyToken(token: string): TokenKind {
    if (EN_KEYWORDS.has(token.toLowerCase())) return 'keyword';
    if (/^\d/.test(token)) return 'literal';
    if (/^['"]/.test(token)) return 'literal';
    if (/^[<>{}()[\]=,.]$/.test(token)) return 'operator';
    return 'identifier';
  }
}

// =============================================================================
// Spanish JSX Tokenizer
// =============================================================================

const ES_KEYWORDS = new Set([
  'elemento',
  'componente',
  'renderizar',
  'estado',
  'efecto',
  'fragmento',
  'con',
  'en',
  'inicial',
  'conteniendo',
  'retornando',
  'props',
  'con props',
]);

export class SpanishJSXTokenizer extends BaseTokenizer {
  readonly language = 'es';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    this.registerExtractors(getDefaultExtractors());
  }

  classifyToken(token: string): TokenKind {
    if (ES_KEYWORDS.has(token.toLowerCase())) return 'keyword';
    if (/^\d/.test(token)) return 'literal';
    if (/^['"]/.test(token)) return 'literal';
    if (/^[<>{}()[\]=,.]$/.test(token)) return 'operator';
    return 'identifier';
  }
}

// =============================================================================
// Japanese JSX Tokenizer
// =============================================================================

const JA_KEYWORDS = new Set([
  '要素',
  'コンポーネント',
  '描画',
  '状態',
  'エフェクト',
  'フラグメント',
  'で',
  'に',
  '初期値',
  '内容',
  '返す',
  'プロパティ',
]);

const JA_KEYWORD_EXTRAS: KeywordEntry[] = [
  { native: '要素', normalized: 'element' },
  { native: 'コンポーネント', normalized: 'component' },
  { native: '描画', normalized: 'render' },
  { native: '状態', normalized: 'state' },
  { native: 'エフェクト', normalized: 'effect' },
  { native: 'フラグメント', normalized: 'fragment' },
  { native: 'で', normalized: 'with' },
  { native: 'に', normalized: 'into' },
  { native: '初期値', normalized: 'initial' },
  { native: '内容', normalized: 'containing' },
  { native: '返す', normalized: 'returning' },
  { native: 'プロパティ', normalized: 'props' },
];

export class JapaneseJSXTokenizer extends BaseTokenizer {
  readonly language = 'ja';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    this.registerExtractors(getDefaultExtractors());
    this.initializeKeywordsFromProfile(
      {
        keywords: {
          element: { primary: '要素' },
          component: { primary: 'コンポーネント' },
          render: { primary: '描画' },
          state: { primary: '状態' },
          effect: { primary: 'エフェクト' },
          fragment: { primary: 'フラグメント' },
        },
      },
      JA_KEYWORD_EXTRAS
    );
  }

  classifyToken(token: string): TokenKind {
    if (JA_KEYWORDS.has(token)) return 'keyword';
    if (this.isKeyword(token)) return 'keyword';
    if (/^\d/.test(token)) return 'literal';
    if (/^['"]/.test(token)) return 'literal';
    if (/^[<>{}()[\]=,.]$/.test(token)) return 'operator';
    return 'identifier';
  }
}

// =============================================================================
// Arabic JSX Tokenizer
// =============================================================================

const AR_KEYWORDS = new Set([
  'عنصر',
  'مكوّن',
  'ارسم',
  'حالة',
  'تأثير',
  'جزء',
  'مع',
  'في',
  'ابتدائي',
  'عند',
  'يحتوي',
  'يُرجع',
  'خصائص',
  'مع خصائص',
]);

const AR_KEYWORD_EXTRAS: KeywordEntry[] = [
  { native: 'عنصر', normalized: 'element' },
  { native: 'مكوّن', normalized: 'component' },
  { native: 'ارسم', normalized: 'render' },
  { native: 'حالة', normalized: 'state' },
  { native: 'تأثير', normalized: 'effect' },
  { native: 'جزء', normalized: 'fragment' },
  { native: 'مع', normalized: 'with' },
  { native: 'في', normalized: 'into' },
  { native: 'ابتدائي', normalized: 'initial' },
  { native: 'عند', normalized: 'on' },
  { native: 'يحتوي', normalized: 'containing' },
  { native: 'يُرجع', normalized: 'returning' },
  { native: 'خصائص', normalized: 'props' },
];

export class ArabicJSXTokenizer extends BaseTokenizer {
  readonly language = 'ar';
  readonly direction = 'rtl' as const;

  constructor() {
    super();
    this.registerExtractors(getDefaultExtractors());
    this.initializeKeywordsFromProfile(
      {
        keywords: {
          element: { primary: 'عنصر' },
          component: { primary: 'مكوّن' },
          render: { primary: 'ارسم' },
          state: { primary: 'حالة' },
          effect: { primary: 'تأثير' },
          fragment: { primary: 'جزء' },
        },
      },
      AR_KEYWORD_EXTRAS
    );
  }

  classifyToken(token: string): TokenKind {
    if (AR_KEYWORDS.has(token)) return 'keyword';
    if (this.isKeyword(token)) return 'keyword';
    if (/^\d/.test(token)) return 'literal';
    if (/^['"]/.test(token)) return 'literal';
    if (/^[<>{}()[\]=,.]$/.test(token)) return 'operator';
    return 'identifier';
  }
}

// =============================================================================
// Exports
// =============================================================================

export const englishTokenizer = new EnglishJSXTokenizer();
export const spanishTokenizer = new SpanishJSXTokenizer();
export const japaneseTokenizer = new JapaneseJSXTokenizer();
export const arabicTokenizer = new ArabicJSXTokenizer();
