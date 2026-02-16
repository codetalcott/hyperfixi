/**
 * Generalized AOT Type Definitions
 *
 * Types for the domain-agnostic Ahead-of-Time compilation system.
 * Any domain that provides a MultilingualDSL and CodeGenerator can use this.
 */

// =============================================================================
// Scan Configuration
// =============================================================================

/**
 * How a domain declares its HTML attribute patterns for scanning.
 */
export interface DomainScanConfig {
  /** Domain name (should match DomainDescriptor.name) */
  readonly domain: string;
  /** Attribute names to scan for (e.g., ['data-sql', '_sql']) */
  readonly attributes: readonly string[];
  /** Script tag types to scan for (e.g., ['text/sql-dsl']) */
  readonly scriptTypes?: readonly string[];
  /** Default language when not specified on element (default: 'en') */
  readonly defaultLanguage?: string;
}

// =============================================================================
// Extraction Results
// =============================================================================

/**
 * A snippet extracted from a source file, tagged with its domain.
 */
export interface ExtractedSnippet {
  /** Domain this snippet belongs to */
  readonly domain: string;
  /** The DSL code */
  readonly code: string;
  /** Language code (from element's lang attribute or default) */
  readonly language: string;
  /** Source file path */
  readonly file: string;
  /** Line number in source file (1-based) */
  readonly line: number;
  /** Column number in source file (1-based) */
  readonly column: number;
  /** Element ID if available */
  readonly elementId?: string;
  /** CSS selector for the element */
  readonly elementSelector?: string;
}

// =============================================================================
// Compilation Results
// =============================================================================

/**
 * Result of compiling a single snippet.
 */
export interface CompiledSnippet {
  /** Domain that compiled this snippet */
  readonly domain: string;
  /** Original source code */
  readonly source: string;
  /** Compiled output */
  readonly compiled: string;
  /** Source language */
  readonly language: string;
  /** Source file path */
  readonly file: string;
  /** Line number in source file */
  readonly line: number;
}

/**
 * Result of batch-compiling all snippets from a project.
 */
export interface AOTBatchResult {
  /** Successfully compiled snippets */
  readonly compiled: readonly CompiledSnippet[];
  /** Snippets that failed compilation */
  readonly errors: ReadonlyArray<{
    readonly domain: string;
    readonly source: string;
    readonly file: string;
    readonly line: number;
    readonly message: string;
  }>;
  /** Summary statistics */
  readonly stats: {
    readonly totalSnippets: number;
    readonly compiledCount: number;
    readonly errorCount: number;
    /** Number of snippets per domain */
    readonly domainBreakdown: Record<string, number>;
  };
}

// =============================================================================
// Options
// =============================================================================

/**
 * Options for the generalized AOT compiler.
 */
export interface GeneralizedAOTOptions {
  /** Minimum confidence for semantic parsing (default: 0.7) */
  readonly confidenceThreshold?: number;
  /** Continue compiling other snippets on individual errors (default: true) */
  readonly continueOnError?: boolean;
  /** Debug mode — log extraction and compilation details */
  readonly debug?: boolean;
}

/**
 * Options for generating combined output.
 */
export interface OutputOptions {
  /** Module format (default: 'esm') */
  readonly format?: 'esm' | 'cjs' | 'iife';
  /** Include source location comments (default: true) */
  readonly includeComments?: boolean;
  /** Group output by domain (default: true) */
  readonly groupByDomain?: boolean;
}
