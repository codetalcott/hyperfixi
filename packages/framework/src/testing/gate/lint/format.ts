/**
 * Pretty-print lint results for test output.
 */

import type { LintFinding, LintResult, Severity } from './types';

const SEVERITY_GLYPH: Record<Severity, string> = {
  error: '✗',
  warning: '⚠',
  note: 'ℹ',
};

export function formatFinding(finding: LintFinding): string {
  const glyph = SEVERITY_GLYPH[finding.severity];
  return `  ${glyph} [${finding.rule}] ${finding.message}`;
}

export function formatResult(result: LintResult): string {
  const header = `domain-toolkit: lint(${result.domain}) — ${result.errorCount} error(s), ${result.warningCount} warning(s)`;
  if (result.findings.length === 0) return `${header}\n  (clean)`;
  const body = result.findings.map(formatFinding).join('\n');
  return `${header}\n${body}`;
}
