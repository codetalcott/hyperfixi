/**
 * JSX Tokenizers
 *
 * Language-specific tokenizers for JSX DSL input, using the framework's
 * createSimpleTokenizer() factory to eliminate boilerplate.
 */

import { createSimpleTokenizer } from '@lokascript/framework';
import type { LanguageTokenizer } from '@lokascript/framework';

// =============================================================================
// Shared keyword lists
// =============================================================================

const JSX_COMMANDS = ['element', 'component', 'render', 'state', 'effect', 'fragment'];

// =============================================================================
// English JSX Tokenizer
// =============================================================================

export const EnglishJSXTokenizer = createSimpleTokenizer({
  language: 'en',
  keywords: [...JSX_COMMANDS, 'with', 'into', 'initial', 'on', 'containing', 'returning', 'props'],
});

// =============================================================================
// Spanish JSX Tokenizer
// =============================================================================

export const SpanishJSXTokenizer = createSimpleTokenizer({
  language: 'es',
  keywords: [
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
  ],
});

// =============================================================================
// Japanese JSX Tokenizer
// =============================================================================

export const JapaneseJSXTokenizer = createSimpleTokenizer({
  language: 'ja',
  caseInsensitive: false,
  keywords: [
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
  ],
  keywordExtras: [
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
  ],
  keywordProfile: {
    keywords: {
      element: { primary: '要素' },
      component: { primary: 'コンポーネント' },
      render: { primary: '描画' },
      state: { primary: '状態' },
      effect: { primary: 'エフェクト' },
      fragment: { primary: 'フラグメント' },
    },
  },
});

// =============================================================================
// Arabic JSX Tokenizer
// =============================================================================

export const ArabicJSXTokenizer = createSimpleTokenizer({
  language: 'ar',
  direction: 'rtl',
  caseInsensitive: false,
  keywords: [
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
  ],
  keywordExtras: [
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
  ],
  keywordProfile: {
    keywords: {
      element: { primary: 'عنصر' },
      component: { primary: 'مكوّن' },
      render: { primary: 'ارسم' },
      state: { primary: 'حالة' },
      effect: { primary: 'تأثير' },
      fragment: { primary: 'جزء' },
    },
  },
});

// Re-export the LanguageTokenizer type for consumers
export type { LanguageTokenizer };
