/**
 * FlowScript Language Profiles
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
    fetch: { primary: 'fetch' },
    poll: { primary: 'poll' },
    stream: { primary: 'stream' },
    submit: { primary: 'submit' },
    transform: { primary: 'transform' },
  },
};

// =============================================================================
// Spanish (SVO)
// =============================================================================

export const spanishProfile: PatternGenLanguageProfile = {
  code: 'es',
  wordOrder: 'SVO',
  keywords: {
    fetch: { primary: 'obtener' },
    poll: { primary: 'sondear' },
    stream: { primary: 'transmitir' },
    submit: { primary: 'enviar' },
    transform: { primary: 'transformar' },
  },
};

// =============================================================================
// Japanese (SOV)
// =============================================================================

export const japaneseProfile: PatternGenLanguageProfile = {
  code: 'ja',
  wordOrder: 'SOV',
  keywords: {
    fetch: { primary: '取得' },
    poll: { primary: 'ポーリング' },
    stream: { primary: 'ストリーム' },
    submit: { primary: '送信' },
    transform: { primary: '変換' },
  },
};

// =============================================================================
// Arabic (VSO)
// =============================================================================

export const arabicProfile: PatternGenLanguageProfile = {
  code: 'ar',
  wordOrder: 'VSO',
  keywords: {
    fetch: { primary: 'جلب' },
    poll: { primary: 'استطلع' },
    stream: { primary: 'بث' },
    submit: { primary: 'أرسل' },
    transform: { primary: 'حوّل' },
  },
};

// =============================================================================
// Korean (SOV)
// =============================================================================

export const koreanProfile: PatternGenLanguageProfile = {
  code: 'ko',
  wordOrder: 'SOV',
  keywords: {
    fetch: { primary: '가져오기' },
    poll: { primary: '폴링' },
    stream: { primary: '스트리밍' },
    submit: { primary: '제출' },
    transform: { primary: '변환' },
  },
};

// =============================================================================
// Chinese (SVO)
// =============================================================================

export const chineseProfile: PatternGenLanguageProfile = {
  code: 'zh',
  wordOrder: 'SVO',
  keywords: {
    fetch: { primary: '获取' },
    poll: { primary: '轮询' },
    stream: { primary: '流式' },
    submit: { primary: '提交' },
    transform: { primary: '转换' },
  },
};

// =============================================================================
// Turkish (SOV)
// =============================================================================

export const turkishProfile: PatternGenLanguageProfile = {
  code: 'tr',
  wordOrder: 'SOV',
  keywords: {
    fetch: { primary: 'getir' },
    poll: { primary: 'yokla' },
    stream: { primary: 'aktar' },
    submit: { primary: 'gönder' },
    transform: { primary: 'dönüştür' },
  },
};

// =============================================================================
// French (SVO)
// =============================================================================

export const frenchProfile: PatternGenLanguageProfile = {
  code: 'fr',
  wordOrder: 'SVO',
  keywords: {
    fetch: { primary: 'récupérer' },
    poll: { primary: 'interroger' },
    stream: { primary: 'diffuser' },
    submit: { primary: 'soumettre' },
    transform: { primary: 'transformer' },
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
