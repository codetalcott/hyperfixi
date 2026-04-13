/**
 * @lokascript/domain-toolkit
 *
 * Lint rules for @lokascript/domain-* packages. Checks schema structure
 * and cross-file invariants (profile ↔ tokenizer ↔ schema ↔ renderer
 * agreement). Consumed by one lint test per domain — see the integration
 * pattern in packages/domain-sql/src/__test__/lint.test.ts.
 *
 * Phase 1 rules:
 *   - Schema structure (R1, R2) — delegates to @lokascript/semantic's
 *     existing validator.
 *
 * Planned rules (phase 2+):
 *   - R5: Profile keywords present in tokenizer keyword lists.
 *   - R6: Every schema command has profile keywords for all declared langs.
 *   - R7: Every markerOverride word tokenizes as a single token.
 *   - R8: Latin-script tokenizers include LatinExtendedIdentifierExtractor.
 *   - R9: Schema role positions are unique per word-order.
 *   - R10: Renderer table keywords match profile/schema translations.
 */

import { runRules } from './rules';
import type { DomainLintInput, LintResult } from './types';

export type {
  DomainLintInput,
  LintResult,
  LintFinding,
  LintRule,
  Severity,
  RendererTables,
} from './types';
export { formatResult, formatFinding } from './format';

/**
 * Lint a domain against all enabled rules and return a structured result.
 */
export function lintDomain(input: DomainLintInput): LintResult {
  const findings = runRules(input);
  const errorCount = findings.filter(f => f.severity === 'error').length;
  const warningCount = findings.filter(f => f.severity === 'warning').length;

  return {
    domain: input.name,
    findings,
    errorCount,
    warningCount,
  };
}
