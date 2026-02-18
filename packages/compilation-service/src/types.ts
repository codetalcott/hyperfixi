/**
 * Types for the Compilation Service.
 *
 * Three input formats converge to a single compilation pipeline:
 * - Natural language hyperscript (24 languages)
 * - Explicit syntax: [toggle patient:.active destination:#btn]
 * - LLM JSON: { action: "toggle", roles: { patient: { type: "selector", value: ".active" } } }
 */

// =============================================================================
// Input Types
// =============================================================================

/**
 * Compilation request — provide exactly one of: code, explicit, or semantic.
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
  /** Optimization level: 0=none, 1=basic, 2=full (default 2) */
  optimization?: 0 | 1 | 2;
  /** Output module format (default 'esm') */
  target?: 'esm' | 'iife';
  /** Minify output (default false) */
  minify?: boolean;
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
}

// =============================================================================
// LLM JSON Format
// =============================================================================

/**
 * Structured semantic representation for LLM output.
 * This is the "reliable input format" — no parsing ambiguity.
 */
export interface SemanticJSON {
  /** Command name (e.g., "toggle", "add", "set", "put") */
  action: string;
  /** Semantic roles mapping */
  roles: Record<string, SemanticJSONValue>;
  /** Event trigger (for event handlers) */
  trigger?: {
    event: string;
    modifiers?: Record<string, unknown>;
  };
}

/**
 * A typed value in a semantic role.
 */
export interface SemanticJSONValue {
  /** Value type */
  type: 'selector' | 'literal' | 'reference' | 'expression';
  /** The value */
  value: string | number | boolean;
}

// =============================================================================
// Response Types
// =============================================================================

/**
 * Compilation response.
 */
export interface CompileResponse {
  /** Whether compilation succeeded */
  ok: boolean;

  /** Compiled JavaScript (on success) */
  js?: string;
  /** Runtime helpers needed by the compiled code */
  helpers?: string[];
  /** Output size in bytes */
  size?: number;

  /** Normalized semantic representation (always present on success) */
  semantic?: SemanticJSON;
  /** Parse confidence (natural language input only) */
  confidence?: number;

  /** Errors, warnings, and info messages */
  diagnostics: Diagnostic[];
}

/**
 * Validation-only response (no compilation).
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
  /** How to load hyperscript in the test (default 'runtime') */
  executionMode?: 'runtime' | 'compiled';
  /** Override auto-generated test name */
  testName?: string;
  /** Path to LokaScript bundle (runtime mode) */
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
  /** Maximum cache entries (default 500, 0 to disable) */
  cacheSize?: number;
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
