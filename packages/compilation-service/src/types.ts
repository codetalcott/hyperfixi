/**
 * Types for the Compilation Service.
 *
 * Three input formats converge to one semantic node, which the service validates,
 * translates, diffs, scores, and renders as components and tests:
 * - Natural language hyperscript (24 languages)
 * - Explicit syntax: [toggle patient:.active destination:#btn]
 * - LLM JSON: { action: "toggle", roles: { patient: { type: "selector", value: ".active" } } }
 */

// =============================================================================
// Input Types
// =============================================================================

/**
 * Hyperscript input — provide exactly one of: code, explicit, or semantic.
 *
 * (The name is from when the service also compiled hyperscript to JavaScript,
 * through `@hyperfixi/aot-compiler`; that retired with the AOT compiler in 4.0.)
 */
export interface CompileRequest {
  /** Natural language hyperscript (requires `language`) */
  code?: string;
  /** Explicit syntax: [command role:value ...] */
  explicit?: string;
  /** LLM JSON — structured semantic representation */
  semantic?: SemanticJSON;

  /** ISO 639-1 language code (required for `code`, ignored for `explicit`/`semantic`) */
  language?: string;
  /** Minimum confidence for natural language parsing (default 0.7) */
  confidence?: number;
}

/**
 * Translation request.
 */
export interface TranslateRequest {
  /** Source code or explicit syntax */
  code: string;
  /** Source language */
  from: string;
  /** Target language */
  to: string;
  /** Verify the translation against the source via scoreFidelity (default true). */
  verify?: boolean;
}

// =============================================================================
// LLM JSON Format (re-exported from @lokascript/framework)
// =============================================================================

import type {
  SemanticJSON as _SemanticJSON,
  SemanticJSONValue as _SemanticJSONValue,
} from '@lokascript/framework/ir';
export type SemanticJSON = _SemanticJSON;
export type SemanticJSONValue = _SemanticJSONValue;

/**
 * The IR validation returns: {@link SemanticJSON} with the commands a node holds. A `then`
 * chain is `compound` with each command in `body`; an `if` has its branches in `body` and
 * `else`; a loop or a block command (`tell`, `repeat`) has its commands in `body`. Until 7.5.0
 * a chain came back as `compound` with no commands at all, so its IR could not be checked
 * against an intent.
 */
export interface SemanticIR extends SemanticJSON {
  body?: SemanticIR[];
  else?: SemanticIR[];
}

// =============================================================================
// Response Types
// =============================================================================

/**
 * Validation response.
 */
export interface ValidationResponse {
  /** Whether validation passed */
  ok: boolean;
  /** Normalized semantic representation (if parse succeeded) */
  semantic?: SemanticIR;
  /** Parse confidence */
  confidence?: number;
  /** Diagnostics */
  diagnostics: Diagnostic[];
}

/**
 * Translation response.
 */
export interface TranslateResponse {
  /** Whether translation succeeded */
  ok: boolean;
  /** Translated code */
  code?: string;
  /**
   * Fidelity verification of the translation against its source (arc 5's
   * verified-translation badge): the output scored as candidate against the
   * input as reference via scoreFidelity(). ADVISORY — a verification that
   * fails to parse never flips `ok`, and its diagnostics stay inside this
   * object. `verification.faithful === true` is the claim "this rendering is
   * structurally exact"; absent when the caller passed `verify: false` or
   * translation itself failed.
   */
  verification?: import('./scoring/score.js').ScoreResponse;
  /**
   * A refused translation (`LOSSY_TRANSLATION`): the output the translation
   * would have produced, which is NOT the whole script. Never under `code`.
   */
  partial?: string;
  /** What a refused translation loses, and which check saw it (truncation, read-back, invariant). */
  loss?: { kind: string; lost: string[] };
  /** Diagnostics */
  diagnostics: Diagnostic[];
}

/**
 * A diagnostic message (error, warning, or info).
 */
export interface Diagnostic {
  /** Severity level */
  severity: 'error' | 'warning' | 'info';
  /** Machine-readable code */
  code: string;
  /** Human-readable message */
  message: string;
  /** Suggested fix */
  suggestion?: string;
}

// =============================================================================
// Diff Types
// =============================================================================

export type {
  DiffInput,
  DiffRequest,
  DiffResponse,
  TriggerDiff,
  OperationDiff,
  OperationChangeKind,
} from './diff/types.js';

// =============================================================================
// Service Configuration
// =============================================================================

/**
 * Options for creating a CompilationService.
 */
export interface ServiceOptions {
  /** Default confidence threshold (default 0.7) */
  confidenceThreshold?: number;
}

// =============================================================================
// Internal Types
// =============================================================================

/** Detected input format */
export type InputFormat = 'natural' | 'explicit' | 'json';

/** Result of normalization — a parsed semantic node with metadata */
export interface NormalizeResult {
  /** The semantic node (from any input format) */
  node: unknown; // SemanticNode from @lokascript/semantic
  /** Parse confidence (1.0 for explicit/JSON) */
  confidence: number;
  /** Detected input format */
  format: InputFormat;
  /** Diagnostics from parsing */
  diagnostics: Diagnostic[];
}
