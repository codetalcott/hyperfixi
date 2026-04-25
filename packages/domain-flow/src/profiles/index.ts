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
    enter: { primary: 'enter' },
    follow: { primary: 'follow' },
    perform: { primary: 'perform' },
    capture: { primary: 'capture' },
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
    enter: { primary: 'entrar' },
    follow: { primary: 'seguir' },
    perform: { primary: 'ejecutar' },
    capture: { primary: 'capturar' },
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
    enter: { primary: '入る' },
    follow: { primary: '辿る' },
    perform: { primary: '実行' },
    capture: { primary: '取得変数' },
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
    enter: { primary: 'ادخل' },
    follow: { primary: 'اتبع' },
    perform: { primary: 'نفّذ' },
    capture: { primary: 'التقط' },
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
    enter: { primary: '진입' },
    follow: { primary: '따라가기' },
    perform: { primary: '실행' },
    capture: { primary: '캡처' },
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
    enter: { primary: '进入' },
    follow: { primary: '跟随' },
    perform: { primary: '执行' },
    capture: { primary: '捕获' },
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
    enter: { primary: 'gir' },
    follow: { primary: 'izle' },
    perform: { primary: 'yürüt' },
    capture: { primary: 'yakala' },
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
    enter: { primary: 'entrer' },
    follow: { primary: 'suivre' },
    perform: { primary: 'exécuter' },
    capture: { primary: 'capturer' },
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
