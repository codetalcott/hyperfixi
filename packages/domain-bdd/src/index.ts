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
} from './profiles/index.js';
import {
  EnglishBDDTokenizer,
  SpanishBDDTokenizer,
  JapaneseBDDTokenizer,
  ArabicBDDTokenizer,
} from './tokenizers/index.js';
import { bddCodeGenerator } from './generators/playwright-generator.js';
import {
  parseBDDScenario as parseScenarioImpl,
  type ScenarioParseResult,
} from './parser/scenario-parser.js';

/**
 * Create a multilingual BDD DSL instance with all 4 supported languages.
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

// Re-export schemas for consumers who want to extend
export { allSchemas, givenSchema, whenSchema, thenSchema, andSchema };
export {
  englishProfile,
  spanishProfile,
  japaneseProfile,
  arabicProfile,
} from './profiles/index.js';
export { bddCodeGenerator } from './generators/playwright-generator.js';
export {
  EnglishBDDTokenizer,
  SpanishBDDTokenizer,
  JapaneseBDDTokenizer,
  ArabicBDDTokenizer,
} from './tokenizers/index.js';
export type { ScenarioParseResult } from './parser/scenario-parser.js';
