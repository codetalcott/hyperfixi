/**
 * LLM Language Profiles
 *
 * Pattern generation profiles for 4 supported languages (EN, ES, JA, AR).
 * Covers SVO (English, Spanish), SOV (Japanese), and VSO (Arabic) word orders.
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
// All Profiles
// =============================================================================

export const allProfiles = [englishProfile, spanishProfile, japaneseProfile, arabicProfile];
