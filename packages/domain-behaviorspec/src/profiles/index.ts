/**
 * BehaviorSpec Language Profiles
 *
 * Pattern generation profiles for each supported language.
 * These define keyword translations and word order for pattern generation.
 *
 * MVP: 4 languages covering all 3 word orders (SVO, SOV, VSO).
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
// All Profiles
// =============================================================================

export const allProfiles = [englishProfile, spanishProfile, japaneseProfile, arabicProfile];
