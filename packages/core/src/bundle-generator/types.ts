/**
 * Bundle Generator Types
 *
 * Type definitions for the bundle generator system.
 */

/**
 * Validation options for bundle generation
 */
export interface ValidationOptions {
  /** Throw on unknown commands/blocks instead of warning (default: false) */
  strict?: boolean;
}

/**
 * Validation error details
 */
export interface ValidationError {
  /** Type of validation error */
  type: 'unknown-command' | 'unknown-block';

  /** Human-readable error message */
  message: string;

  /** The problematic command or block name */
  name: string;
}

/**
 * Configuration for generating a custom bundle
 */
export interface BundleConfig {
  /** Bundle name (used in comments and version string) */
  name: string;

  /** List of commands to include */
  commands: string[];

  /** List of block types to include (if, repeat, for, while, fetch) */
  blocks?: string[];

  /** Output file path (used for computing import paths in CLI mode) */
  output?: string;

  /** Enable htmx integration (auto-process after htmx:afterSettle) */
  htmxIntegration?: boolean;

  /** Global variable name (default: 'hyperfixi') */
  globalName?: string;

  /** Include positional expressions (first, last, next, closest, parent) */
  positionalExpressions?: boolean;
}

/**
 * Options for code generation (extends BundleConfig with generation-specific options)
 */
export interface GeneratorOptions extends BundleConfig {
  /** Import path for parser modules (default: '../parser/hybrid') */
  parserImportPath?: string;

  /** Whether to include auto-initialization code */
  autoInit?: boolean;

  /** Whether to export as ES module */
  esModule?: boolean;

  /** Output format: 'ts' for TypeScript, 'js' for JavaScript (default: 'ts') */
  format?: 'ts' | 'js';

  /** Validation options */
  validation?: ValidationOptions;

  /** Maximum loop iterations for blocks (default: 1000) */
  maxLoopIterations?: number;
}

/**
 * Result of bundle generation
 */
export interface GeneratedBundle {
  /** Generated TypeScript/JavaScript code */
  code: string;

  /** List of commands included */
  commands: string[];

  /** List of blocks included */
  blocks: string[];

  /** Whether positional expressions are included */
  positional: boolean;

  /** Warnings generated during bundle creation */
  warnings: string[];

  /** Validation errors (in strict mode, these would have thrown) */
  errors: ValidationError[];
}
