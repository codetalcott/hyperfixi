/**
 * Confidence-Aware Disambiguation
 *
 * When parse confidence is borderline (between low and high thresholds),
 * generates a disambiguation request with alternative interpretations
 * instead of blindly accepting or rejecting.
 */

import type { SemanticNode } from '../core/types';
import { renderExplicit } from '../ir/explicit-renderer';
import type { DisambiguationRequest, DisambiguationCandidate } from './types';

// =============================================================================
// Public API
// =============================================================================

/**
 * Check whether a confidence score falls in the disambiguation range.
 *
 * @returns true if the confidence is ambiguous (between low and high thresholds)
 */
export function needsDisambiguation(
  confidence: number,
  low: number = 0.5,
  high: number = 0.7
): boolean {
  return confidence >= low && confidence < high;
}

/**
 * Build a disambiguation request from candidate interpretations.
 *
 * @param input - The original ambiguous input
 * @param candidates - Alternative interpretations with confidence scores
 */
export function buildDisambiguation(
  input: string,
  candidates: ReadonlyArray<{
    action: string;
    confidence: number;
    node: SemanticNode;
    description?: string;
  }>
): DisambiguationRequest {
  const sortedCandidates = [...candidates].sort((a, b) => b.confidence - a.confidence);

  const disambiguationCandidates: DisambiguationCandidate[] = sortedCandidates.map((c, i) => ({
    action: c.action,
    confidence: c.confidence,
    explicit: renderExplicit(c.node),
    description: c.description || `${c.action} (option ${String.fromCharCode(97 + i)})`,
  }));

  const optionLines = disambiguationCandidates.map(
    (c, i) =>
      `  (${String.fromCharCode(97 + i)}) ${c.explicit} — ${c.description} (conf: ${c.confidence.toFixed(2)})`
  );

  const question = [
    `Your input parsed with confidence ${sortedCandidates[0]?.confidence.toFixed(2) ?? '?'}.`,
    ...optionLines,
    'Which did you mean?',
  ].join('\n');

  return {
    input,
    candidates: disambiguationCandidates,
    question,
  };
}
