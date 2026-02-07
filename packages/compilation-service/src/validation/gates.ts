/**
 * Validation pipeline.
 *
 * Sequential gates that validate a parsed SemanticNode before compilation.
 * Each gate can add diagnostics; errors block compilation.
 */

import type { Diagnostic } from '../types.js';

// =============================================================================
// Dynamic imports
// =============================================================================

/** Semantic validation functions, injected by CompilationService.create() */
export interface ValidationFunctions {
  validateSemanticResult: (result: unknown) => {
    valid: boolean;
    errors: Array<{ code: string; message: string; role?: string; severity: string }>;
    warnings: Array<{ code: string; message: string; role?: string; severity: string }>;
    confidenceAdjustment: number;
    suggestions: string[];
  };
}

let _validators: ValidationFunctions | null = null;

/** Initialize with validation functions. */
export function initValidation(validators: ValidationFunctions): void {
  _validators = validators;
}

// =============================================================================
// Validation Pipeline
// =============================================================================

export interface GateResult {
  pass: boolean;
  diagnostics: Diagnostic[];
  adjustedConfidence: number;
}

/**
 * Run all validation gates on a parsed semantic node.
 */
export function runValidationGates(
  node: unknown,
  confidence: number,
  confidenceThreshold: number
): GateResult {
  const diagnostics: Diagnostic[] = [];
  let adjustedConfidence = confidence;

  // Gate 1: Parse success
  if (!node) {
    diagnostics.push({
      severity: 'error',
      code: 'PARSE_FAILED',
      message: 'No semantic node produced from input.',
    });
    return { pass: false, diagnostics, adjustedConfidence: 0 };
  }

  // Gate 2: Confidence threshold
  if (confidence < confidenceThreshold) {
    diagnostics.push({
      severity: 'error',
      code: 'LOW_CONFIDENCE',
      message: `Parse confidence ${confidence.toFixed(2)} is below threshold ${confidenceThreshold.toFixed(2)}.`,
      suggestion: 'Try explicit syntax [command role:value ...] for unambiguous input.',
    });
    return { pass: false, diagnostics, adjustedConfidence: confidence };
  }

  // Gate 3: Schema validation
  if (_validators) {
    const semanticResult = nodeToParseResult(node);
    if (semanticResult) {
      const validation = _validators.validateSemanticResult(semanticResult);

      // Convert errors
      for (const err of validation.errors) {
        diagnostics.push({
          severity: 'error',
          code: err.code,
          message: err.message,
        });
      }

      // Convert warnings
      for (const warn of validation.warnings) {
        diagnostics.push({
          severity: 'warning',
          code: warn.code,
          message: warn.message,
        });
      }

      // Add suggestions
      for (const suggestion of validation.suggestions) {
        diagnostics.push({
          severity: 'info',
          code: 'SUGGESTION',
          message: suggestion,
        });
      }

      // Adjust confidence
      adjustedConfidence = Math.max(0, Math.min(1, confidence + validation.confidenceAdjustment));

      if (!validation.valid) {
        return { pass: false, diagnostics, adjustedConfidence };
      }
    }
  }

  return { pass: true, diagnostics, adjustedConfidence };
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Convert a SemanticNode to the SemanticParseResult format expected by
 * validateSemanticResult(). The validator expects { action, arguments, confidence }.
 */
function nodeToParseResult(node: unknown): unknown {
  const n = node as {
    kind?: string;
    action?: string;
    roles?: ReadonlyMap<string, unknown>;
  };

  if (!n.action) return null;

  // For event handlers, validate the body commands instead
  const action = n.action === 'on' ? null : n.action;
  if (!action) return null;

  // Convert roles map to arguments array
  const args: unknown[] = [];
  if (n.roles && typeof n.roles.entries === 'function') {
    for (const [role, value] of n.roles.entries()) {
      args.push({ role, ...(value as Record<string, unknown>) });
    }
  }

  return {
    action,
    arguments: args,
    confidence: 1.0,
  };
}
