/**
 * Structured Error Diagnostics
 *
 * Re-exported from @lokascript/intent.
 * This module is the framework's re-export point for the diagnostic types
 * that live in the universal intent package.
 */

export type {
  DiagnosticSeverity,
  Diagnostic,
  DiagnosticResult,
  DiagnosticSummary,
  DiagnosticCollector,
  DiagnosticOptions,
} from '@lokascript/intent';

export { createDiagnosticCollector, fromError, filterBySeverity } from '@lokascript/intent';
