/**
 * Pipeline Parser
 *
 * Wraps the framework's single-command DSL parser to handle multi-step
 * data flow pipelines. Splits input on arrow delimiters (→ / ->), parses
 * each step individually, and assembles a PipelineParseResult.
 */

import type { MultilingualDSL, SemanticNode } from '@lokascript/framework';
import { renderFlow } from '../generators/flow-renderer.js';

// =============================================================================
// Types
// =============================================================================

export interface PipelineStep {
  /** The semantic node from parsing a single command */
  node: SemanticNode;
}

export interface PipelineParseResult {
  /** Ordered pipeline steps */
  steps: PipelineStep[];
  /** Parse errors for any failed steps */
  errors: string[];
}

// =============================================================================
// Arrow Delimiter
// =============================================================================

/** Splits on → (Unicode) or -> (ASCII arrow), with optional surrounding whitespace */
const ARROW_DELIMITER = /\s*(?:→|->)\s*/;

// =============================================================================
// Pipeline Parser
// =============================================================================

/**
 * Parse a multi-step FlowScript pipeline into ordered steps.
 *
 * Splits input on arrow delimiters (→ / ->), parses each segment
 * via the DSL, and returns the steps in order.
 *
 * @example
 * ```
 * // Single-line arrow chain
 * parseFlowPipeline(dsl, 'fetch /api/users as json → transform data with uppercase → into #list', 'en')
 *
 * // Multi-line (newline-separated, each line is a step)
 * parseFlowPipeline(dsl, 'fetch /api/users as json\ntransform data with uppercase', 'en')
 * ```
 */
export function parseFlowPipeline(
  dsl: MultilingualDSL,
  input: string,
  language: string
): PipelineParseResult {
  const steps: PipelineStep[] = [];
  const errors: string[] = [];

  // Split on arrows first, then on newlines for any remaining multi-line segments
  const arrowParts = input.split(ARROW_DELIMITER);

  const segments: string[] = [];
  for (const part of arrowParts) {
    // Further split on newlines within each arrow-delimited part
    const lines = part
      .split(/\n/)
      .map(l => l.trim())
      .filter(Boolean);
    segments.push(...lines);
  }

  // Filter out comments (lines starting with --)
  const commands = segments.filter(s => !s.startsWith('--'));

  for (const segment of commands) {
    try {
      const node = dsl.parse(segment, language);
      steps.push({ node });
    } catch (err) {
      errors.push(
        `Failed to parse step: "${segment}" - ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return { steps, errors };
}

/**
 * Compile a pipeline to a single JS code block.
 *
 * For linear pipelines (no branching), each step's output feeds into the next
 * via Promise chaining. The first step must be a source (fetch/poll/stream),
 * middle steps can be transforms, and the last step can include a destination.
 */
export function compilePipeline(
  dsl: MultilingualDSL,
  input: string,
  language: string
): { ok: boolean; code?: string; errors: string[] } {
  const { steps, errors } = parseFlowPipeline(dsl, input, language);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  if (steps.length === 0) {
    return { ok: false, errors: ['Empty pipeline'] };
  }

  // Single step: just compile it directly
  if (steps.length === 1) {
    const result = dsl.compile(input.replace(/→|->/g, '').trim(), language);
    return {
      ok: result.ok,
      code: result.code ?? undefined,
      errors: result.ok ? [] : ['Compilation failed'],
    };
  }

  // Multi-step: compose into Promise chain
  const compileErrors: string[] = [];
  const codes: string[] = [];
  for (const step of steps) {
    const surface = renderStepBack(step.node, language);
    // An unrenderable step cannot be re-parsed, so it fails the same way a step
    // that fails to compile does.
    const result = surface === null ? null : dsl.compile(surface, language);
    if (result?.ok && result.code) {
      codes.push(result.code);
    } else {
      compileErrors.push(`Failed to compile step: ${step.node.action}`);
    }
  }

  if (compileErrors.length > 0) {
    return { ok: false, errors: compileErrors };
  }

  // Join with comment separators
  const combined = codes.join('\n\n// --- next step ---\n\n');
  return { ok: true, code: combined, errors: [] };
}

/**
 * Reconstruct a parse-able string from a SemanticNode for re-compilation.
 * Uses the natural language renderer to produce correct output with markers.
 *
 * Returns `null` when the node's action cannot be rendered.
 */
function renderStepBack(node: SemanticNode, language: string): string | null {
  return renderFlow(node, language);
}
