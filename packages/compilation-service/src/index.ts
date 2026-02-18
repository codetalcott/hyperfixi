/**
 * @lokascript/compilation-service
 *
 * Semantic compilation service for LokaScript.
 * Validates and compiles hyperscript from 24 languages, explicit syntax, or LLM JSON.
 * Generates behavior-level tests from semantic analysis.
 * Generates framework components (React, Vue, Svelte) from abstract operations.
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
  TestRequest,
  TestResponse,
  GeneratedTestOutput,
  ComponentRequest,
  ComponentResponse,
  DiffRequest,
  DiffResponse,
  DiffInput,
  TriggerDiff,
  OperationDiff,
  OperationChangeKind,
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

// Abstract operations (for custom renderers / Phase 3 codegen targets)
export type {
  AbstractOperation,
  TargetRef,
  BehaviorSpec,
  ToggleClassOp,
  AddClassOp,
  RemoveClassOp,
  SetContentOp,
  AppendContentOp,
  ShowOp,
  HideOp,
  SetVariableOp,
  IncrementOp,
  DecrementOp,
  NavigateOp,
  FetchOp,
  WaitOp,
  TriggerEventOp,
  FocusOp,
  BlurOp,
  LogOp,
} from './operations/types.js';
export { extractOperations } from './operations/extract.js';

// Diff engine (for custom pipelines)
export { diffBehaviors, canonicalizeOp } from './diff/diff.js';

// Test renderers
export { PlaywrightRenderer } from './renderers/playwright.js';
export type { TestRenderer, TestRenderOptions, GeneratedTest } from './renderers/types.js';

// Component renderers
export { ReactRenderer } from './renderers/react.js';
export { VueRenderer } from './renderers/vue.js';
export { SvelteRenderer } from './renderers/svelte.js';
export type {
  ComponentRenderer,
  ComponentRenderOptions,
  GeneratedComponent,
} from './renderers/component-types.js';
