/**
 * Shared Keyword Constants
 *
 * Single source of truth for all language keywords used across
 * spec-parser, tokenizers, renderer, and mappings.
 */

// =============================================================================
// Supported Languages
// =============================================================================

/** Languages with SOV word order (keyword at end of line) */
export const SOV_LANGUAGES = new Set(['ja', 'ko', 'tr']);

/** Languages with VSO word order (verb-first) */
export const VSO_LANGUAGES = new Set(['ar']);

// =============================================================================
// Command Keywords (per language)
// =============================================================================

export const COMMAND_KEYWORDS: Record<string, Record<string, string>> = {
  test: {
    en: 'test',
    es: 'prueba',
    ja: 'テスト',
    ar: 'اختبار',
    ko: '테스트',
    zh: '测试',
    fr: 'test',
    tr: 'test',
  },
  given: {
    en: 'given',
    es: 'dado',
    ja: '前提',
    ar: 'بافتراض',
    ko: '전제',
    zh: '假设',
    fr: 'soit',
    tr: 'verilen',
  },
  when: {
    en: 'when',
    es: 'cuando',
    ja: '操作',
    ar: 'عندما',
    ko: '동작',
    zh: '当',
    fr: 'quand',
    tr: 'eylem',
  },
  expect: {
    en: 'expect',
    es: 'esperar',
    ja: '期待',
    ar: 'توقع',
    ko: '기대',
    zh: '期望',
    fr: 'attendre',
    tr: 'bekle',
  },
  after: {
    en: 'after',
    es: 'despues',
    ja: '後',
    ar: 'بعد',
    ko: '후',
    zh: '之后',
    fr: 'apres',
    tr: 'sonra',
  },
  not: { en: 'not', es: 'no', ja: '否定', ar: 'ليس', ko: '아님', zh: '不', fr: 'pas', tr: 'degil' },
  feature: {
    en: 'feature',
    es: 'funcionalidad',
    ja: '機能',
    ar: 'ميزة',
    ko: '기능',
    zh: '功能',
    fr: 'fonctionnalite',
    tr: 'ozellik',
  },
  setup: {
    en: 'setup',
    es: 'preparacion',
    ja: '準備',
    ar: 'إعداد',
    ko: '설정',
    zh: '设置',
    fr: 'preparation',
    tr: 'hazirlik',
  },
};

// =============================================================================
// Marker Keywords (per language)
// =============================================================================

export const MARKER_WORDS: Record<string, Record<string, string>> = {
  on: { en: 'on', es: 'en', ja: 'を', ar: 'على', ko: '을', zh: '在', fr: 'sur', tr: 'üzerinde' },
  into: {
    en: 'into',
    es: 'dentro',
    ja: 'に',
    ar: 'في',
    ko: '에',
    zh: '到',
    fr: 'dans',
    tr: 'içine',
  },
  saying: {
    en: 'saying',
    es: 'diciendo',
    ja: 'と',
    ar: 'يقول',
    ko: '으로',
    zh: '显示',
    fr: 'disant',
    tr: 'diyen',
  },
};

// =============================================================================
// Parser Keyword Lists (grouped by command)
// =============================================================================

/** Build keyword list from COMMAND_KEYWORDS for a given command */
function buildKeywordList(command: string): Record<string, string[]> {
  const kws = COMMAND_KEYWORDS[command];
  if (!kws) return {};
  const result: Record<string, string[]> = {};
  for (const [lang, kw] of Object.entries(kws)) {
    result[lang] = [kw];
  }
  return result;
}

export const TEST_KEYWORDS = buildKeywordList('test');
export const GIVEN_KEYWORDS = buildKeywordList('given');
export const WHEN_KEYWORDS = buildKeywordList('when');
export const EXPECT_KEYWORDS = buildKeywordList('expect');
export const AFTER_KEYWORDS = buildKeywordList('after');
export const NOT_KEYWORDS = buildKeywordList('not');
export const FEATURE_KEYWORDS = buildKeywordList('feature');
export const SETUP_KEYWORDS = buildKeywordList('setup');

// =============================================================================
// Article Prefixes (stripped from assertion lines)
// =============================================================================

export const ARTICLE_PREFIXES: Record<string, string[]> = {
  en: ['the ', 'a ', 'an '],
  es: ['el ', 'la ', 'un ', 'una ', 'los ', 'las '],
  ja: [],
  ar: ['ال'],
  ko: [],
  zh: [],
  fr: ['le ', 'la ', "l'", 'un ', 'une ', 'les ', 'des '],
  tr: [],
};
