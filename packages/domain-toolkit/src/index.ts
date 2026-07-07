/**
 * @lokascript/domain-toolkit
 *
 * Lint rules for @lokascript/domain-* packages. Checks schema structure
 * and cross-file invariants (profile ↔ tokenizer ↔ schema ↔ renderer
 * agreement). Consumed by one lint test per domain — see the integration
 * pattern in packages/domain-sql/src/__test__/lint.test.ts.
 *
 * Implemented rules:
 *   - R1/R2 (schema-structure): delegates to @lokascript/semantic's
 *     existing validator.
 *   - R5 (keyword-classification): profile keywords/markers classify as
 *     'keyword' in the language's tokenizer.
 *   - R6 (keyword-coverage): every schema command has profile keywords for
 *     all declared languages.
 *   - R7 (marker-tokenization): every marker/keyword tokenizes as a single
 *     token.
 *   - R8 (extractor-coverage): Latin-script tokenizers handle diacritic
 *     identifiers (warning).
 *   - R9 (position-ordering): schema role positions are unique per
 *     word-order (warning).
 *   - R10 (renderer-coherence): renderer table keywords match
 *     profile/schema translations (opt-in via `renderer`).
 */

import { runRules } from './rules';
import type { DomainLintInput, LintFinding, LintResult, LintWaiver } from './types';

export type {
  DomainLintInput,
  LintResult,
  LintFinding,
  LintRule,
  LintWaiver,
  Severity,
  RendererTables,
} from './types';
export { formatResult, formatFinding } from './format';

function matchesWaiver(finding: LintFinding, waiver: LintWaiver): boolean {
  if (finding.rule !== waiver.rule) return false;
  if (!waiver.matches) return true;
  const ctx = finding.context ?? {};
  for (const [key, expected] of Object.entries(waiver.matches)) {
    if (ctx[key] !== expected) return false;
  }
  return true;
}

function applyWaivers(
  findings: LintFinding[],
  waivers: readonly LintWaiver[] | undefined
): LintFinding[] {
  if (!waivers || waivers.length === 0) return findings;
  return findings.filter(f => !waivers.some(w => matchesWaiver(f, w)));
}

/**
 * Lint a domain against all enabled rules and return a structured result.
 */
export function lintDomain(input: DomainLintInput): LintResult {
  const raw = runRules(input);
  const findings = applyWaivers(raw, input.waivers);
  const errorCount = findings.filter(f => f.severity === 'error').length;
  const warningCount = findings.filter(f => f.severity === 'warning').length;

  return {
    domain: input.name,
    findings,
    errorCount,
    warningCount,
  };
}
