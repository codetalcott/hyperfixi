/**
 * The linter's own logic: waiver matching, count derivation, the format helpers,
 * and the schema-structure rule's validator input (moved with the linter from
 * lokascript-domains' domain-toolkit). A grammar's lint test runs the rules on its
 * real tables; these fixtures are minimal on purpose (keyword-coverage needs only
 * `schema.action` + `profile.keywords`), and assertions filter by rule id.
 */

import { describe, it, expect } from 'vitest';
import { lintDomain, formatResult, formatFinding } from './index';
import type { DomainLintInput } from './types';

function emptyInput(): DomainLintInput {
  return { name: 'smoke', schemas: [], profiles: [], tokenizers: {} };
}

/** One schema + a profile with no keywords → exactly one R6 error finding. */
function uncoveredInput(): DomainLintInput {
  return {
    name: 'smoke',
    schemas: [
      {
        action: 'toggle',
        description: 'fixture command',
        roles: [],
        primaryRole: 'patient',
        category: 'test',
      },
    ],
    profiles: [{ code: 'xx', wordOrder: 'SVO', keywords: {} }],
    tokenizers: {},
  };
}

describe('lintDomain', () => {
  it('returns a clean structured result for an empty domain', () => {
    const result = lintDomain(emptyInput());
    expect(result.domain).toBe('smoke');
    expect(result.findings).toEqual([]);
    expect(result.errorCount).toBe(0);
    expect(result.warningCount).toBe(0);
  });

  it('reports keyword-coverage when a profile lacks a schema action keyword', () => {
    const result = lintDomain(uncoveredInput());
    const r6 = result.findings.filter(f => f.rule === 'keyword-coverage');
    expect(r6).toHaveLength(1);
    expect(r6[0]).toMatchObject({
      severity: 'error',
      context: { domain: 'smoke', lang: 'xx', action: 'toggle' },
    });
    expect(result.errorCount).toBeGreaterThanOrEqual(1);
  });
});

describe('waivers', () => {
  it('drops a finding whose rule and context both match', () => {
    const result = lintDomain({
      ...uncoveredInput(),
      waivers: [{ rule: 'keyword-coverage', reason: 'fixture waiver', matches: { lang: 'xx' } }],
    });
    expect(result.findings.filter(f => f.rule === 'keyword-coverage')).toEqual([]);
  });

  it('keeps a finding when the waiver context does not match', () => {
    const result = lintDomain({
      ...uncoveredInput(),
      waivers: [{ rule: 'keyword-coverage', reason: 'wrong language', matches: { lang: 'yy' } }],
    });
    expect(result.findings.filter(f => f.rule === 'keyword-coverage')).toHaveLength(1);
  });

  it('a matches-less waiver drops every finding of its rule', () => {
    const result = lintDomain({
      ...uncoveredInput(),
      waivers: [{ rule: 'keyword-coverage', reason: 'blanket' }],
    });
    expect(result.findings.filter(f => f.rule === 'keyword-coverage')).toEqual([]);
  });
});

describe('format helpers', () => {
  it('formatFinding renders the severity glyph and rule id', () => {
    const line = formatFinding({
      rule: 'keyword-coverage',
      severity: 'error',
      message: 'profile [xx] has no keyword',
    });
    expect(line).toContain('✗');
    expect(line).toContain('[keyword-coverage]');
  });

  it('formatResult renders "(clean)" for an empty result', () => {
    const text = formatResult(lintDomain(emptyInput()));
    expect(text).toContain('0 error(s), 0 warning(s)');
    expect(text).toContain('(clean)');
  });

  it('formatResult renders one line per finding otherwise', () => {
    const text = formatResult(lintDomain(uncoveredInput()));
    expect(text).toContain("no keyword for action 'toggle'");
  });
});

describe('schema-structure (R1/R2)', () => {
  it("reports the input's validator findings, notes dropped", () => {
    const result = lintDomain({
      ...uncoveredInput(),
      validateSchema: schema => ({
        items: [
          { code: 'NO_REQUIRED_ROLES', severity: 'warning', message: `${schema.action} has none` },
          { code: 'A_NOTE', severity: 'note', message: 'dropped' },
        ],
      }),
    });
    const r1 = result.findings.filter(f => f.rule.startsWith('schema-structure'));
    expect(r1).toEqual([
      {
        rule: 'schema-structure:NO_REQUIRED_ROLES',
        severity: 'warning',
        message: '[toggle] toggle has none',
        context: { domain: 'smoke', action: 'toggle', code: 'NO_REQUIRED_ROLES' },
      },
    ]);
  });

  it('finds nothing without a validator', () => {
    const result = lintDomain(uncoveredInput());
    expect(result.findings.filter(f => f.rule.startsWith('schema-structure'))).toEqual([]);
  });
});
