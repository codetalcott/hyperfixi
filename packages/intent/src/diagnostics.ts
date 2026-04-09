/**
 * Structured Error Diagnostics
 *
 * Generic diagnostic types for reporting errors, warnings, and hints
 * during parsing, validation, and compilation. These provide richer feedback
 * than simple error strings, enabling:
 *
 * - Severity levels (error, warning, info)
 * - Machine-readable error codes
 * - Source location tracking
 * - Actionable suggestions
 * - Programmatic fix lookup
 */

// =============================================================================
// Diagnostic Types
// =============================================================================

/**
 * Severity level for a diagnostic.
 */
export type DiagnosticSeverity = 'error' | 'warning' | 'info';

/**
 * A structured diagnostic message.
 *
 * Diagnostics provide rich error information beyond simple strings.
 * They're used for parser errors, validation warnings, and hints.
 */
export interface Diagnostic {
  /** Human-readable message */
  readonly message: string;

  /** Severity level */
  readonly severity: DiagnosticSeverity;

  /** Machine-readable code for programmatic handling (e.g., 'parse-error', 'missing-role') */
  readonly code?: string;

  /** 1-based line number in source */
  readonly line?: number;

  /** 0-based column offset in line */
  readonly column?: number;

  /** Original source text that triggered the diagnostic */
  readonly source?: string;

  /** Actionable suggestions for fixing the issue */
  readonly suggestions?: readonly string[];
}

/**
 * Result of a diagnostic-aware validation.
 */
export interface DiagnosticResult {
  /** Whether validation passed (no errors, though warnings/info may exist) */
  readonly ok: boolean;

  /** All diagnostics, including errors, warnings, and info */
  readonly diagnostics: readonly Diagnostic[];

  /** Convenience: count of each severity level */
  readonly summary: DiagnosticSummary;
}

/**
 * Summary counts by severity.
 */
export interface DiagnosticSummary {
  readonly errors: number;
  readonly warnings: number;
  readonly infos: number;
}

// =============================================================================
// Diagnostic Collector
// =============================================================================

/**
 * Collects diagnostics during a parsing/validation/compilation pass.
 *
 * @example
 * ```typescript
 * const collector = createDiagnosticCollector();
 * collector.error('Unknown command: foo', { code: 'unknown-command', line: 3 });
 * const result = collector.toResult();
 * ```
 */
export interface DiagnosticCollector {
  /** Message-first form: `error(message, options?)` */
  error(message: string, options?: DiagnosticOptions): void;
  /** Code-first form: `error(code, message, options?)` — useful at call sites where the code is the stable key */
  error(code: string, message: string, options?: DiagnosticOptions): void;
  warning(message: string, options?: DiagnosticOptions): void;
  info(message: string, options?: DiagnosticOptions): void;
  add(diagnostic: Diagnostic): void;
  hasErrors(): boolean;
  getDiagnostics(): readonly Diagnostic[];
  toResult(): DiagnosticResult;
}

/**
 * Options for adding a diagnostic via the collector's convenience methods.
 */
export interface DiagnosticOptions {
  readonly code?: string;
  readonly line?: number;
  readonly column?: number;
  readonly source?: string;
  readonly suggestions?: readonly string[];
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create a new diagnostic collector.
 */
export function createDiagnosticCollector(): DiagnosticCollector {
  const diagnostics: Diagnostic[] = [];

  function addWithSeverity(
    severity: DiagnosticSeverity,
    message: string,
    options?: DiagnosticOptions
  ): void {
    const diag: Diagnostic = {
      message,
      severity,
      ...(options?.code != null && { code: options.code }),
      ...(options?.line != null && { line: options.line }),
      ...(options?.column != null && { column: options.column }),
      ...(options?.source != null && { source: options.source }),
      ...(options?.suggestions != null &&
        options.suggestions.length > 0 && { suggestions: options.suggestions }),
    };
    diagnostics.push(diag);
  }

  return {
    error(
      messageOrCode: string,
      messageOrOptions?: string | DiagnosticOptions,
      options?: DiagnosticOptions
    ) {
      if (typeof messageOrOptions === 'string') {
        // Code-first form: error(code, message, options?)
        addWithSeverity('error', messageOrOptions, { ...options, code: messageOrCode });
      } else {
        // Message-first form: error(message, options?)
        addWithSeverity('error', messageOrCode, messageOrOptions);
      }
    },
    warning(message, options) {
      addWithSeverity('warning', message, options);
    },
    info(message, options) {
      addWithSeverity('info', message, options);
    },
    add(diagnostic) {
      diagnostics.push(diagnostic);
    },
    hasErrors() {
      return diagnostics.some(d => d.severity === 'error');
    },
    getDiagnostics() {
      return diagnostics;
    },
    toResult(): DiagnosticResult {
      let errors = 0;
      let warnings = 0;
      let infos = 0;
      for (const d of diagnostics) {
        if (d.severity === 'error') errors++;
        else if (d.severity === 'warning') warnings++;
        else infos++;
      }
      return {
        ok: errors === 0,
        diagnostics,
        summary: { errors, warnings, infos },
      };
    },
  };
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Create a diagnostic from an Error object.
 */
export function fromError(
  error: unknown,
  options?: Omit<DiagnosticOptions, 'code'> & { code?: string }
): Diagnostic {
  const message = error instanceof Error ? error.message : String(error);
  return {
    message,
    severity: 'error',
    ...(options?.code != null && { code: options.code }),
    ...(options?.line != null && { line: options.line }),
    ...(options?.column != null && { column: options.column }),
    ...(options?.source != null && { source: options.source }),
    ...(options?.suggestions != null &&
      options.suggestions.length > 0 && { suggestions: options.suggestions }),
  };
}

/**
 * Filter diagnostics by severity.
 */
export function filterBySeverity(
  diagnostics: readonly Diagnostic[],
  severity: DiagnosticSeverity
): readonly Diagnostic[] {
  return diagnostics.filter(d => d.severity === severity);
}
