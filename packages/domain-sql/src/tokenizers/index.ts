/**
 * SQL Tokenizers
 *
 * Language-specific tokenizers for SQL input (8 languages), created via the
 * framework's createSimpleTokenizer factory. Each tokenizer handles keyword
 * classification, operator recognition, and (for non-Latin scripts) keyword
 * normalization.
 */

import { createSimpleTokenizer, LatinExtendedIdentifierExtractor } from '@lokascript/framework';
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
    'get',
    'from',
    'into',
    'where',
    'set',
    'values',
    'limit',
    'and',
    'or',
    'not',
    'null',
    'true',
    'false',
    'between',
    'like',
    'in',
    'is',
  ],
  includeOperators: true,
  caseInsensitive: true,
});

// =============================================================================
// Spanish SQL Tokenizer
// =============================================================================

export const SpanishSQLTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'es',
  // Needed so ñ, á, é, í, ó, ú don't split identifiers (e.g. `añadir`).
  customExtractors: [new LatinExtendedIdentifierExtractor()],
  keywords: [
    'seleccionar',
    'insertar',
    'actualizar',
    'eliminar',
    'obtener',
    'de',
    'en',
    'donde',
    'establecer',
    'valores',
    'límite',
    'y',
    'o',
    'no',
    'nulo',
    'verdadero',
    'falso',
    'entre',
    'como',
    'es',
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
    '取得',
    'から',
    'に',
    '条件',
    '設定',
    '値',
    '件数',
    'と',
    'または',
    'ない',
    'ヌル',
    '間',
    '似',
    '中',
  ],
  keywordExtras: [
    { native: '選択', normalized: 'select' },
    { native: '挿入', normalized: 'insert' },
    { native: '更新', normalized: 'update' },
    { native: '削除', normalized: 'delete' },
    { native: '取得', normalized: 'get' },
    { native: 'から', normalized: 'from' },
    { native: 'に', normalized: 'into' },
    { native: '条件', normalized: 'where' },
    { native: '設定', normalized: 'set' },
    { native: '件数', normalized: 'limit' },
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
    'اجلب',
    'من',
    'في',
    'حيث',
    'عيّن',
    'قيم',
    'حد',
    'و',
    'أو',
    'ليس',
    'فارغ',
    'بين',
    'مثل',
    'ضمن',
  ],
  keywordExtras: [
    { native: 'اختر', normalized: 'select' },
    { native: 'أدخل', normalized: 'insert' },
    { native: 'حدّث', normalized: 'update' },
    { native: 'احذف', normalized: 'delete' },
    { native: 'اجلب', normalized: 'get' },
    { native: 'من', normalized: 'from' },
    { native: 'في', normalized: 'into' },
    { native: 'حيث', normalized: 'where' },
    { native: 'عيّن', normalized: 'set' },
    { native: 'حد', normalized: 'limit' },
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

// =============================================================================
// Korean SQL Tokenizer
// =============================================================================

export const KoreanSQLTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'ko',
  keywords: [
    '선택',
    '삽입',
    '갱신',
    '삭제',
    '가져오기',
    '에서',
    '에',
    '조건',
    '설정',
    '값',
    '제한',
    '그리고',
    '또는',
    '아닌',
    '널',
    '사이',
    '같은',
    '안',
  ],
  keywordExtras: [
    { native: '선택', normalized: 'select' },
    { native: '삽입', normalized: 'insert' },
    { native: '갱신', normalized: 'update' },
    { native: '삭제', normalized: 'delete' },
    { native: '가져오기', normalized: 'get' },
    { native: '에서', normalized: 'from' },
    { native: '에', normalized: 'into' },
    { native: '조건', normalized: 'where' },
    { native: '설정', normalized: 'set' },
    { native: '제한', normalized: 'limit' },
  ],
  keywordProfile: {
    keywords: {
      select: { primary: '선택' },
      insert: { primary: '삽입' },
      update: { primary: '갱신' },
      delete: { primary: '삭제' },
    },
  },
  includeOperators: true,
  caseInsensitive: false,
});

