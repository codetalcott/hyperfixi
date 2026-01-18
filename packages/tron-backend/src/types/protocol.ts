/**
 * TRON Protocol Types for HyperFixi Integration
 *
 * These types define the wire protocol between HyperFixi and TRON-enabled backends.
 * Backend implementations in any language should follow this specification.
 */

// =============================================================================
// Core Protocol Types
// =============================================================================

/**
 * TRON message header - present in all TRON-encoded messages
 */
export interface TronHeader {
  /** Magic bytes: 0x54524F4E ("TRON") */
  magic: 0x54524F4E;
  /** Protocol version */
  version: number;
  /** Feature flags */
  flags: TronFlags;
}

/**
 * Feature flags for TRON messages
 */
export enum TronFlags {
  NONE = 0,
  COMPRESSED = 1 << 0,
  STREAMING = 1 << 1,
  ENCRYPTED = 1 << 2,
  CHECKSUM = 1 << 3,
}

/**
 * Base message envelope for all TRON-HyperFixi communication
 */
export interface TronMessage<T extends TronPayloadType = TronPayloadType> {
  header: TronHeader;
  payload: TronPayload<T>;
}

// =============================================================================
// Payload Types
// =============================================================================

export type TronPayloadType =
  | 'compile'
  | 'execute'
  | 'event'
  | 'hydrate'
  | 'validate'
  | 'translate'
  | 'batch'
  | 'stream'
  | 'error';

/**
 * Type-safe payload discriminated union
 */
export type TronPayload<T extends TronPayloadType> =
  T extends 'compile' ? CompilePayload :
  T extends 'execute' ? ExecutePayload :
  T extends 'event' ? EventPayload :
  T extends 'hydrate' ? HydratePayload :
  T extends 'validate' ? ValidatePayload :
  T extends 'translate' ? TranslatePayload :
  T extends 'batch' ? BatchPayload :
  T extends 'stream' ? StreamPayload :
  T extends 'error' ? ErrorPayload :
  never;

// =============================================================================
// Compilation
// =============================================================================

export interface CompilePayload {
  type: 'compile';
  id: string;
  data: CompileRequest;
  meta?: CompileMeta;
}

export interface CompileRequest {
  /** Hyperscript source code */
  source: string;
  /** Source language (ISO 639-1 code) */
  language?: string;
  /** Compilation options */
  options?: CompileOptions;
}

export interface CompileOptions {
  /** Use semantic parser */
  semantic?: boolean;
  /** Minimum confidence threshold for semantic parsing */
  confidenceThreshold?: number;
  /** Force traditional parser */
  traditional?: boolean;
  /** Generate source maps */
  sourceMap?: boolean;
  /** Target environment */
  target?: 'browser' | 'node' | 'universal';
}

export interface CompileMeta {
  /** Parser that was used */
  parserUsed?: 'semantic' | 'traditional';
  /** Semantic parser confidence score */
  semanticConfidence?: number;
  /** Detected language */
  detectedLanguage?: string;
  /** Compilation warnings */
  warnings?: string[];
  /** Compilation time in ms */
  compileTimeMs?: number;
}

export interface CompileResult {
  /** Compiled AST (TRON-encoded) */
  ast: Uint8Array;
  /** Compilation metadata */
  meta: CompileMeta;
  /** Source map (if requested) */
  sourceMap?: string;
}

// =============================================================================
// Execution
// =============================================================================

export interface ExecutePayload {
  type: 'execute';
  id: string;
  data: ExecuteRequest;
  meta?: ExecuteMeta;
}

export interface ExecuteRequest {
  /** Pre-compiled AST (TRON-encoded) or source string */
  code: Uint8Array | string;
  /** Execution context */
  context?: ExecutionContext;
  /** Target element selector (for browser simulation) */
  target?: string;
}

export interface ExecutionContext {
  /** Local variables */
  locals?: Record<string, unknown>;
  /** Global variables */
  globals?: Record<string, unknown>;
  /** DOM state snapshot (for SSR) */
  domState?: DOMSnapshot;
  /** Request context (for server-side) */
  request?: ServerRequestContext;
}

