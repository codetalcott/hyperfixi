/**
 * BDD Language Profiles
 *
 * Pattern generation profiles for each supported language.
 * These define keyword translations and word order for pattern generation.
 *
 * Role markers are specified via `markerOverride` on each schema role
 * (in schemas/index.ts). Profile-level roleMarkers are only needed when
 * the default position (SOV=after, else=before) is wrong.
 */

import type { PatternGenLanguageProfile } from '@lokascript/framework';

// =============================================================================
// English (SVO)
// =============================================================================

export const englishProfile: PatternGenLanguageProfile = {
  code: 'en',
  wordOrder: 'SVO',
  keywords: {
    given: { primary: 'given' },
    when: { primary: 'when' },
    then: { primary: 'then' },
    and: { primary: 'and' },
  },
};

// =============================================================================
// Spanish (SVO)
// =============================================================================

export const spanishProfile: PatternGenLanguageProfile = {
  code: 'es',
  wordOrder: 'SVO',
  keywords: {
    given: { primary: 'dado' },
    when: { primary: 'cuando' },
    then: { primary: 'entonces' },
    and: { primary: 'y' },
  },
};

// =============================================================================
// Japanese (SOV)
// =============================================================================

export const japaneseProfile: PatternGenLanguageProfile = {
  code: 'ja',
  wordOrder: 'SOV',
  keywords: {
    given: { primary: '前提' },
    when: { primary: 'したら' },
    then: { primary: 'ならば' },
    and: { primary: 'かつ' },
  },
};

// =============================================================================
// Arabic (VSO)
// =============================================================================

export const arabicProfile: PatternGenLanguageProfile = {
  code: 'ar',
  wordOrder: 'VSO',
  keywords: {
    given: { primary: 'بافتراض' },
    when: { primary: 'عند' },
    then: { primary: 'فإن' },
    and: { primary: 'و' },
  },
};

// =============================================================================
// All Profiles
// =============================================================================

export const allProfiles = [englishProfile, spanishProfile, japaneseProfile, arabicProfile];
