/**
 * LLM Language Profiles
 *
 * Pattern generation profiles for 8 supported languages.
 * Covers SVO (EN, ES, ZH, FR), SOV (JA, KO, TR), and VSO (AR) word orders.
 *
 * Role markers are specified via markerOverride on each schema role.
 * Profile roleMarkers are used only when positional defaults need overriding.
 */

import type { PatternGenLanguageProfile } from '@lokascript/framework';

// =============================================================================
// English (SVO)
// =============================================================================

export const englishProfile: PatternGenLanguageProfile = {
  code: 'en',
  wordOrder: 'SVO',
  keywords: {
    ask: { primary: 'ask' },
    summarize: { primary: 'summarize' },
    analyze: { primary: 'analyze' },
    translate: { primary: 'translate' },
  },
};

// =============================================================================
// Spanish (SVO)
// =============================================================================

export const spanishProfile: PatternGenLanguageProfile = {
  code: 'es',
  wordOrder: 'SVO',
  keywords: {
    ask: { primary: 'preguntar' },
    summarize: { primary: 'resumir' },
    analyze: { primary: 'analizar' },
    translate: { primary: 'traducir' },
  },
};

// =============================================================================
// Japanese (SOV)
// =============================================================================

export const japaneseProfile: PatternGenLanguageProfile = {
  code: 'ja',
  wordOrder: 'SOV',
  keywords: {
    ask: { primary: '聞く' },
    summarize: { primary: '要約' },
    analyze: { primary: '分析' },
    translate: { primary: '翻訳' },
  },
  roleMarkers: {
    // 'として' (as) marks manner — acts as prefix in SOV position
    manner: { primary: 'として', position: 'before' },
    // 'で' (in/by) marks quantity — acts as prefix in SOV
    quantity: { primary: 'で', position: 'before' },
  },
};

// =============================================================================
// Arabic (VSO)
// =============================================================================

export const arabicProfile: PatternGenLanguageProfile = {
  code: 'ar',
  wordOrder: 'VSO',
  keywords: {
    ask: { primary: 'اسأل' },
    summarize: { primary: 'لخّص' },
    analyze: { primary: 'حلّل' },
    translate: { primary: 'ترجم' },
  },
};

// =============================================================================
// Korean (SOV)
// =============================================================================

export const koreanProfile: PatternGenLanguageProfile = {
  code: 'ko',
  wordOrder: 'SOV',
  keywords: {
    ask: { primary: '질문' },
    summarize: { primary: '요약' },
    analyze: { primary: '분석' },
    translate: { primary: '번역' },
  },
};

// =============================================================================
// Chinese (SVO)
// =============================================================================

export const chineseProfile: PatternGenLanguageProfile = {
  code: 'zh',
  wordOrder: 'SVO',
  keywords: {
    ask: { primary: '提问' },
    summarize: { primary: '总结' },
    analyze: { primary: '分析' },
    translate: { primary: '翻译' },
  },
};

// =============================================================================
// Turkish (SOV)
// =============================================================================

export const turkishProfile: PatternGenLanguageProfile = {
  code: 'tr',
  wordOrder: 'SOV',
  keywords: {
    ask: { primary: 'sor' },
    summarize: { primary: 'özetle' },
    analyze: { primary: 'çözümle' },
    translate: { primary: 'çevir' },
  },
};

// =============================================================================
// French (SVO)
// =============================================================================

export const frenchProfile: PatternGenLanguageProfile = {
  code: 'fr',
  wordOrder: 'SVO',
  keywords: {
    ask: { primary: 'demander' },
    summarize: { primary: 'résumer' },
    analyze: { primary: 'analyser' },
    translate: { primary: 'traduire' },
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
  turkishProfile,
  frenchProfile,
];
