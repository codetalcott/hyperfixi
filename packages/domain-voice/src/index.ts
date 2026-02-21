/**
 * @lokascript/domain-voice — Multilingual Voice/Accessibility Commands
 *
 * A domain built on @lokascript/framework providing 14 voice/accessibility
 * commands in 8 languages covering SVO, SOV, and VSO word orders.
 * Commands compile to executable JavaScript for DOM manipulation,
 * navigation, and accessibility actions.
 *
 * @example
 * ```typescript
 * import { createVoiceDSL } from '@lokascript/domain-voice';
 *
 * const voice = createVoiceDSL();
 *
 * // English (SVO)
 * voice.compile('click submit', 'en');
 * // → executable JS that finds and clicks the submit button
 *
 * // Japanese (SOV)
 * voice.compile('送信 を クリック', 'ja');
 *
 * // Arabic (VSO)
 * voice.compile('انقر على إرسال', 'ar');
 *
 * // Navigate
 * voice.compile('navigate to home', 'en');
 *
 * // Scroll
 * voice.compile('scroll down', 'en');
 *
 * // Read aloud
 * voice.compile('read #article', 'en');
 * ```
 */

import { createMultilingualDSL, type MultilingualDSL } from '@lokascript/framework';
import { allSchemas } from './schemas/index';
import {
  enProfile,
  esProfile,
  jaProfile,
  arProfile,
  koProfile,
  zhProfile,
  trProfile,
  frProfile,
} from './profiles/index';
import {
  EnglishVoiceTokenizer,
  SpanishVoiceTokenizer,
  JapaneseVoiceTokenizer,
  ArabicVoiceTokenizer,
  KoreanVoiceTokenizer,
  ChineseVoiceTokenizer,
  TurkishVoiceTokenizer,
  FrenchVoiceTokenizer,
} from './tokenizers/index';
import { voiceCodeGenerator } from './generators/voice-generator';

/**
 * Create a multilingual voice/accessibility DSL instance with all 8 supported languages.
 */
export function createVoiceDSL(): MultilingualDSL {
  return createMultilingualDSL({
    name: 'Voice',
    schemas: allSchemas,
    languages: [
      {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        tokenizer: EnglishVoiceTokenizer,
        patternProfile: enProfile,
      },
      {
        code: 'es',
        name: 'Spanish',
        nativeName: 'Español',
        tokenizer: SpanishVoiceTokenizer,
        patternProfile: esProfile,
      },
      {
        code: 'ja',
        name: 'Japanese',
        nativeName: '日本語',
        tokenizer: JapaneseVoiceTokenizer,
        patternProfile: jaProfile,
      },
      {
        code: 'ar',
        name: 'Arabic',
        nativeName: 'العربية',
        tokenizer: ArabicVoiceTokenizer,
        patternProfile: arProfile,
      },
      {
        code: 'ko',
        name: 'Korean',
        nativeName: '한국어',
        tokenizer: KoreanVoiceTokenizer,
        patternProfile: koProfile,
      },
      {
        code: 'zh',
        name: 'Chinese',
        nativeName: '中文',
        tokenizer: ChineseVoiceTokenizer,
        patternProfile: zhProfile,
      },
      {
        code: 'tr',
        name: 'Turkish',
        nativeName: 'Türkçe',
        tokenizer: TurkishVoiceTokenizer,
        patternProfile: trProfile,
      },
      {
        code: 'fr',
        name: 'French',
        nativeName: 'Français',
        tokenizer: FrenchVoiceTokenizer,
        patternProfile: frProfile,
      },
    ],
    codeGenerator: voiceCodeGenerator,
  });
}

// Re-export schemas
export {
  allSchemas,
  navigateSchema,
  clickSchema,
  typeSchema,
  scrollSchema,
  readSchema,
  zoomSchema,
  selectSchema,
  backSchema,
  forwardSchema,
  focusSchema,
  closeSchema,
  openSchema,
  searchSchema,
  helpSchema,
} from './schemas/index';

// Re-export profiles
export {
  enProfile,
  esProfile,
  jaProfile,
  arProfile,
  koProfile,
  zhProfile,
  trProfile,
  frProfile,
  allProfiles,
} from './profiles/index';

// Re-export generators
export { voiceCodeGenerator } from './generators/voice-generator';
export { renderVoice } from './generators/voice-renderer';

// Re-export tokenizers
export {
  EnglishVoiceTokenizer,
  SpanishVoiceTokenizer,
  JapaneseVoiceTokenizer,
  ArabicVoiceTokenizer,
  KoreanVoiceTokenizer,
  ChineseVoiceTokenizer,
  TurkishVoiceTokenizer,
  FrenchVoiceTokenizer,
} from './tokenizers/index';

// Re-export types and converters
export type { VoiceActionSpec } from './types';
export { toVoiceActionSpec } from './types';

// =============================================================================
// Domain Scan Config (for AOT / Vite plugin integration)
// =============================================================================

/** HTML attribute and script-type patterns for AOT scanning */
export const voiceScanConfig = {
  attributes: ['data-voice', '_voice'] as const,
  scriptTypes: ['text/voice'] as const,
  defaultLanguage: 'en',
};
