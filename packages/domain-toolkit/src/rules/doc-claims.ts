/**
 * R11 — doc-claims: every "N languages" statement in a domain's prose
 * (package.json description, README, entry docstring) must match the domain's
 * actual language count.
 *
 * Motivation: a 2026-08 audit found bdd/behaviorspec package.json claiming
 * "4 languages" (actual 8) and the jsx/flow/llm READMEs claiming 8 (actual
 * 11) — counts drift silently on every language expansion. Opt-in via
 * `DomainLintInput.docs`; domains that pass no docs are unaffected.
 */

import type { DomainLintInput, LintFinding } from '../types';

const CLAIM_RE = /(\d+)\s+(?:natural\s+)?languages/gi;

export function docClaimsRule(input: DomainLintInput): LintFinding[] {
  const docs = input.docs;
  if (!docs) return [];

  const findings: LintFinding[] = [];
  for (const { path, content } of docs.texts) {
    for (const match of content.matchAll(CLAIM_RE)) {
      const claimed = Number(match[1]);
      if (claimed !== docs.languageCount) {
        findings.push({
          rule: 'doc-claims',
          severity: 'error',
          message:
            `${path} claims "${match[0]}" but the domain has ` + `${docs.languageCount} languages`,
          context: { domain: input.name, path, claimed, actual: docs.languageCount },
        });
      }
    }
  }
  return findings;
}