export interface DOMSnapshot {
  /** Serialized DOM tree */
  tree: Uint8Array;
  /** Element states (classes, attributes, etc.) */
  states: Record<string, ElementState>;
}

export interface ElementState {
  classes: string[];
  attributes: Record<string, string>;
  properties: Record<string, unknown>;
  style?: Record<string, string>;
}

export interface ServerRequestContext {
  method: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body?: unknown;
}

export interface ExecuteMeta {
  /** Execution time in ms */
  executionTimeMs?: number;
  /** Commands executed */
  commandsExecuted?: number;
  /** Side effects produced */
  sideEffects?: SideEffect[];
}

export interface SideEffect {
  type: 'dom' | 'network' | 'storage' | 'console';
  action: string;
  target?: string;
  data?: unknown;
}

export interface ExecuteResult {
  /** Execution success */
  success: boolean;
  /** Return value (if any) */
  value?: unknown;
  /** Updated context */
  context?: ExecutionContext;
  /** Execution metadata */
  meta: ExecuteMeta;
}

// =============================================================================
// Events
// =============================================================================

export interface EventPayload {
  type: 'event';
  id: string;
  data: EventData;
  meta?: EventMeta;
}

export interface EventData {
  /** Event type (click, submit, etc.) */
  eventType: string;
  /** Target element selector */
  target: string;
  /** Event-specific data */
  detail?: unknown;
  /** Current execution context */
  context?: ExecutionContext;
}

export interface EventMeta {
  /** Timestamp */
  timestamp?: number;
  /** Event sequence number */
  sequence?: number;
  /** Is synthetic event */
  synthetic?: boolean;
}

// =============================================================================
// SSR Hydration
// =============================================================================

export interface HydratePayload {
  type: 'hydrate';
  id: string;
  data: HydrateRequest;
  meta?: HydrateMeta;
}

export interface HydrateRequest {
  /** Components to hydrate */
  components: HydrateComponent[];
  /** Scripts to initialize */
  scripts?: string[];
  /** Global state */
  globalState?: Record<string, unknown>;
}

export interface HydrateComponent {
  /** CSS selector for component root */
  selector: string;
  /** Component state */
  state: Record<string, unknown>;
  /** Handlers to attach */
  handlers?: HydrateHandler[];
}

export interface HydrateHandler {
  /** Event type */
  event: string;
  /** Hyperscript code */
  script: string;
  /** Pre-compiled AST (optional) */
  ast?: Uint8Array;
}

export interface HydrateMeta {
  /** Hydration strategy */
  strategy?: 'eager' | 'lazy' | 'visible' | 'idle';
  /** Priority (0-100) */
  priority?: number;
}

export interface HydrateResult {
  /** Hydration script for client */
  script: string;
  /** TRON-encoded state blob */
  stateBlob: Uint8Array;
  /** Size metrics */
  metrics: {
    stateSize: number;
    scriptSize: number;
    componentCount: number;
  };
}

// =============================================================================
// Validation
// =============================================================================

export interface ValidatePayload {
  type: 'validate';
  id: string;
  data: ValidateRequest;
}

export interface ValidateRequest {
  /** Source code to validate */
  source: string;
  /** Source language */
  language?: string;
  /** Strict mode */
  strict?: boolean;
}

export interface ValidateResult {
  /** Is valid */
  valid: boolean;
  /** Validation errors */
  errors: ValidationError[];
  /** Validation warnings */
  warnings: ValidationWarning[];
}

export interface ValidationError {
  message: string;
  line?: number;
  column?: number;
  code?: string;
}

export interface ValidationWarning {
  message: string;
  line?: number;
  column?: number;
  code?: string;
}

// =============================================================================
// Translation
// =============================================================================

export interface TranslatePayload {
  type: 'translate';
  id: string;
  data: TranslateRequest;
}

export interface TranslateRequest {
  /** Source code */
  source: string;
  /** Source language */
  fromLanguage: string;
  /** Target language */
  toLanguage: string;
}

export interface TranslateResult {
  /** Translated code */
  translated: string;
  /** Translation confidence */
  confidence: number;
  /** Untranslatable segments (if any) */
  untranslatable?: string[];
}

