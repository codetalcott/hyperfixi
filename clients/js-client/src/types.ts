/**
 * TypeScript definitions for LokaScript JavaScript client
 */

// Core Configuration Types
export interface ClientConfig {
  /** Base URL of the LokaScript service */
  baseURL: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Number of retry attempts */
  retries?: number;
  /** Authentication token */
  authToken?: string;
  /** Custom headers */
  headers?: Record<string, string>;
}

export interface ParseContext {
  /** Template variables for {{variable}} substitution */
  templateVars?: Record<string, any>;
  /** Source locale for internationalization */
  sourceLocale?: string;
  /** Target locale for internationalization */
  targetLocale?: string;
  /** Whether to preserve original script alongside compiled version */
  preserveOriginal?: boolean;
}

export type CompatibilityMode = 'modern' | 'legacy';

export interface CompilationOptions {
  /** Whether to minify the compiled JavaScript */
  minify?: boolean;
  /** JavaScript compatibility mode */
  compatibility?: CompatibilityMode;
  /** Whether to generate source maps */
  sourceMap?: boolean;
  /** Whether to enable optimization */
  optimization?: boolean;
  /** Template variables (can be overridden by ParseContext) */
  templateVars?: Record<string, any>;
}

// Request Types
export interface CompileRequest {
  /** Map of script names to hyperscript code */
  scripts: Record<string, string>;
  /** Compilation options */
  options?: CompilationOptions;
  /** Parse context for template processing */
  context?: ParseContext;
}

export interface ValidateRequest {
  /** Hyperscript code to validate */
  script: string;
  /** Parse context for template processing */
  context?: ParseContext;
}

export interface ScriptDefinition {
  /** Unique identifier for the script */
  id: string;
  /** Hyperscript code */
  script: string;
  /** Compilation options for this script */
  options?: CompilationOptions;
  /** Parse context for this script */
  context?: ParseContext;
}

export interface BatchCompileRequest {
  /** Array of script definitions to compile */
  definitions: ScriptDefinition[];
}

// Response Types
export interface ScriptMetadata {
  /** Complexity score of the script */
  complexity: number;
  /** List of dependencies detected */
  dependencies: string[];
  /** CSS selectors found in the script */
  selectors: string[];
  /** Events that trigger the script */
  events: string[];
  /** Commands used in the script */
  commands: string[];
  /** Template variables found in the script */
  templateVariables: string[];
}

export interface Timings {
  /** Total compilation time in milliseconds */
  total: number;
  /** Parse time in milliseconds */
  parse: number;
  /** Compile time in milliseconds */
  compile: number;
  /** Cache operation time in milliseconds */
  cache: number;
}

export interface CompilationWarning {
  /** Warning type */
  type: string;
  /** Warning message */
  message: string;
  /** Line number (optional) */
  line?: number;
  /** Column number (optional) */
  column?: number;
}

export interface CompilationError {
  /** Error type */
  type: string;
  /** Error message */
  message: string;
  /** Line number */
  line: number;
  /** Column number */
  column: number;
}

export interface CompileResponse {
  /** Map of script names to compiled JavaScript */
  compiled: Record<string, string>;
  /** Map of script names to metadata */
  metadata: Record<string, ScriptMetadata>;
  /** Compilation timing information */
  timings: Timings;
  /** Compilation warnings */
  warnings: CompilationWarning[];
  /** Compilation errors */
  errors: CompilationError[];
}

export interface ValidateResponse {
  /** Whether the script is valid */
  valid: boolean;
  /** Validation errors */
  errors: CompilationError[];
  /** Validation warnings */
  warnings: CompilationWarning[];
  /** Script metadata (if valid) */
  metadata?: ScriptMetadata;
}

// Service Types
export interface CacheStats {
  /** Number of cache hits */
  hits: number;
  /** Number of cache misses */
  misses: number;
  /** Cache hit ratio (0-1) */
  hitRatio: number;
  /** Current cache size */
  size: number;
  /** Maximum cache size */
  maxSize: number;
}

export interface HealthStatus {
  /** Service status */
  status: string;
  /** Service version */
  version: string;
  /** Service uptime in milliseconds */
  uptime: number;
  /** Cache statistics */
  cache: CacheStats;
  /** Timestamp of health check */
  timestamp: Date;
}

// Express Integration Types
export interface ExpressMiddlewareConfig {
  /** LokaScript client instance */
  client: HyperfixiClient;
  /** Whether to compile hyperscript in HTML responses */
  compileOnResponse?: boolean;
  /** Header name for template variables */
  templateVarsHeader?: string;
  /** Default compilation options */
  compilationOptions?: CompilationOptions;
  /** Error handler function */
  errorHandler?: (req: any, res: any, error: Error) => void;
  /** Paths to skip processing */
  skipPaths?: string[];
  /** Only process specific content types */
  onlyContentTypes?: string[];
}

export interface TemplateHelpers {
  /** Compile hyperscript and return onclick attribute */
  compileHyperscript(script: string, templateVars?: Record<string, any>): Promise<string>;
  /** Compile hyperscript with custom options */
  compileHyperscriptWithOptions(
    script: string, 
    templateVars?: Record<string, any>, 
    options?: CompilationOptions
  ): Promise<string>;
  /** Validate hyperscript syntax */
  validateHyperscript(script: string): Promise<boolean>;
}

// Client Interface
export interface HyperfixiClient {
  // Core compilation methods
  compile(request: CompileRequest): Promise<CompileResponse>;
  compileScript(script: string, options?: CompilationOptions): Promise<{ compiled: string; metadata: ScriptMetadata }>;
  compileWithTemplateVars(
    scripts: Record<string, string>,
    templateVars: Record<string, any>,
    options?: CompilationOptions
  ): Promise<CompileResponse>;

  // Validation methods
  validate(request: ValidateRequest): Promise<ValidateResponse>;
  validateScript(script: string): Promise<{ valid: boolean; errors: CompilationError[] }>;

  // Batch processing
  batchCompile(request: BatchCompileRequest): Promise<CompileResponse>;

  // Service management
  health(): Promise<HealthStatus>;
  cacheStats(): Promise<CacheStats>;
  clearCache(): Promise<void>;
}

// Helpers

/**
 * Returns the inline event handler attribute name (e.g. "onclick", "onsubmit")
 * for a compiled script based on its metadata. Falls back to "onclick" when no
 * event information is available.
 */
export function eventAttribute(meta: ScriptMetadata | undefined): string {
  if (meta && meta.events && meta.events.length > 0) {
    return 'on' + meta.events[0];
  }
  return 'onclick';
}

/**
 * Escapes a string for safe inclusion inside an HTML attribute value.
 */
export function escapeAttrValue(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Error Types
export class HyperfixiError extends Error {
  public readonly statusCode: number | undefined;
  public readonly originalError: Error | undefined;

  constructor(message: string, statusCode?: number, originalError?: Error) {
    super(message);
    this.name = 'HyperfixiError';
    this.statusCode = statusCode;
    this.originalError = originalError;
  }
}

export class NetworkError extends HyperfixiError {
  constructor(message: string, originalError?: Error) {
    super(message, undefined, originalError);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends HyperfixiError {
  constructor(message: string, statusCode = 400) {
    super(message, statusCode);
    this.name = 'ValidationError';
  }
}

export class CompilationFailedError extends HyperfixiError {
  public readonly errors: CompilationError[];

  constructor(message: string, errors: CompilationError[], statusCode = 400) {
    super(message, statusCode);
    this.name = 'CompilationFailedError';
    this.errors = errors;
  }
}