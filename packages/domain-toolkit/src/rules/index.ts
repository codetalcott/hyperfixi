/**
 * Rule registry — runs all enabled rules and aggregates findings.
 */

import type { DomainLintInput, LintFinding, LintRule } from '../types';
import { schemaStructureRule } from './schema-rules';
import { keywordCoverageRule } from './keyword-coverage';
import { markerTokenizationRule } from './marker-tokenization';
import { extractorCoverageRule } from './extractor-coverage';
import { positionOrderingRule } from './position-ordering';

/**
 * All rules in execution order.
 *   Phase 1: schema structure (delegates to @lokascript/semantic)
 *   Phase 2: keyword coverage + marker tokenization
 *   Phase 3: extractor coverage + position ordering (warnings only)
 *   Future: R10 renderer coherence (opt-in via DomainLintInput.renderer)
 */
export const ALL_RULES: readonly LintRule[] = [
  schemaStructureRule,
  keywordCoverageRule,
  markerTokenizationRule,
  extractorCoverageRule,
  positionOrderingRule,
];

export function runRules(input: DomainLintInput): LintFinding[] {
  const findings: LintFinding[] = [];
  for (const rule of ALL_RULES) {
    findings.push(...rule(input));
  }
  return findings;
}