// =============================================================================
// Batch Operations
// =============================================================================

export interface BatchPayload {
  type: 'batch';
  id: string;
  data: BatchRequest;
}

export interface BatchRequest {
  /** Operations to execute */
  operations: Array<
    | CompilePayload
    | ExecutePayload
    | ValidatePayload
    | TranslatePayload
  >;
  /** Execute in parallel */
  parallel?: boolean;
  /** Stop on first error */
  stopOnError?: boolean;
}

export interface BatchResult {
  /** Results for each operation */
  results: Array<{
    id: string;
    success: boolean;
    result?: unknown;
    error?: ErrorPayload;
  }>;
  /** Batch execution time */
  totalTimeMs: number;
}

// =============================================================================
// Streaming
// =============================================================================

export interface StreamPayload {
  type: 'stream';
  id: string;
  data: StreamData;
}

export interface StreamData {
  /** Stream action */
  action: 'start' | 'data' | 'end' | 'error';
  /** Stream channel ID */
  channelId: string;
  /** Chunk data (for 'data' action) */
  chunk?: Uint8Array;
  /** Sequence number */
  sequence?: number;
}

// =============================================================================
// Errors
// =============================================================================

export interface ErrorPayload {
  type: 'error';
  id: string;
  data: ErrorData;
}

export interface ErrorData {
  /** Error code */
  code: TronErrorCode;
  /** Human-readable message */
  message: string;
  /** Stack trace (development only) */
  stack?: string;
  /** Related request ID */
  requestId?: string;
  /** Additional context */
  context?: Record<string, unknown>;
}

export enum TronErrorCode {
  // Protocol errors (1xxx)
  INVALID_MESSAGE = 1000,
  UNSUPPORTED_VERSION = 1001,
  INVALID_PAYLOAD_TYPE = 1002,
  CHECKSUM_MISMATCH = 1003,

  // Compilation errors (2xxx)
  PARSE_ERROR = 2000,
  SYNTAX_ERROR = 2001,
  UNSUPPORTED_LANGUAGE = 2002,
  SEMANTIC_PARSE_FAILED = 2003,

  // Execution errors (3xxx)
  RUNTIME_ERROR = 3000,
  TIMEOUT = 3001,
  CONTEXT_ERROR = 3002,
  PERMISSION_DENIED = 3003,

  // Validation errors (4xxx)
  VALIDATION_FAILED = 4000,

  // Server errors (5xxx)
  INTERNAL_ERROR = 5000,
  SERVICE_UNAVAILABLE = 5001,
  RATE_LIMITED = 5002,
}

// =============================================================================
// Content-Type Negotiation
// =============================================================================

export const TRON_CONTENT_TYPE = 'application/tron';
export const JSON_CONTENT_TYPE = 'application/json';

export interface ContentNegotiation {
  /** Preferred format */
  preferred: 'tron' | 'json';
  /** Accepted formats in preference order */
  accepted: Array<'tron' | 'json'>;
  /** Quality values */
  quality: Record<string, number>;
}

/**
 * Parse Accept header for TRON content negotiation
 */
export function parseAcceptHeader(accept: string): ContentNegotiation {
  const parts = accept.split(',').map(p => p.trim());
  const accepted: Array<'tron' | 'json'> = [];
  const quality: Record<string, number> = {};

  for (const part of parts) {
    const [mediaType, ...params] = part.split(';').map(s => s.trim());
    let q = 1.0;

    for (const param of params) {
      if (param.startsWith('q=')) {
        q = parseFloat(param.slice(2)) || 1.0;
      }
    }

    if (mediaType === TRON_CONTENT_TYPE || mediaType === 'application/tron') {
      accepted.push('tron');
      quality['tron'] = q;
    } else if (mediaType === JSON_CONTENT_TYPE || mediaType === 'application/json') {
      accepted.push('json');
      quality['json'] = q;
    }
  }

  // Sort by quality
  accepted.sort((a, b) => (quality[b] || 0) - (quality[a] || 0));

  return {
    preferred: accepted[0] || 'json',
    accepted: accepted.length > 0 ? accepted : ['json'],
    quality,
  };
}
