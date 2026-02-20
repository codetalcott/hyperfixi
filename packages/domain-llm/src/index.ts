/**
 * @lokascript/domain-llm — Multilingual LLM Prompt DSL
 *
 * A natural language interface for LLM interactions built on @lokascript/framework.
 * Parses commands written in 8 languages and generates LLMPromptSpec objects
 * compatible with MCP sampling/createMessage.
 *
 * @example
 * ```typescript
 * import { createLLMDSL } from '@lokascript/domain-llm';
 *
 * const llm = createLLMDSL();
 *
 * // English (SVO)
 * const result = llm.compile('ask "What is this?" from #article as bullets', 'en');
 * // → { ok: true, code: '{ "action": "ask", "messages": [...] }' }
 *
 * // Spanish (SVO)
 * llm.compile('resumir #documento en 3 oraciones', 'es');
 *
 * // Japanese (SOV)
 * llm.compile('#article から "この記事は何について？" 聞く', 'ja');
 *
 * // Arabic (VSO)
 * llm.compile('لخّص #document في 3 جمل', 'ar');
 *
 * // Parse the spec and use it
 * if (result.ok) {
 *   const spec = JSON.parse(result.code);
 *   // spec.messages → ready for MCP sampling/createMessage
 * }
 * ```
 */

import { createMultilingualDSL, type MultilingualDSL } from '@lokascript/framework';
import {
  allSchemas,
  askSchema,
  summarizeSchema,
  analyzeSchema,
  translateSchema,
} from './schemas/index.js';
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
  EnglishLLMTokenizer,
  SpanishLLMTokenizer,
  JapaneseLLMTokenizer,
  ArabicLLMTokenizer,
  KoreanLLMTokenizer,
  ChineseLLMTokenizer,
  TurkishLLMTokenizer,
  FrenchLLMTokenizer,
} from './tokenizers/index.js';
import { llmCodeGenerator } from './generators/llm-generator.js';

/**
 * Create a multilingual LLM DSL instance with all 8 supported languages.
 */
export function createLLMDSL(): MultilingualDSL {
  return createMultilingualDSL({
    name: 'LLM',
    schemas: allSchemas,
    languages: [
      {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        tokenizer: EnglishLLMTokenizer,
        patternProfile: englishProfile,
      },
      {
        code: 'es',
        name: 'Spanish',
        nativeName: 'Español',
        tokenizer: SpanishLLMTokenizer,
        patternProfile: spanishProfile,
      },
      {
        code: 'ja',
        name: 'Japanese',
        nativeName: '日本語',
        tokenizer: JapaneseLLMTokenizer,
        patternProfile: japaneseProfile,
      },
      {
        code: 'ar',
        name: 'Arabic',
        nativeName: 'العربية',
        tokenizer: ArabicLLMTokenizer,
        patternProfile: arabicProfile,
      },
      {
        code: 'ko',
        name: 'Korean',
        nativeName: '한국어',
        tokenizer: KoreanLLMTokenizer,
        patternProfile: koreanProfile,
      },
      {
        code: 'zh',
        name: 'Chinese',
        nativeName: '中文',
        tokenizer: ChineseLLMTokenizer,
        patternProfile: chineseProfile,
      },
      {
        code: 'tr',
        name: 'Turkish',
        nativeName: 'Türkçe',
        tokenizer: TurkishLLMTokenizer,
        patternProfile: turkishProfile,
      },
      {
        code: 'fr',
        name: 'French',
        nativeName: 'Français',
        tokenizer: FrenchLLMTokenizer,
        patternProfile: frenchProfile,
      },
    ],
    codeGenerator: llmCodeGenerator,
  });
}

// Re-export for consumers who want to extend or inspect
export {
  allSchemas,
  askSchema,
  summarizeSchema,
  analyzeSchema,
  translateSchema,
} from './schemas/index.js';
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
export { llmCodeGenerator } from './generators/llm-generator.js';
export { renderLLM } from './generators/llm-renderer.js';
export {
  EnglishLLMTokenizer,
  SpanishLLMTokenizer,
  JapaneseLLMTokenizer,
  ArabicLLMTokenizer,
  KoreanLLMTokenizer,
  ChineseLLMTokenizer,
  TurkishLLMTokenizer,
  FrenchLLMTokenizer,
} from './tokenizers/index.js';
export type { LLMPromptSpec, LLMMessage, LLMModelPreferences, LLMAction } from './types.js';

// =============================================================================
// Domain Scan Config (for AOT / Vite plugin integration)
// =============================================================================

/** HTML attribute and script-type patterns for AOT scanning */
export const llmScanConfig = {
  attributes: ['data-llm', '_llm'] as const,
  scriptTypes: ['text/llm'] as const,
  defaultLanguage: 'en',
};
