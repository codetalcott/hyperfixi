/**
 * @lokascript/domain-behaviorspec — Multilingual Interaction Testing Domain
 *
 * A rich interaction testing domain built on @lokascript/framework.
 * Write Playwright tests in natural language across 4 languages (EN, ES, JA, AR),
 * with support for page navigation, viewport control, user interactions,
 * assertions, timing, and negation.
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
} from './profiles/index.js';
import {
  EnglishBehaviorSpecTokenizer,
  SpanishBehaviorSpecTokenizer,
  JapaneseBehaviorSpecTokenizer,
  ArabicBehaviorSpecTokenizer,
} from './tokenizers/index.js';
import {
  behaviorspecCodeGenerator,
  generateSpec,
  generateTestBlock,
} from './generators/playwright-generator.js';
import {
  parseBehaviorSpec as parseSpecImpl,
  type SpecParseResult,
  type TestBlock,
  type InteractionBlock,
  type ExpectationNode,
} from './parser/spec-parser.js';

/**
 * Create a multilingual BehaviorSpec DSL instance with all 4 supported languages.
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
 * Compile a multi-line BehaviorSpec to a Playwright test file.
 * Returns a complete, runnable test file with imports.
 */
export function compileBehaviorSpec(input: string, language: string): string {
  const spec = parseBehaviorSpec(input, language);
  return generateSpec(spec);
}

// Re-export schemas for consumers who want to extend
export { allSchemas, testSchema, givenSchema, whenSchema, expectSchema, afterSchema, notSchema };
export {
  englishProfile,
  spanishProfile,
  japaneseProfile,
  arabicProfile,
} from './profiles/index.js';
export {
  behaviorspecCodeGenerator,
  generateSpec,
  generateTestBlock,
} from './generators/playwright-generator.js';
export { renderBehaviorSpec } from './generators/behaviorspec-renderer.js';
export {
  EnglishBehaviorSpecTokenizer,
  SpanishBehaviorSpecTokenizer,
  JapaneseBehaviorSpecTokenizer,
  ArabicBehaviorSpecTokenizer,
} from './tokenizers/index.js';
export type {
  SpecParseResult,
  TestBlock,
  InteractionBlock,
  ExpectationNode,
} from './parser/spec-parser.js';
