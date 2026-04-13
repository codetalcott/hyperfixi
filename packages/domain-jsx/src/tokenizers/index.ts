/**
 * JSX Tokenizers
 *
 * Language-specific tokenizers for JSX DSL input, using the framework's
 * createSimpleTokenizer() factory to eliminate boilerplate.
 */

import { createSimpleTokenizer } from '@lokascript/framework';
import type { LanguageTokenizer, ValueExtractor, ExtractionResult } from '@lokascript/framework';

// =============================================================================
// Shared keyword lists
// =============================================================================

const JSX_COMMANDS = ['element', 'component', 'render', 'state', 'effect', 'fragment'];

// =============================================================================
// Latin Extended Identifier Extractor
// Handles Turkish (ö, ş, ç, ğ, ü, ı) and French (é, è, ê, ë, à, â, ç, ô)
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
// English JSX Tokenizer
// =============================================================================

export const EnglishJSXTokenizer = createSimpleTokenizer({
  language: 'en',
  keywords: [...JSX_COMMANDS, 'with', 'into', 'initial', 'on', 'containing', 'returning'],
});

// =============================================================================
// Spanish JSX Tokenizer
// =============================================================================

export const SpanishJSXTokenizer = createSimpleTokenizer({
  language: 'es',
  // Keep ñ, á, é, í, ó, ú identifiers intact (e.g. component/prop names).
  customExtractors: [new LatinExtendedIdentifierExtractor()],
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
    { native: 'プロパティ', normalized: 'with' },
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

// =============================================================================
// Korean JSX Tokenizer
// =============================================================================

export const KoreanJSXTokenizer = createSimpleTokenizer({
  language: 'ko',
  caseInsensitive: false,
  keywords: [
    '요소',
    '컴포넌트',
    '렌더링',
    '상태',
    '효과',
    '프래그먼트',
    '로',
    '에',
    '초기값',
    '에서',
    '포함',
    '반환',
    '속성',
  ],
  keywordExtras: [
    { native: '요소', normalized: 'element' },
    { native: '컴포넌트', normalized: 'component' },
    { native: '렌더링', normalized: 'render' },
    { native: '상태', normalized: 'state' },
    { native: '효과', normalized: 'effect' },
    { native: '프래그먼트', normalized: 'fragment' },
    { native: '로', normalized: 'with' },
    { native: '에', normalized: 'into' },
    { native: '초기값', normalized: 'initial' },
    { native: '에서', normalized: 'on' },
    { native: '포함', normalized: 'containing' },
    { native: '반환', normalized: 'returning' },
    { native: '속성', normalized: 'with' },
  ],
  keywordProfile: {
    keywords: {
      element: { primary: '요소' },
      component: { primary: '컴포넌트' },
      render: { primary: '렌더링' },
      state: { primary: '상태' },
      effect: { primary: '효과' },
      fragment: { primary: '프래그먼트' },
    },
  },
});

// =============================================================================
// Chinese JSX Tokenizer
// =============================================================================

export const ChineseJSXTokenizer = createSimpleTokenizer({
  language: 'zh',
  caseInsensitive: false,
  keywords: [
    '元素',
    '组件',
    '渲染',
    '状态',
    '效果',
    '片段',
    '用',
    '到',
    '初始',
    '在',
    '包含',
    '返回',
    '属性',
  ],
  keywordExtras: [
    { native: '元素', normalized: 'element' },
    { native: '组件', normalized: 'component' },
    { native: '渲染', normalized: 'render' },
    { native: '状态', normalized: 'state' },
    { native: '效果', normalized: 'effect' },
    { native: '片段', normalized: 'fragment' },
    { native: '用', normalized: 'with' },
    { native: '到', normalized: 'into' },
    { native: '初始', normalized: 'initial' },
    { native: '在', normalized: 'on' },
    { native: '包含', normalized: 'containing' },
    { native: '返回', normalized: 'returning' },
    { native: '属性', normalized: 'with' },
  ],
  keywordProfile: {
    keywords: {
      element: { primary: '元素' },
      component: { primary: '组件' },
      render: { primary: '渲染' },
      state: { primary: '状态' },
      effect: { primary: '效果' },
      fragment: { primary: '片段' },
    },
  },
});

// =============================================================================
// Turkish JSX Tokenizer
// =============================================================================

export const TurkishJSXTokenizer = createSimpleTokenizer({
  language: 'tr',
  caseInsensitive: true,
  customExtractors: [new LatinExtendedIdentifierExtractor()],
  keywords: [
    'oge',
    'bilesen',
    'isle',
    'durum',
    'etki',
    'parca',
    'ile',
    'e',
    'baslangic',
    'de',
    'iceren',
    'donduren',
    'ozellik',
  ],
  keywordExtras: [
    { native: 'oge', normalized: 'element' },
    { native: 'bilesen', normalized: 'component' },
    { native: 'isle', normalized: 'render' },
    { native: 'durum', normalized: 'state' },
    { native: 'etki', normalized: 'effect' },
    { native: 'parca', normalized: 'fragment' },
    { native: 'ile', normalized: 'with' },
    { native: 'e', normalized: 'into' },
    { native: 'baslangic', normalized: 'initial' },
    { native: 'de', normalized: 'on' },
    { native: 'iceren', normalized: 'containing' },
    { native: 'donduren', normalized: 'returning' },
    { native: 'ozellik', normalized: 'with' },
  ],
  keywordProfile: {
    keywords: {
      element: { primary: 'oge' },
      component: { primary: 'bilesen' },
      render: { primary: 'isle' },
      state: { primary: 'durum' },
      effect: { primary: 'etki' },
      fragment: { primary: 'parca' },
    },
  },
});

// =============================================================================
// French JSX Tokenizer
// =============================================================================

export const FrenchJSXTokenizer = createSimpleTokenizer({
  language: 'fr',
  caseInsensitive: true,
  customExtractors: [new LatinExtendedIdentifierExtractor()],
  keywords: [
    'element',
    'composant',
    'afficher',
    'etat',
    'effet',
    'fragment',
    'avec',
    'dans',
    'initial',
    'sur',
    'contenant',
    'retournant',
    'proprietes',
  ],
  keywordExtras: [
    { native: 'element', normalized: 'element' },
    { native: 'composant', normalized: 'component' },
    { native: 'afficher', normalized: 'render' },
    { native: 'etat', normalized: 'state' },
    { native: 'effet', normalized: 'effect' },
    { native: 'fragment', normalized: 'fragment' },
    { native: 'avec', normalized: 'with' },
    { native: 'dans', normalized: 'into' },
    { native: 'initial', normalized: 'initial' },
    { native: 'sur', normalized: 'on' },
    { native: 'contenant', normalized: 'containing' },
    { native: 'retournant', normalized: 'returning' },
    { native: 'proprietes', normalized: 'with' },
  ],
  keywordProfile: {
    keywords: {
      element: { primary: 'element' },
      component: { primary: 'composant' },
      render: { primary: 'afficher' },
      state: { primary: 'etat' },
      effect: { primary: 'effet' },
      fragment: { primary: 'fragment' },
    },
  },
});

// Re-export the LanguageTokenizer type for consumers
export type { LanguageTokenizer };
