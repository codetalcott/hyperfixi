/**
 * @lokascript/domain-llm — Multilingual LLM Prompt DSL
 *
 * A natural language interface for LLM interactions built on @lokascript/framework.
 * Parses commands written in 4 languages and generates LLMPromptSpec objects
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
} from './profiles/index.js';
import {
  EnglishLLMTokenizer,
  SpanishLLMTokenizer,
  JapaneseLLMTokenizer,
  ArabicLLMTokenizer,
} from './tokenizers/index.js';
import { llmCodeGenerator } from './generators/llm-generator.js';

/**
 * Create a multilingual LLM DSL instance with all 4 supported languages.
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
} from './profiles/index.js';
export { llmCodeGenerator } from './generators/llm-generator.js';
export { renderLLM } from './generators/llm-renderer.js';
export {
  EnglishLLMTokenizer,
  SpanishLLMTokenizer,
  JapaneseLLMTokenizer,
  ArabicLLMTokenizer,
} from './tokenizers/index.js';
export type { LLMPromptSpec, LLMMessage, LLMModelPreferences, LLMAction } from './types.js';
