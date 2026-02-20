/**
 * @lokascript/domain-behaviorspec — Multilingual Interaction Testing Domain
 *
 * A rich interaction testing domain built on @lokascript/framework.
 * Write Playwright tests in natural language across 8 languages (EN, ES, JA, AR, KO, ZH, FR, TR),
 * with support for page navigation, viewport control, user interactions,
 * assertions, timing, negation, and feature-level test organization.
 *
 * @example
 * ```typescript
 * import { createBehaviorSpecDSL, parseBehaviorSpec } from '@lokascript/domain-behaviorspec';
 *
 * const dsl = createBehaviorSpecDSL();
 *
 * // Parse a single command
 * const step = dsl.parse('given page /products/1', 'en');
 *
 * // Compile a single command
 * const result = dsl.compile('when user clicks on #add-to-cart', 'en');
 *
 * // Parse a full spec (multi-line)
 * const spec = parseBehaviorSpec(
 *   'test "Add to cart"\n  given page /products/1\n  when user clicks on #button\n    #toast appears',
 *   'en'
 * );
 *
 * // Parse a feature-level spec with shared setup
 * const feature = parseFeatureSpec(
 *   'feature "Shopping Cart"\n  setup\n    given page /cart\n  test "Add item"\n    when user clicks on #add\n      #toast appears',
 *   'en'
 * );
 * ```
 */

import { createMultilingualDSL, type MultilingualDSL } from '@lokascript/framework';
import {
  allSchemas,
  testSchema,
  givenSchema,
  whenSchema,
  expectSchema,
  afterSchema,
  notSchema,
} from './schemas/index.js';
import {
  englishProfile,
  spanishProfile,
  japaneseProfile,
  arabicProfile,
  koreanProfile,
  chineseProfile,
  frenchProfile,
  turkishProfile,
} from './profiles/index.js';
import {
  EnglishBehaviorSpecTokenizer,
  SpanishBehaviorSpecTokenizer,
  JapaneseBehaviorSpecTokenizer,
  ArabicBehaviorSpecTokenizer,
  KoreanBehaviorSpecTokenizer,
  ChineseBehaviorSpecTokenizer,
  FrenchBehaviorSpecTokenizer,
  TurkishBehaviorSpecTokenizer,
} from './tokenizers/index.js';
import {
  behaviorspecCodeGenerator,
  generateSpec,
  generateTestBlock,
  generateFeature,
  generateFeatureBlock,
} from './generators/playwright-generator.js';
import {
  parseBehaviorSpec as parseSpecImpl,
  parseFeature as parseFeatureImpl,
  type SpecParseResult,
  type FeatureParseResult,
  type FeatureBlock,
  type TestBlock,
  type InteractionBlock,
  type ExpectationNode,
} from './parser/spec-parser.js';

/**
 * Create a multilingual BehaviorSpec DSL instance with all 8 supported languages.
 */
export function createBehaviorSpecDSL(): MultilingualDSL {
  return createMultilingualDSL({
    name: 'BehaviorSpec',
    schemas: allSchemas,
    languages: [
      {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        tokenizer: new EnglishBehaviorSpecTokenizer(),
        patternProfile: englishProfile,
      },
      {
        code: 'es',
        name: 'Spanish',
        nativeName: 'Español',
        tokenizer: new SpanishBehaviorSpecTokenizer(),
        patternProfile: spanishProfile,
      },
      {
        code: 'ja',
        name: 'Japanese',
        nativeName: '日本語',
        tokenizer: new JapaneseBehaviorSpecTokenizer(),
        patternProfile: japaneseProfile,
      },
      {
        code: 'ar',
        name: 'Arabic',
        nativeName: 'العربية',
        tokenizer: new ArabicBehaviorSpecTokenizer(),
        patternProfile: arabicProfile,
      },
      {
        code: 'ko',
        name: 'Korean',
        nativeName: '한국어',
        tokenizer: new KoreanBehaviorSpecTokenizer(),
        patternProfile: koreanProfile,
      },
      {
        code: 'zh',
        name: 'Chinese',
        nativeName: '中文',
        tokenizer: new ChineseBehaviorSpecTokenizer(),
        patternProfile: chineseProfile,
      },
      {
        code: 'fr',
        name: 'French',
        nativeName: 'Français',
        tokenizer: new FrenchBehaviorSpecTokenizer(),
        patternProfile: frenchProfile,
      },
      {
        code: 'tr',
        name: 'Turkish',
        nativeName: 'Türkçe',
        tokenizer: new TurkishBehaviorSpecTokenizer(),
        patternProfile: turkishProfile,
      },
    ],
    codeGenerator: behaviorspecCodeGenerator,
  });
}

/**
 * Parse a multi-line BehaviorSpec into structured TestBlocks.
 * Handles indentation-based nesting with test/given/when/expect hierarchy.
 */
export function parseBehaviorSpec(input: string, language: string): SpecParseResult {
  const dsl = createBehaviorSpecDSL();
  return parseSpecImpl(dsl, input, language);
}

/**
 * Parse a multi-line BehaviorSpec with feature blocks and shared setup.
 * Returns FeatureParseResult with feature blocks and standalone tests.
 */
export function parseFeatureSpec(input: string, language: string): FeatureParseResult {
  const dsl = createBehaviorSpecDSL();
  return parseFeatureImpl(dsl, input, language);
}

/**
 * Compile a multi-line BehaviorSpec to a Playwright test file.
 * Returns a complete, runnable test file with imports.
 */
export function compileBehaviorSpec(input: string, language: string): string {
  const spec = parseBehaviorSpec(input, language);
  return generateSpec(spec);
}

/**
 * Compile a feature-level BehaviorSpec to a Playwright test file.
 * Returns a complete file with test.describe() blocks and beforeEach setup.
 */
export function compileFeatureSpec(input: string, language: string): string {
  const result = parseFeatureSpec(input, language);
  return generateFeature(result);
}

// Re-export schemas for consumers who want to extend
export { allSchemas, testSchema, givenSchema, whenSchema, expectSchema, afterSchema, notSchema };
export {
  englishProfile,
  spanishProfile,
  japaneseProfile,
  arabicProfile,
  koreanProfile,
  chineseProfile,
  frenchProfile,
  turkishProfile,
  allProfiles,
} from './profiles/index.js';
export {
  behaviorspecCodeGenerator,
  generateSpec,
  generateTestBlock,
  generateFeature,
  generateFeatureBlock,
} from './generators/playwright-generator.js';
export { renderBehaviorSpec } from './generators/behaviorspec-renderer.js';
export {
  EnglishBehaviorSpecTokenizer,
  SpanishBehaviorSpecTokenizer,
  JapaneseBehaviorSpecTokenizer,
  ArabicBehaviorSpecTokenizer,
  KoreanBehaviorSpecTokenizer,
  ChineseBehaviorSpecTokenizer,
  FrenchBehaviorSpecTokenizer,
  TurkishBehaviorSpecTokenizer,
} from './tokenizers/index.js';
export type {
  SpecParseResult,
  FeatureParseResult,
  FeatureBlock,
  TestBlock,
  InteractionBlock,
  ExpectationNode,
} from './parser/spec-parser.js';

// =============================================================================
// Domain Scan Config (for AOT / Vite plugin integration)
// =============================================================================

/** HTML attribute and script-type patterns for AOT scanning */
export const behaviorspecScanConfig = {
  attributes: ['data-spec', '_spec'] as const,
  scriptTypes: ['text/behaviorspec'] as const,
  defaultLanguage: 'en',
};
