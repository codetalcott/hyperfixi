/**
 * @lokascript/domain-jsx — Multilingual JSX DSL
 *
 * A proof-of-generality JSX/React domain built on @lokascript/framework.
 * Parses JSX component descriptions written in 8 languages (EN, ES, JA, AR,
 * KO, ZH, TR, FR), demonstrating that the framework supports SVO, SOV, and
 * VSO word orders for UI component DSLs.
 *
 * @example
 * ```typescript
 * import { createJSXDSL } from '@lokascript/domain-jsx';
 *
 * const jsx = createJSXDSL();
 *
 * // English (SVO)
 * jsx.compile('element div with className "app"', 'en');
 *
 * // Japanese (SOV)
 * jsx.compile('count 0 初期値 状態', 'ja');
 *
 * // Korean (SOV)
 * jsx.compile('count 0 초기값 상태', 'ko');
 *
 * // Chinese (SVO)
 * jsx.compile('状态 count 初始 0', 'zh');
 * ```
 */

import { createMultilingualDSL, type MultilingualDSL } from '@lokascript/framework';
import {
  allSchemas,
  elementSchema,
  componentSchema,
  renderSchema,
  stateSchema,
  effectSchema,
  fragmentSchema,
} from './schemas';
import {
  englishProfile,
  spanishProfile,
  japaneseProfile,
  arabicProfile,
  koreanProfile,
  chineseProfile,
  turkishProfile,
  frenchProfile,
} from './profiles';
import {
  EnglishJSXTokenizer,
  SpanishJSXTokenizer,
  JapaneseJSXTokenizer,
  ArabicJSXTokenizer,
  KoreanJSXTokenizer,
  ChineseJSXTokenizer,
  TurkishJSXTokenizer,
  FrenchJSXTokenizer,
} from './tokenizers';
import { jsxCodeGenerator, createJSXCodeGenerator } from './generators/jsx-generator';

/**
 * Create a multilingual JSX DSL instance with all 8 supported languages.
 */
export function createJSXDSL(): MultilingualDSL {
  return createMultilingualDSL({
    name: 'JSX',
    schemas: allSchemas,
    languages: [
      {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        tokenizer: EnglishJSXTokenizer,
        patternProfile: englishProfile,
      },
      {
        code: 'es',
        name: 'Spanish',
        nativeName: 'Español',
        tokenizer: SpanishJSXTokenizer,
        patternProfile: spanishProfile,
      },
      {
        code: 'ja',
        name: 'Japanese',
        nativeName: '日本語',
        tokenizer: JapaneseJSXTokenizer,
        patternProfile: japaneseProfile,
      },
      {
        code: 'ar',
        name: 'Arabic',
        nativeName: 'العربية',
        tokenizer: ArabicJSXTokenizer,
        patternProfile: arabicProfile,
      },
      {
        code: 'ko',
        name: 'Korean',
        nativeName: '한국어',
        tokenizer: KoreanJSXTokenizer,
        patternProfile: koreanProfile,
      },
      {
        code: 'zh',
        name: 'Chinese',
        nativeName: '中文',
        tokenizer: ChineseJSXTokenizer,
        patternProfile: chineseProfile,
      },
      {
        code: 'tr',
        name: 'Turkish',
        nativeName: 'Türkçe',
        tokenizer: TurkishJSXTokenizer,
        patternProfile: turkishProfile,
      },
      {
        code: 'fr',
        name: 'French',
        nativeName: 'Français',
        tokenizer: FrenchJSXTokenizer,
        patternProfile: frenchProfile,
      },
    ],
    codeGenerator: jsxCodeGenerator,
  });
}

// Re-export schemas for consumers who want to extend
export {
  allSchemas,
  elementSchema,
  componentSchema,
  renderSchema,
  stateSchema,
  effectSchema,
  fragmentSchema,
};
export {
  englishProfile,
  spanishProfile,
  japaneseProfile,
  arabicProfile,
  koreanProfile,
  chineseProfile,
  turkishProfile,
  frenchProfile,
} from './profiles';
export { jsxCodeGenerator, createJSXCodeGenerator } from './generators/jsx-generator';
export { renderJSX } from './generators/jsx-renderer';
export {
  EnglishJSXTokenizer,
  SpanishJSXTokenizer,
  JapaneseJSXTokenizer,
  ArabicJSXTokenizer,
  KoreanJSXTokenizer,
  ChineseJSXTokenizer,
  TurkishJSXTokenizer,
  FrenchJSXTokenizer,
} from './tokenizers';

// =============================================================================
// Domain Scan Config (for AOT / Vite plugin integration)
// =============================================================================

/** HTML attribute and script-type patterns for AOT scanning */
export const jsxScanConfig = {
  attributes: ['data-jsx', '_jsx'] as const,
  scriptTypes: ['text/jsx-dsl'] as const,
  defaultLanguage: 'en',
};
