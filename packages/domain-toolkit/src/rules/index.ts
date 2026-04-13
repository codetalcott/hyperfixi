/**
 * Rule registry — runs all enabled rules and aggregates findings.
 */

import type { DomainLintInput, LintFinding, LintRule } from '../types';
import { schemaStructureRule } from './schema-rules';
import { keywordCoverageRule } from './keyword-coverage';
import { markerTokenizationRule } from './marker-tokenization';

/**
 * All rules in execution order.
 *   Phase 1: schema structure (delegates to @lokascript/semantic)
 *   Phase 2: keyword coverage + marker tokenization
 *   Phase 3: extractor coverage, position ordering, renderer coherence (warnings)
 */
export const ALL_RULES: readonly LintRule[] = [
  schemaStructureRule,
  keywordCoverageRule,
  markerTokenizationRule,
];

export function runRules(input: DomainLintInput): LintFinding[] {
  const findings: LintFinding[] = [];
  for (const rule of ALL_RULES) {
    findings.push(...rule(input));
  }
  return findings;
}
