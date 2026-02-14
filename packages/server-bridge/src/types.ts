// =============================================================================
// Core Data Model
// =============================================================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * A server route extracted from hyperscript/htmx/fixi attributes.
 */
export interface RouteDescriptor {
  /** URL path pattern, e.g., "/api/users/:id" */
  path: string;
  /** HTTP method */
  method: HttpMethod;
  /** Inferred response format */
  responseFormat: 'json' | 'text' | 'html';
  /** Where this route was discovered */
  source: RouteSource;
  /** Inferred request body shape (for POST/PUT/PATCH) */
  requestBody?: RequestBodyField[];
  /** Path parameters extracted from URL */
  pathParams: string[];
  /** Suggested handler function name */
  handlerName: string;
  /** Convention-engine notes */
  notes: string[];
}

export interface RouteSource {
  /** Absolute file path */
  file: string;
  /** Line number (1-indexed) */
  line?: number;
  /** How the route was detected */
  kind: 'fetch' | 'hx-attr' | 'fx-attr';
  /** Original source text */
  raw: string;
}

export interface RequestBodyField {
  /** Field name from form input name="" attribute */
  name: string;
  /** Inferred type from input type="" attribute */
  type: 'string' | 'number' | 'boolean' | 'file' | 'unknown';
  /** Whether the field has the required attribute */
  required: boolean;
}

// =============================================================================
// Scan Results
// =============================================================================

export interface ScanResult {
  /** All extracted routes */
  routes: RouteDescriptor[];
  /** Files that were scanned */
  filesScanned: string[];
  /** Errors during scanning */
  errors: ScanError[];
}

export interface ScanError {
  file: string;
  line?: number;
  message: string;
}

// =============================================================================
// Generator Types
// =============================================================================

export interface GeneratorOptions {
  /** Output directory for generated files */
  outputDir: string;
  /** Whether to use TypeScript (default: true) */
  typescript?: boolean;
  /** Overwrite existing user code (default: false) */
  overwrite?: boolean;
  /** Base path prefix to strip from routes */
  basePath?: string;
}

export interface GeneratedFile {
  /** Relative path within outputDir */
  path: string;
  /** File content */
  content: string;
  /** Whether this is a new file or regenerated */
  isNew: boolean;
}

export interface GenerateResult {
  /** Generated files */
  files: GeneratedFile[];
  /** Routes with preserved user code */
  preserved: string[];
  /** Warnings */
  warnings: string[];
}

// =============================================================================
// Config
// =============================================================================

export interface ServerBridgeConfig {
  /** Target framework */
  framework?: 'express' | 'hono';
  /** Output directory */
  output?: string;
  /** TypeScript output */
  typescript?: boolean;
  /** File include patterns */
  include?: string[];
  /** File exclude patterns */
  exclude?: string[];
  /** Base path prefix to strip */
  basePath?: string;
  /** Convention overrides */
  conventions?: {
    defaultResponseFormat?: 'json' | 'html' | 'text';
    fetchMethod?: HttpMethod;
    formMethod?: HttpMethod;
  };
  /** URL patterns to ignore */
  ignore?: string[];
}
