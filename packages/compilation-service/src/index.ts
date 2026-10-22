/**
 * @lokascript/compilation-service
 *
 * Semantic service for LokaScript.
 * Validates and translates hyperscript from 24 languages, explicit syntax, or LLM JSON.
 * Diffs two behaviors and scores a translation's fidelity. (Test and component generation were
 * removed in 6.0; `generate()` and the HTTP layer, `./http`, in 7.0.)
 */

// Main service
export { CompilationService } from './service.js';
export { VERSION } from './version.js';

// Types
export type {
  CompileRequest,
  ValidationResponse,
  TranslateRequest,
  TranslateResponse,
  DiffRequest,
  DiffResponse,
  DiffInput,
  TriggerDiff,
  OperationDiff,
  OperationChangeKind,
  ServiceOptions,
  SemanticJSON,
  SemanticJSONValue,
  SemanticIR,
  Diagnostic,
  InputFormat,
} from './types.js';

// Input utilities (for custom pipelines)
export { detectFormat } from './input/detect.js';
export { validateSemanticJSON, jsonToSemanticNode } from './input/json-schema.js';

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
  ConditionalOp,
  LoopOp,
  CommandOp,
} from './operations/types.js';
export { extractOperations } from './operations/extract.js';

// Diff engine (for custom pipelines)
export { diffBehaviors, canonicalizeOp } from './diff/diff.js';

// Fidelity scoring (agent-era arc 4) — scorers live in @lokascript/semantic/fidelity
export { scoreNodes } from './scoring/score.js';
export type {
  ScoreRequest,
  ScoreResponse,
  FidelityScores,
  FidelityReport,
} from './scoring/score.js';
