/**
 * SQL Tokenizers
 *
 * Language-specific tokenizers for SQL input, created via the framework's
 * createSimpleTokenizer factory. Each tokenizer handles keyword classification,
 * operator recognition, and (for non-Latin scripts) keyword normalization.
 */

import { createSimpleTokenizer } from '@lokascript/framework';
import type { LanguageTokenizer } from '@lokascript/framework';

// =============================================================================
// English SQL Tokenizer
// =============================================================================

export const EnglishSQLTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'en',
  keywords: [
    'select',
    'insert',
    'update',
    'delete',
    'from',
    'into',
    'where',
    'set',
    'values',
    'and',
    'or',
    'not',
    'null',
    'true',
    'false',
  ],
  includeOperators: true,
  caseInsensitive: true,
});

// =============================================================================
// Spanish SQL Tokenizer
// =============================================================================

export const SpanishSQLTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'es',
  keywords: [
    'seleccionar',
    'insertar',
    'actualizar',
    'eliminar',
    'de',
    'en',
    'donde',
    'establecer',
    'valores',
    'y',
    'o',
    'no',
    'nulo',
    'verdadero',
    'falso',
  ],
  includeOperators: true,
  caseInsensitive: true,
});

// =============================================================================
// Japanese SQL Tokenizer
// =============================================================================

export const JapaneseSQLTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'ja',
  keywords: [
    '選択',
    '挿入',
    '更新',
    '削除',
    'から',
    'に',
    '条件',
    '設定',
    '値',
    'と',
    'または',
    'ない',
    'ヌル',
  ],
  keywordExtras: [
    { native: '選択', normalized: 'select' },
    { native: '挿入', normalized: 'insert' },
    { native: '更新', normalized: 'update' },
    { native: '削除', normalized: 'delete' },
    { native: 'から', normalized: 'from' },
    { native: 'に', normalized: 'into' },
    { native: '条件', normalized: 'where' },
    { native: '設定', normalized: 'set' },
  ],
  keywordProfile: {
    keywords: {
      select: { primary: '選択' },
      insert: { primary: '挿入' },
      update: { primary: '更新' },
      delete: { primary: '削除' },
    },
  },
  includeOperators: true,
  caseInsensitive: false,
});

// =============================================================================
// Arabic SQL Tokenizer
// =============================================================================

export const ArabicSQLTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'ar',
  direction: 'rtl',
  keywords: [
    'اختر',
    'أدخل',
    'حدّث',
    'احذف',
    'من',
    'في',
    'حيث',
    'عيّن',
    'قيم',
    'و',
    'أو',
    'ليس',
    'فارغ',
  ],
  keywordExtras: [
    { native: 'اختر', normalized: 'select' },
    { native: 'أدخل', normalized: 'insert' },
    { native: 'حدّث', normalized: 'update' },
    { native: 'احذف', normalized: 'delete' },
    { native: 'من', normalized: 'from' },
    { native: 'في', normalized: 'into' },
    { native: 'حيث', normalized: 'where' },
    { native: 'عيّن', normalized: 'set' },
  ],
  keywordProfile: {
    keywords: {
      select: { primary: 'اختر' },
      insert: { primary: 'أدخل' },
      update: { primary: 'حدّث' },
      delete: { primary: 'احذف' },
    },
  },
  includeOperators: true,
  caseInsensitive: false,
});
