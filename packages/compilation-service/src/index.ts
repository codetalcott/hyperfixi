/**
 * @lokascript/compilation-service
 *
 * Semantic compilation service for LokaScript.
 * Validates and compiles hyperscript from 24 languages, explicit syntax, or LLM JSON.
 */

// Main service
export { CompilationService } from './service.js';

// Types
export type {
  CompileRequest,
  CompileResponse,
  ValidationResponse,
  TranslateRequest,
  TranslateResponse,
  ServiceOptions,
  SemanticJSON,
  SemanticJSONValue,
  Diagnostic,
  InputFormat,
} from './types.js';

// Input utilities (for custom pipelines)
export { detectFormat } from './input/detect.js';
export { validateSemanticJSON, jsonToSemanticNode } from './input/json-schema.js';

// Cache (for custom configurations)
export { SemanticCache, generateCacheKey } from './compile/cache.js';
