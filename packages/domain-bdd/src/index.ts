/**
 * @lokascript/domain-bdd — Multilingual BDD Specification Domain
 *
 * A behavior-driven development domain built on @lokascript/framework.
 * Parses Given/When/Then specifications in English, Spanish, Japanese,
 * or Arabic, and compiles them to Playwright test code.
 *
 * @example
 * ```typescript
 * import { createBDDDSL, parseBDDScenario } from '@lokascript/domain-bdd';
 *
 * const bdd = createBDDDSL();
 *
 * // Parse a single step
 * const step = bdd.parse('given #button is exists', 'en');
 *
 * // Compile a single step
 * const result = bdd.compile('when click on #button', 'en');
 * // → { ok: true, code: "  await page.locator('#button').click();" }
 *
 * // Parse a full scenario (multi-step)
 * const scenario = parseBDDScenario(
 *   'given #button is exists, when click on #button, then #button has .active',
 *   'en'
 * );
 * ```
 */

import { createMultilingualDSL, type MultilingualDSL } from '@lokascript/framework';
import { allSchemas, givenSchema, whenSchema, thenSchema, andSchema } from './schemas/index.js';
import {
  englishProfile,
  spanishProfile,
  japaneseProfile,
  arabicProfile,
  koreanProfile,
  chineseProfile,
  turkishProfile,
  frenchProfile,
} from './profiles/index.js';
import {
  EnglishBDDTokenizer,
  SpanishBDDTokenizer,
  JapaneseBDDTokenizer,
  ArabicBDDTokenizer,
  KoreanBDDTokenizer,
  ChineseBDDTokenizer,
  TurkishBDDTokenizer,
  FrenchBDDTokenizer,
} from './tokenizers/index.js';
import { bddCodeGenerator } from './generators/playwright-generator.js';
import {
  parseBDDScenario as parseScenarioImpl,
  parseBDDFeature as parseFeatureImpl,
  type ScenarioParseResult,
  type FeatureParseResult,
} from './parser/scenario-parser.js';

/**
 * Create a multilingual BDD DSL instance with all 8 supported languages.
 */
export function createBDDDSL(): MultilingualDSL {
  return createMultilingualDSL({
    name: 'BDD',
    schemas: allSchemas,
    languages: [
      {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        tokenizer: new EnglishBDDTokenizer(),
        patternProfile: englishProfile,
      },
      {
        code: 'es',
        name: 'Spanish',
        nativeName: 'Español',
        tokenizer: new SpanishBDDTokenizer(),
        patternProfile: spanishProfile,
      },
      {
        code: 'ja',
        name: 'Japanese',
        nativeName: '日本語',
        tokenizer: new JapaneseBDDTokenizer(),
        patternProfile: japaneseProfile,
      },
      {
        code: 'ar',
        name: 'Arabic',
        nativeName: 'العربية',
        tokenizer: new ArabicBDDTokenizer(),
        patternProfile: arabicProfile,
      },
      {
        code: 'ko',
        name: 'Korean',
        nativeName: '한국어',
        tokenizer: new KoreanBDDTokenizer(),
        patternProfile: koreanProfile,
      },
      {
        code: 'zh',
        name: 'Chinese',
        nativeName: '中文',
        tokenizer: new ChineseBDDTokenizer(),
        patternProfile: chineseProfile,
      },
      {
        code: 'tr',
        name: 'Turkish',
        nativeName: 'Türkçe',
        tokenizer: new TurkishBDDTokenizer(),
        patternProfile: turkishProfile,
      },
      {
        code: 'fr',
        name: 'French',
        nativeName: 'Français',
        tokenizer: new FrenchBDDTokenizer(),
        patternProfile: frenchProfile,
      },
    ],
    codeGenerator: bddCodeGenerator,
  });
}

/**
 * Parse a full BDD scenario (multiple Given/When/Then steps).
 * Splits on language-specific delimiters and resolves 'and' continuations.
 */
export function parseBDDScenario(input: string, language: string): ScenarioParseResult {
  const dsl = createBDDDSL();
  return parseScenarioImpl(dsl, input, language);
}

/**
 * Parse a full BDD Feature block with Background and multiple Scenarios.
 */
export function parseBDDFeature(input: string, language: string): FeatureParseResult {
  const dsl = createBDDDSL();
  return parseFeatureImpl(dsl, input, language);
}

// Re-export schemas for consumers who want to extend
export { allSchemas, givenSchema, whenSchema, thenSchema, andSchema };
export {
  englishProfile,
  spanishProfile,
  japaneseProfile,
  arabicProfile,
  koreanProfile,
  chineseProfile,
  turkishProfile,
  frenchProfile,
} from './profiles/index.js';
export { bddCodeGenerator, generateFeature } from './generators/playwright-generator.js';
export { renderBDD } from './generators/bdd-renderer.js';
export {
  EnglishBDDTokenizer,
  SpanishBDDTokenizer,
  JapaneseBDDTokenizer,
  ArabicBDDTokenizer,
  KoreanBDDTokenizer,
  ChineseBDDTokenizer,
  TurkishBDDTokenizer,
  FrenchBDDTokenizer,
} from './tokenizers/index.js';
export type { ScenarioParseResult, FeatureParseResult } from './parser/scenario-parser.js';

// =============================================================================
// Domain Scan Config (for AOT / Vite plugin integration)
// =============================================================================

/** HTML attribute and script-type patterns for AOT scanning */
export const bddScanConfig = {
  attributes: ['data-bdd', '_bdd'] as const,
  scriptTypes: ['text/bdd'] as const,
  defaultLanguage: 'en',
};
