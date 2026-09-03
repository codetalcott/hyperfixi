/**
 * Input normalization.
 *
 * Converts any input format (natural language, explicit syntax, LLM JSON)
 * to a SemanticNode for downstream validation and compilation.
 */

import type { CompileRequest, NormalizeResult, SemanticJSON, Diagnostic } from '../types.js';
import { detectFormat } from './detect.js';
import { validateProtocolJSON, fromProtocolJSON } from '@lokascript/framework';

// =============================================================================
// Dynamic imports (resolved at service creation time)
// =============================================================================

/** Semantic package functions, injected by CompilationService.create() */
export interface SemanticFunctions {
  parseSemantic: (
    code: string,
    language: string
  ) => { node: unknown; confidence: number; error?: string };
  parseExplicit: (input: string) => unknown;
  isExplicitSyntax: (input: string) => boolean;
}

let _semantic: SemanticFunctions | null = null;

/** Initialize with semantic package functions. */
export function initNormalizer(semantic: SemanticFunctions): void {
  _semantic = semantic;
}

// =============================================================================
// Normalization
// =============================================================================

/**
 * Normalize any input format to a SemanticNode.
 */
export function normalize(request: CompileRequest): NormalizeResult {
  if (!_semantic) {
    throw new Error('Normalizer not initialized. Call initNormalizer() first.');
  }

  // Determine which input format we're working with
  if (request.semantic) {
    return normalizeJSON(request.semantic);
  }

  const input = request.code ?? request.explicit;
  if (!input) {
    return {
      node: null,
      confidence: 0,
      format: 'natural',
      diagnostics: [
        {
          severity: 'error',
          code: 'NO_INPUT',
          message: 'No input provided. Supply one of: code, explicit, or semantic.',
        },
      ],
    };
  }

  const format = request.explicit ? 'explicit' : detectFormat(input);

  switch (format) {
    case 'explicit':
      return normalizeExplicit(input);
    case 'json':
      return normalizeJSON(JSON.parse(input.trim()) as SemanticJSON);
    case 'natural':
      return normalizeNatural(input, request.language ?? 'en');
  }
}

// =============================================================================
// Format-Specific Normalization
// =============================================================================

/** Shape of the diagnostics the semantic parser attaches to its nodes. */
interface NodeDiagnostic {
  severity?: string;
  code?: string;
  message?: string;
}

/**
 * Lift warning/error diagnostics off the parsed node into the response.
 *
 * The semantic parser deliberately parses leniently — it records problems as
 * node-level diagnostics instead of failing (e.g. `unconsumed-input` when
 * `add .x #el` drops `#el` and the destination silently defaults to `me`,
 * hoisted to the top node from any depth). Until 2026-08 this function never
 * read them, so `validate()` reported ok with ZERO diagnostics for parses the
 * parser itself had flagged — the agent-bench probe measured 18/37 plausible
 * phrasings misbehaving with nothing for the validate/repair loop to react to
 * (arc 3b, AGENT_ERA_ROADMAP.md). `info` entries stay behind: they are match
 * commentary ("pattern matched: …"), not actionable signal.
 */
function liftNodeDiagnostics(node: unknown, diagnostics: Diagnostic[]): void {
  const nodeDiags = (node as { diagnostics?: NodeDiagnostic[] }).diagnostics;
  if (!Array.isArray(nodeDiags)) return;
  for (const d of nodeDiags) {
    if (d.severity !== 'warning' && d.severity !== 'error') continue;
    const diag: Diagnostic = {
      severity: d.severity,
      // Parser codes are kebab-case; this surface uses UPPER_SNAKE (PARSE_ERROR &c).
      code: (d.code ?? 'PARSE_DIAGNOSTIC').replace(/-/g, '_').toUpperCase(),
      message: d.message ?? 'parser diagnostic',
    };
    if (d.code === 'unconsumed-input') {
      diag.suggestion =
        'Dropped tokens were parsed but bound to no role — usually a missing role ' +
        "marker (e.g. 'to'/'on'/'from' before the target), so the role fell back to " +
        'a default like `me`. Compare the returned roles against your intent.';
    }
    diagnostics.push(diag);
  }
}

function normalizeNatural(code: string, language: string): NormalizeResult {
  const diagnostics: Diagnostic[] = [];

  try {
    const result = _semantic!.parseSemantic(code, language);

    if (result.error) {
      diagnostics.push({
        severity: 'error',
        code: 'PARSE_ERROR',
        message: result.error,
      });
    }

    if (!result.node) {
      diagnostics.push({
        severity: 'error',
        code: 'PARSE_FAILED',
        message: `Failed to parse "${code}" as ${language} hyperscript.`,
        suggestion: 'Check syntax or try explicit syntax: [command role:value ...]',
      });
      return { node: null, confidence: result.confidence, format: 'natural', diagnostics };
    }

    liftNodeDiagnostics(result.node, diagnostics);

    return {
      node: result.node,
      confidence: result.confidence,
      format: 'natural',
      diagnostics,
    };
  } catch (error) {
    diagnostics.push({
      severity: 'error',
      code: 'PARSE_EXCEPTION',
      message: error instanceof Error ? error.message : String(error),
    });
    return { node: null, confidence: 0, format: 'natural', diagnostics };
  }
}

function normalizeExplicit(input: string): NormalizeResult {
  const diagnostics: Diagnostic[] = [];

  try {
    const node = _semantic!.parseExplicit(input);
    return {
      node,
      confidence: 1.0,
      format: 'explicit',
      diagnostics,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const hasRoleGuidance =
      message.includes('Valid roles') || message.includes('Missing required role');
    diagnostics.push({
      severity: 'error',
      code: 'EXPLICIT_PARSE_ERROR',
      message,
      suggestion: hasRoleGuidance
        ? undefined
        : 'Use format: [command role:value ...] e.g. [toggle patient:.active]. Use get_command_docs(command) to see valid roles.',
    });
    return { node: null, confidence: 0, format: 'explicit', diagnostics };
  }
}

function normalizeJSON(input: SemanticJSON): NormalizeResult {
  // Validate structure (unified protocol JSON validator accepts optional kind + trigger)
  const validationErrors = validateProtocolJSON(input);
  if (validationErrors.some(d => d.severity === 'error')) {
    return {
      node: null,
      confidence: 0,
      format: 'json',
      diagnostics: validationErrors,
    };
  }

  // Convert to SemanticNode (unified path accepts optional kind + trigger)
  const node = fromProtocolJSON(input as any);
  return {
    node,
    confidence: 1.0,
    format: 'json',
    diagnostics: validationErrors, // May contain warnings
  };
}
