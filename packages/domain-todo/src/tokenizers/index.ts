/**
 * Todo Tokenizers
 *
 * Language-specific tokenizers for todo input (8 languages), created via the
 * framework's createSimpleTokenizer factory.
 */

import { createSimpleTokenizer, LatinExtendedIdentifierExtractor } from '@lokascript/framework';
import type { LanguageTokenizer } from '@lokascript/framework';

// =============================================================================
// English
// =============================================================================

export const EnglishTodoTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'en',
  direction: 'ltr',
  keywords: ['add', 'complete', 'done', 'finish', 'list', 'show', 'to'],
  caseInsensitive: true,
});

// =============================================================================
// Spanish
// =============================================================================

export const SpanishTodoTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'es',
  direction: 'ltr',
  customExtractors: [new LatinExtendedIdentifierExtractor()],
  keywords: ['agregar', 'añadir', 'completar', 'terminar', 'listar', 'mostrar', 'a'],
  caseInsensitive: true,
});

// =============================================================================
// Japanese
// =============================================================================

export const JapaneseTodoTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'ja',
  direction: 'ltr',
  keywords: ['追加', '完了', '一覧', 'を', 'に'],
  keywordExtras: [
    { native: '追加', normalized: 'add' },
    { native: '完了', normalized: 'complete' },
    { native: '一覧', normalized: 'list' },
    { native: 'を', normalized: 'wo' },
    { native: 'に', normalized: 'ni' },
  ],
  keywordProfile: {
    keywords: {
      add: { primary: '追加' },
      complete: { primary: '完了' },
      list: { primary: '一覧' },
    },
  },
  caseInsensitive: false,
});

// =============================================================================
// Arabic (VSO)
// =============================================================================

export const ArabicTodoTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'ar',
  direction: 'rtl',
  keywords: ['أضف', 'أكمل', 'اعرض', 'إلى'],
  keywordExtras: [
    { native: 'أضف', normalized: 'add' },
    { native: 'أكمل', normalized: 'complete' },
    { native: 'اعرض', normalized: 'list' },
    { native: 'إلى', normalized: 'to' },
  ],
  keywordProfile: {
    keywords: {
      add: { primary: 'أضف' },
      complete: { primary: 'أكمل' },
      list: { primary: 'اعرض' },
    },
  },
  caseInsensitive: false,
});

// =============================================================================
// Korean (SOV)
// =============================================================================

export const KoreanTodoTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'ko',
  direction: 'ltr',
  keywords: ['추가', '완료', '목록', '를', '에'],
  keywordExtras: [
    { native: '추가', normalized: 'add' },
    { native: '완료', normalized: 'complete' },
    { native: '목록', normalized: 'list' },
    { native: '를', normalized: 'reul' },
    { native: '에', normalized: 'e' },
  ],
  keywordProfile: {
    keywords: {
      add: { primary: '추가' },
      complete: { primary: '완료' },
      list: { primary: '목록' },
    },
  },
  caseInsensitive: false,
});

// =============================================================================
// Chinese (SVO)
// =============================================================================

export const ChineseTodoTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'zh',
  direction: 'ltr',
  keywords: ['添加', '完成', '列出', '到'],
  keywordExtras: [
    { native: '添加', normalized: 'add' },
    { native: '完成', normalized: 'complete' },
    { native: '列出', normalized: 'list' },
    { native: '到', normalized: 'to' },
  ],
  keywordProfile: {
    keywords: {
      add: { primary: '添加' },
      complete: { primary: '完成' },
      list: { primary: '列出' },
    },
  },
  caseInsensitive: false,
});

// =============================================================================
// Turkish (SOV)
// =============================================================================

export const TurkishTodoTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'tr',
  direction: 'ltr',
  customExtractors: [new LatinExtendedIdentifierExtractor()],
  keywords: ['ekle', 'tamamla', 'listele', 'e'],
  keywordExtras: [
    { native: 'ekle', normalized: 'add' },
    { native: 'tamamla', normalized: 'complete' },
    { native: 'listele', normalized: 'list' },
    { native: 'e', normalized: 'to' },
  ],
  keywordProfile: {
    keywords: {
      add: { primary: 'ekle' },
      complete: { primary: 'tamamla' },
      list: { primary: 'listele' },
    },
  },
  caseInsensitive: true,
});

// =============================================================================
// French (SVO)
// =============================================================================

export const FrenchTodoTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'fr',
  direction: 'ltr',
  customExtractors: [new LatinExtendedIdentifierExtractor()],
  keywords: ['ajouter', 'terminer', 'lister', 'afficher', 'à'],
  keywordExtras: [
    { native: 'ajouter', normalized: 'add' },
    { native: 'terminer', normalized: 'complete' },
    { native: 'lister', normalized: 'list' },
    { native: 'afficher', normalized: 'show' },
    { native: 'à', normalized: 'to' },
  ],
  keywordProfile: {
    keywords: {
      add: { primary: 'ajouter' },
      complete: { primary: 'terminer' },
      list: { primary: 'lister', alternatives: ['afficher'] },
    },
  },
  caseInsensitive: true,
});
