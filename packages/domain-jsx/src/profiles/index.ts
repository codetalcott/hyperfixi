/**
 * JSX Language Profiles
 *
 * Pattern generation profiles for each supported language.
 * These define keyword translations and word order for pattern generation.
 *
 * Role markers are primarily specified via `markerOverride` on each
 * schema role (in schemas/index.ts). Profile-level roleMarkers are only
 * needed when the default position (SOV=after, else=before) is wrong.
 */

import type { PatternGenLanguageProfile } from '@lokascript/framework';

// =============================================================================
// English (SVO)
// =============================================================================

export const englishProfile: PatternGenLanguageProfile = {
  code: 'en',
  wordOrder: 'SVO',
  keywords: {
    element: { primary: 'element' },
    component: { primary: 'component' },
    render: { primary: 'render' },
    state: { primary: 'state' },
    effect: { primary: 'effect' },
    fragment: { primary: 'fragment' },
  },
};

// =============================================================================
// Spanish (SVO)
// =============================================================================

export const spanishProfile: PatternGenLanguageProfile = {
  code: 'es',
  wordOrder: 'SVO',
  keywords: {
    element: { primary: 'elemento' },
    component: { primary: 'componente' },
    render: { primary: 'renderizar' },
    state: { primary: 'estado' },
    effect: { primary: 'efecto' },
    fragment: { primary: 'fragmento' },
  },
};

// =============================================================================
// Japanese (SOV)
// =============================================================================

export const japaneseProfile: PatternGenLanguageProfile = {
  code: 'ja',
  wordOrder: 'SOV',
  keywords: {
    element: { primary: '要素' },
    component: { primary: 'コンポーネント' },
    render: { primary: '描画' },
    state: { primary: '状態' },
    effect: { primary: 'エフェクト' },
    fragment: { primary: 'フラグメント' },
  },
  // All markers use the default SOV 'after' (postposition) placement.
  // Role markers come from schema markerOverride.
};

// =============================================================================
// Arabic (VSO)
// =============================================================================

export const arabicProfile: PatternGenLanguageProfile = {
  code: 'ar',
  wordOrder: 'VSO',
  keywords: {
    element: { primary: 'عنصر' },
    component: { primary: 'مكوّن' },
    render: { primary: 'ارسم' },
    state: { primary: 'حالة' },
    effect: { primary: 'تأثير' },
    fragment: { primary: 'جزء' },
  },
};

// =============================================================================
// All Profiles
// =============================================================================

export const allProfiles = [englishProfile, spanishProfile, japaneseProfile, arabicProfile];
