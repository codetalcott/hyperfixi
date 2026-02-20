/**
 * @lokascript/domain-flow — Declarative Reactive Data Flow DSL
 *
 * A multilingual data flow domain built on @lokascript/framework.
 * Parses data flow commands written in 8 languages, compiling to
 * vanilla JS (fetch, EventSource, setInterval) or HTMX attributes.
 *
 * @example
 * ```typescript
 * import { createFlowDSL } from '@lokascript/domain-flow';
 *
 * const flow = createFlowDSL();
 *
 * // English (SVO)
 * flow.compile('fetch /api/users as json into #user-list', 'en');
 * // → { ok: true, code: "fetch('/api/users').then(r => r.json())..." }
 *
 * // Spanish (SVO)
 * flow.compile('obtener /api/users como json en #user-list', 'es');
 *
 * // Japanese (SOV)
 * flow.compile('/api/users json で 取得', 'ja');
 *
 * // Arabic (VSO)
 * flow.compile('جلب /api/users ك json في #user-list', 'ar');
 *
 * // Korean (SOV)
 * flow.compile('/api/users json 로 가져오기', 'ko');
 *
 * // Chinese (SVO)
 * flow.compile('获取 /api/users 以 json 到 #user-list', 'zh');
 *
 * // Turkish (SOV)
 * flow.compile('/api/users json olarak getir', 'tr');
 *
 * // French (SVO)
 * flow.compile('récupérer /api/users comme json dans #user-list', 'fr');
 * ```
 */

import { createMultilingualDSL, type MultilingualDSL } from '@lokascript/framework';
import {
  allSchemas,
  fetchSchema,
  pollSchema,
  streamSchema,
  submitSchema,
  transformSchema,
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
  EnglishFlowTokenizer,
  SpanishFlowTokenizer,
  JapaneseFlowTokenizer,
  ArabicFlowTokenizer,
  KoreanFlowTokenizer,
  ChineseFlowTokenizer,
  TurkishFlowTokenizer,
  FrenchFlowTokenizer,
} from './tokenizers/index.js';
import { flowCodeGenerator } from './generators/flow-generator.js';

/**
 * Create a multilingual FlowScript DSL instance with all 8 supported languages.
 */
export function createFlowDSL(): MultilingualDSL {
  return createMultilingualDSL({
    name: 'FlowScript',
    schemas: allSchemas,
    languages: [
      {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        tokenizer: EnglishFlowTokenizer,
        patternProfile: englishProfile,
      },
      {
        code: 'es',
        name: 'Spanish',
        nativeName: 'Español',
        tokenizer: SpanishFlowTokenizer,
        patternProfile: spanishProfile,
      },
      {
        code: 'ja',
        name: 'Japanese',
        nativeName: '日本語',
        tokenizer: JapaneseFlowTokenizer,
        patternProfile: japaneseProfile,
      },
      {
        code: 'ar',
        name: 'Arabic',
        nativeName: 'العربية',
        tokenizer: ArabicFlowTokenizer,
        patternProfile: arabicProfile,
      },
      {
        code: 'ko',
        name: 'Korean',
        nativeName: '한국어',
        tokenizer: KoreanFlowTokenizer,
        patternProfile: koreanProfile,
      },
      {
        code: 'zh',
        name: 'Chinese',
        nativeName: '中文',
        tokenizer: ChineseFlowTokenizer,
        patternProfile: chineseProfile,
      },
      {
        code: 'tr',
        name: 'Turkish',
        nativeName: 'Türkçe',
        tokenizer: TurkishFlowTokenizer,
        patternProfile: turkishProfile,
      },
      {
        code: 'fr',
        name: 'French',
        nativeName: 'Français',
        tokenizer: FrenchFlowTokenizer,
        patternProfile: frenchProfile,
      },
    ],
    codeGenerator: flowCodeGenerator,
  });
}

// Re-export schemas for consumers who want to extend
export { allSchemas, fetchSchema, pollSchema, streamSchema, submitSchema, transformSchema };
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
export { flowCodeGenerator, toFlowSpec, parseDuration } from './generators/flow-generator.js';
export { renderFlow } from './generators/flow-renderer.js';
export { generateHTMX } from './generators/htmx-generator.js';
export { extractRoute, extractRoutes } from './generators/route-extractor.js';
export { parseFlowPipeline, compilePipeline } from './parser/pipeline-parser.js';
export type { HTMXAttributes } from './generators/htmx-generator.js';
export type { FlowRouteDescriptor } from './generators/route-extractor.js';
export type { PipelineStep, PipelineParseResult } from './parser/pipeline-parser.js';
export {
  EnglishFlowTokenizer,
  SpanishFlowTokenizer,
  JapaneseFlowTokenizer,
  ArabicFlowTokenizer,
  KoreanFlowTokenizer,
  ChineseFlowTokenizer,
  TurkishFlowTokenizer,
  FrenchFlowTokenizer,
} from './tokenizers/index.js';
export type { FlowSpec, FlowAction } from './types.js';

// =============================================================================
// Domain Scan Config (for AOT / Vite plugin integration)
// =============================================================================

/** HTML attribute and script-type patterns for AOT scanning */
export const flowScanConfig = {
  attributes: ['data-flow', '_flow'] as const,
  scriptTypes: ['text/flowscript'] as const,
  defaultLanguage: 'en',
};
