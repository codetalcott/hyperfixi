/**
 * Rule registry — runs all enabled rules and aggregates findings.
 */

import type { DomainLintInput, LintFinding, LintRule } from '../types';
import { schemaStructureRule } from './schema-rules';

/**
 * All rules in execution order. Phase 1: R1+R2 only (schema structure).
 * Phase 2 adds R5-R7; phase 3 adds R8-R10.
 */
export const ALL_RULES: readonly LintRule[] = [schemaStructureRule];

export function runRules(input: DomainLintInput): LintFinding[] {
  const findings: LintFinding[] = [];
  for (const rule of ALL_RULES) {
    findings.push(...rule(input));
  }
  return findings;
}
