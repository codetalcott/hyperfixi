/**
 * BehaviorSpec Language Profiles
 *
 * Pattern generation profiles for each supported language.
 * These define keyword translations and word order for pattern generation.
 *
 * 8 languages covering all 3 word orders (SVO, SOV, VSO).
 */

import type { PatternGenLanguageProfile } from '@lokascript/framework';

// =============================================================================
// English (SVO)
// =============================================================================

export const englishProfile: PatternGenLanguageProfile = {
  code: 'en',
  wordOrder: 'SVO',
  keywords: {
    test: { primary: 'test' },
    given: { primary: 'given' },
    when: { primary: 'when' },
    expect: { primary: 'expect' },
    after: { primary: 'after' },
    not: { primary: 'not' },
  },
};

// =============================================================================
// Spanish (SVO)
// =============================================================================

export const spanishProfile: PatternGenLanguageProfile = {
  code: 'es',
  wordOrder: 'SVO',
  keywords: {
    test: { primary: 'prueba' },
    given: { primary: 'dado' },
    when: { primary: 'cuando' },
    expect: { primary: 'esperar' },
    after: { primary: 'despues' },
    not: { primary: 'no' },
  },
};

// =============================================================================
// Japanese (SOV)
// =============================================================================

export const japaneseProfile: PatternGenLanguageProfile = {
  code: 'ja',
  wordOrder: 'SOV',
  keywords: {
    test: { primary: 'テスト' },
    given: { primary: '前提' },
    when: { primary: '操作' },
    expect: { primary: '期待' },
    after: { primary: '後' },
    not: { primary: '否定' },
  },
};

// =============================================================================
// Arabic (VSO)
// =============================================================================

export const arabicProfile: PatternGenLanguageProfile = {
  code: 'ar',
  wordOrder: 'VSO',
  keywords: {
    test: { primary: 'اختبار' },
    given: { primary: 'بافتراض' },
    when: { primary: 'عندما' },
    expect: { primary: 'توقع' },
    after: { primary: 'بعد' },
    not: { primary: 'ليس' },
  },
};

// =============================================================================
// Korean (SOV)
// =============================================================================

export const koreanProfile: PatternGenLanguageProfile = {
  code: 'ko',
  wordOrder: 'SOV',
  keywords: {
    test: { primary: '테스트' },
    given: { primary: '전제' },
    when: { primary: '동작' },
    expect: { primary: '기대' },
    after: { primary: '후' },
    not: { primary: '아님' },
  },
};

// =============================================================================
// Chinese (SVO)
// =============================================================================

export const chineseProfile: PatternGenLanguageProfile = {
  code: 'zh',
  wordOrder: 'SVO',
  keywords: {
    test: { primary: '测试' },
    given: { primary: '假设' },
    when: { primary: '当' },
    expect: { primary: '期望' },
    after: { primary: '之后' },
    not: { primary: '不' },
  },
};

// =============================================================================
// French (SVO)
// =============================================================================

export const frenchProfile: PatternGenLanguageProfile = {
  code: 'fr',
  wordOrder: 'SVO',
  keywords: {
    test: { primary: 'test' },
    given: { primary: 'soit' },
    when: { primary: 'quand' },
    expect: { primary: 'attendre' },
    after: { primary: 'apres' },
    not: { primary: 'pas' },
  },
};

// =============================================================================
// Turkish (SOV)
// =============================================================================

export const turkishProfile: PatternGenLanguageProfile = {
  code: 'tr',
  wordOrder: 'SOV',
  keywords: {
    test: { primary: 'test' },
    given: { primary: 'verilen' },
    when: { primary: 'eylem' },
    expect: { primary: 'bekle' },
    after: { primary: 'sonra' },
    not: { primary: 'degil' },
  },
};

// =============================================================================
// All Profiles
// =============================================================================

export const allProfiles = [
  englishProfile,
  spanishProfile,
  japaneseProfile,
  arabicProfile,
  koreanProfile,
  chineseProfile,
  frenchProfile,
  turkishProfile,
];
