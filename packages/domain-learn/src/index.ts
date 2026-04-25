/**
 * @lokascript/domain-learn — Multilingual Learning DSL
 *
 * A learning domain built on @lokascript/framework that formalizes
 * the morphology engine: 15 verbs x 10 languages x 7 communicative
 * functions, with sentence generation, interlinear glosses, and
 * cross-language rendering.
 *
 * Unlike domain-sql (natural language -> SQL), domain-learn's "compiled
 * output" IS natural language sentences with morphology applied. The
 * standard CodeGenerator.generate() returns the commanding form in English.
 * The extended generateForFunction() powers the exercise engine.
 *
 * @example
 * ```typescript
 * import { createLearnDSL } from '@lokascript/domain-learn';
 *
 * const learn = createLearnDSL();
 *
 * // Parse multilingual command input
 * const node = learn.parse('add .active to #button', 'en');
 *
 * // Generate sentence in any language x function
 * import { generateForFunction } from '@lokascript/domain-learn';
 * generateForFunction(node, 'narrating', 'ja');
 * // -> { sentence: 'システムは #buttonに .activeを 追加しました', ... }
 *
 * // Cross-language translation
 * learn.translate('add .active to #button', 'en', 'ja');
 *
 * // Interlinear gloss
 * import { generateGloss } from '@lokascript/domain-learn';
 * generateGloss(node, 'commanding', 'ja');
 * // -> { tokens: ['#buttonに', '.activeを', '追加して'], roles: ['DEST', 'PAT', 'VERB'], ... }
 * ```
 */

import { createMultilingualDSL, type MultilingualDSL } from '@lokascript/framework';
import { allSchemas } from './schemas';
import {
  ALL_PROFILES,
  enProfile,
  jaProfile,
  esProfile,
  arProfile,
  zhProfile,
  koProfile,
  frProfile,
  trProfile,
  deProfile,
  ptProfile,
} from './profiles';
import {
  EnglishLearnTokenizer,
  JapaneseLearnTokenizer,
  SpanishLearnTokenizer,
  ArabicLearnTokenizer,
  ChineseLearnTokenizer,
  KoreanLearnTokenizer,
  FrenchLearnTokenizer,
  TurkishLearnTokenizer,
  GermanLearnTokenizer,
  PortugueseLearnTokenizer,
} from './tokenizers';
import { learnCodeGenerator, registerProfile } from './generators/sentence-generator';

/**
 * Create a multilingual learning DSL instance with all 10 supported languages.
 * Also registers all language profiles with the sentence generator.
 */
export function createLearnDSL(): MultilingualDSL {
  // Register all profiles with the sentence generator
  for (const [code, profile] of Object.entries(ALL_PROFILES)) {
    registerProfile(code, profile);
  }

  return createMultilingualDSL({
    name: 'Learn',
    schemas: allSchemas,
    languages: [
      {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        tokenizer: EnglishLearnTokenizer,
        patternProfile: enProfile.patternProfile,
      },
      {
        code: 'ja',
        name: 'Japanese',
        nativeName: '日本語',
        tokenizer: JapaneseLearnTokenizer,
        patternProfile: jaProfile.patternProfile,
      },
      {
        code: 'es',
        name: 'Spanish',
        nativeName: 'Español',
        tokenizer: SpanishLearnTokenizer,
        patternProfile: esProfile.patternProfile,
      },
      {
        code: 'ar',
        name: 'Arabic',
        nativeName: 'العربية',
        tokenizer: ArabicLearnTokenizer,
        patternProfile: arProfile.patternProfile,
      },
      {
        code: 'zh',
        name: 'Chinese',
        nativeName: '中文',
        tokenizer: ChineseLearnTokenizer,
        patternProfile: zhProfile.patternProfile,
      },
      {
        code: 'ko',
        name: 'Korean',
        nativeName: '한국어',
        tokenizer: KoreanLearnTokenizer,
        patternProfile: koProfile.patternProfile,
      },
      {
        code: 'fr',
        name: 'French',
        nativeName: 'Français',
        tokenizer: FrenchLearnTokenizer,
        patternProfile: frProfile.patternProfile,
      },
      {
        code: 'tr',
        name: 'Turkish',
        nativeName: 'Türkçe',
        tokenizer: TurkishLearnTokenizer,
        patternProfile: trProfile.patternProfile,
      },
      {
        code: 'de',
        name: 'German',
        nativeName: 'Deutsch',
        tokenizer: GermanLearnTokenizer,
        patternProfile: deProfile.patternProfile,
      },
      {
        code: 'pt',
        name: 'Portuguese',
        nativeName: 'Português',
        tokenizer: PortugueseLearnTokenizer,
        patternProfile: ptProfile.patternProfile,
      },
    ],
    codeGenerator: learnCodeGenerator,
  });
}

// ─── Re-exports ──────────────────────────────────────────────────

// Types
export type {
  CommunicativeFunction,
  CoreVerb,
  SemanticRole,
  VerbValence,
  CommandProfile,
  SentenceFrame,
  LanguageFrames,
  RenderedSentence,
  InterlinearGloss,
  LearnLanguageProfile,
  EnglishForms,
  JapaneseForms,
  SpanishForms,
  ArabicForms,
  ChineseForms,
  KoreanForms,
  FrenchForms,
  TurkishForms,
  GermanForms,
  PortugueseForms,
  AnyForms,
} from './types';

export { ALL_FUNCTIONS, ALL_VERBS } from './types';

// Schemas
export { allSchemas } from './schemas';

// Profiles
export {
  ALL_PROFILES,
  enProfile,
  jaProfile,
  esProfile,
  arProfile,
  zhProfile,
  koProfile,
  frProfile,
  trProfile,
  deProfile,
  ptProfile,
} from './profiles';

// Tokenizers
export {
  EnglishLearnTokenizer,
  JapaneseLearnTokenizer,
  SpanishLearnTokenizer,
  ArabicLearnTokenizer,
  ChineseLearnTokenizer,
  KoreanLearnTokenizer,
  FrenchLearnTokenizer,
  TurkishLearnTokenizer,
  GermanLearnTokenizer,
  PortugueseLearnTokenizer,
} from './tokenizers';

// Generators
export {
  learnCodeGenerator,
  generateForFunction,
  generateAllFunctions,
  generateCrossLingual,
  registerProfile,
  getProfile,
  resolveMarker,
  attachMarker,
} from './generators/sentence-generator';

export { renderLearn } from './generators/learn-renderer';
export { generateGloss } from './generators/gloss-generator';

// Domain scan config (for AOT / Vite plugin integration)
export const learnScanConfig = {
  attributes: ['data-learn', '_learn'] as const,
  scriptTypes: ['text/learn-dsl'] as const,
  defaultLanguage: 'en',
};