// =============================================================================
// Chinese SQL Tokenizer
// =============================================================================

export const ChineseSQLTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'zh',
  keywords: [
    '查询',
    '插入',
    '更新',
    '删除',
    '获取',
    '从',
    '到',
    '条件',
    '设置',
    '值',
    '限制',
    '和',
    '或',
    '非',
    '空',
    '之间',
    '像',
    '在',
  ],
  keywordExtras: [
    { native: '查询', normalized: 'select' },
    { native: '插入', normalized: 'insert' },
    { native: '更新', normalized: 'update' },
    { native: '删除', normalized: 'delete' },
    { native: '获取', normalized: 'get' },
    { native: '从', normalized: 'from' },
    { native: '到', normalized: 'into' },
    { native: '条件', normalized: 'where' },
    { native: '设置', normalized: 'set' },
    { native: '限制', normalized: 'limit' },
  ],
  keywordProfile: {
    keywords: {
      select: { primary: '查询' },
      insert: { primary: '插入' },
      update: { primary: '更新' },
      delete: { primary: '删除' },
    },
  },
  includeOperators: true,
  caseInsensitive: false,
});

// =============================================================================
// Turkish SQL Tokenizer
// =============================================================================

export const TurkishSQLTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'tr',
  customExtractors: [new LatinExtendedIdentifierExtractor()],
  keywords: [
    'seç',
    'ekle',
    'güncelle',
    'sil',
    'al',
    'den',
    'e',
    'koşul',
    'ayarla',
    'değer',
    'limit',
    've',
    'veya',
    'değil',
    'boş',
    'arasında',
    'gibi',
    'içinde',
  ],
  keywordExtras: [
    { native: 'seç', normalized: 'select' },
    { native: 'ekle', normalized: 'insert' },
    { native: 'güncelle', normalized: 'update' },
    { native: 'sil', normalized: 'delete' },
    { native: 'al', normalized: 'get' },
    { native: 'den', normalized: 'from' },
    { native: 'e', normalized: 'into' },
    { native: 'koşul', normalized: 'where' },
    { native: 'ayarla', normalized: 'set' },
    { native: 'limit', normalized: 'limit' },
  ],
  keywordProfile: {
    keywords: {
      select: { primary: 'seç' },
      insert: { primary: 'ekle' },
      update: { primary: 'güncelle' },
      delete: { primary: 'sil' },
    },
  },
  includeOperators: true,
  caseInsensitive: true,
});

// =============================================================================
// French SQL Tokenizer
// =============================================================================

export const FrenchSQLTokenizer: LanguageTokenizer = createSimpleTokenizer({
  language: 'fr',
  customExtractors: [new LatinExtendedIdentifierExtractor()],
  keywords: [
    'sélectionner',
    'insérer',
    'mettre-à-jour',
    'supprimer',
    'obtenir',
    'de',
    'dans',
    'où',
    'définir',
    'valeurs',
    'limite',
    'et',
    'ou',
    'non',
    'nul',
    'vrai',
    'faux',
    'entre',
    'comme',
    'parmi',
  ],
  keywordExtras: [
    { native: 'sélectionner', normalized: 'select' },
    { native: 'insérer', normalized: 'insert' },
    { native: 'mettre-à-jour', normalized: 'update' },
    { native: 'supprimer', normalized: 'delete' },
    { native: 'obtenir', normalized: 'get' },
    { native: 'de', normalized: 'from' },
    { native: 'dans', normalized: 'into' },
    { native: 'où', normalized: 'where' },
    { native: 'définir', normalized: 'set' },
    { native: 'limite', normalized: 'limit' },
  ],
  keywordProfile: {
    keywords: {
      select: { primary: 'sélectionner' },
      insert: { primary: 'insérer' },
      update: { primary: 'mettre-à-jour' },
      delete: { primary: 'supprimer' },
    },
  },
  includeOperators: true,
  caseInsensitive: true,
});
