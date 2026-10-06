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
  semantic?: SemanticJSON;
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
// Test Generation Types
// =============================================================================

/**
 * Test generation request.
 */
export interface TestRequest {
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

  /** Test framework to target (default 'playwright') */
  framework?: string;
  /** Override auto-generated test name */
  testName?: string;
  /** Path to the hyperscript bundle (default: @hyperfixi/engine's hyperfixi-hs.js) */
  bundlePath?: string;
}

/**
 * Test generation response.
 */
export interface TestResponse {
  /** Whether test generation succeeded */
  ok: boolean;
  /** Generated test files */
  tests: GeneratedTestOutput[];
  /** Raw abstract operations (for introspection) */
  operations: import('./operations/types.js').AbstractOperation[];
  /** Normalized semantic representation */
  semantic?: SemanticJSON;
  /** Diagnostics */
  diagnostics: Diagnostic[];
}

/**
 * A single generated test output.
 */
export interface GeneratedTestOutput {
  /** Test name */
  name: string;
  /** Full test file content */
  code: string;
  /** HTML fixture */
  html: string;
  /** Target framework */
  framework: string;
}

// =============================================================================
// Component Generation Types
// =============================================================================

/**
 * Component generation request.
 */
export interface ComponentRequest {
  /** Natural language hyperscript (requires `language`) */
  code?: string;
  /** Explicit syntax: [command role:value ...] */
  explicit?: string;
  /** LLM JSON — structured semantic representation */
  semantic?: SemanticJSON;

  /** ISO 639-1 language code (required for `code`) */
  language?: string;
  /** Minimum confidence for natural language parsing (default 0.7) */
  confidence?: number;

  /** Target framework (default 'react') */
  framework?: string;
  /** Override auto-generated component name */
  componentName?: string;
  /** TypeScript output (default true) */
  typescript?: boolean;
}

/**
 * Component generation response.
 */
export interface ComponentResponse {
  /** Whether generation succeeded */
  ok: boolean;
  /** Generated component */
  component?: {
    /** Component name */
    name: string;
    /** Full component file content */
    code: string;
    /** Framework-specific reactive primitives (React hooks, Vue composables, Svelte runes) */
    hooks: string[];
    /** Target framework */
    framework: string;
  };
  /** Raw abstract operations (for introspection) */
  operations: import('./operations/types.js').AbstractOperation[];
  /** Normalized semantic representation */
  semantic?: SemanticJSON;
  /** Diagnostics */
  diagnostics: Diagnostic[];
}

// =============================================================================
// Generate Types (LSE → target output)
// =============================================================================

/**
 * Generate request — converts LSE to a target-specific output.
 *
 * Accepts LSE in bracket syntax or protocol JSON, then renders to the requested target.
 * Use the `lse_generate_with_correction` MCP tool to produce the LSE via LLM; then
 * POST the result here to get the final artifact.
 */
export interface GenerateRequest {
  /** LSE attempt — bracket syntax `[command role:value ...]` or protocol JSON string */
  lse: string;
  /**
   * Output target (required since 4.0, when the default, 'js', retired with the
   * AOT compiler):
   * - 'react'          — React component
   * - 'vue'            — Vue component
   * - 'svelte'         — Svelte component
   * - 'intent-element' — HTML snippet with `<lse-intent>` and embedded JSON
   */
  target: 'react' | 'vue' | 'svelte' | 'intent-element';
  /** Optional task description — included as a comment in intent-element output */
  task?: string;
}

/**
 * Generate response.
 */
export interface GenerateResponse {
  /** Whether generation succeeded */
  ok: boolean;
  /** Rendered output (JSX, Vue SFC, Svelte, or HTML snippet) */
  output?: string;
  /** Normalized protocol JSON (always present on success) */
  protocol?: SemanticJSON;
  /** Diagnostics from parsing and validation */
  diagnostics: Diagnostic[];
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
  /** Custom test renderers keyed by framework name (default: { playwright: PlaywrightRenderer }) */
  testRenderers?: Record<string, import('./renderers/types.js').TestRenderer>;
  /** Custom component renderers keyed by framework name (default: { react: ReactRenderer }) */
  componentRenderers?: Record<string, import('./renderers/component-types.js').ComponentRenderer>;
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
