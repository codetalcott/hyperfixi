/**
 * Unit tests for R11 (doc-claims) — language-count statements in domain prose
 * must match the domain's actual language count.
 */

import { describe, it, expect } from 'vitest';
import { docClaimsRule } from '../rules/doc-claims';
import type { DomainLintInput } from '../types';

function input(docs?: DomainLintInput['docs']): DomainLintInput {
  return {
    name: 'test',
    schemas: [],
    profiles: [],
    tokenizers: {},
    ...(docs && { docs }),
  };
}

describe('R11 doc-claims', () => {
  it('is silent when no docs are supplied (opt-in)', () => {
    expect(docClaimsRule(input())).toEqual([]);
  });

  it('accepts claims matching the language count', () => {
    const findings = docClaimsRule(
      input({
        languageCount: 11,
        texts: [
          { path: 'README.md', content: 'Write queries in 11 languages.' },
          { path: 'package.json', content: 'compile across 11 natural languages' },
        ],
      })
    );
    expect(findings).toEqual([]);
  });

  it('flags a mismatched claim with path and both numbers', () => {
    const findings = docClaimsRule(
      input({
        languageCount: 11,
        texts: [{ path: 'README.md', content: 'Describe components in 8 natural languages.' }],
      })
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('doc-claims');
    expect(findings[0].severity).toBe('error');
    expect(findings[0].message).toContain('README.md');
    expect(findings[0].message).toContain('8 natural languages');
    expect(findings[0].message).toContain('11');
    expect(findings[0].context).toMatchObject({ claimed: 8, actual: 11 });
  });

  it('finds every claim in a text, not just the first', () => {
    const findings = docClaimsRule(
      input({
        languageCount: 10,
        texts: [
          {
            path: 'README.md',
            content: 'Supports 8 languages today. Formerly 4 languages. Now 10 languages.',
          },
        ],
      })
    );
    expect(findings).toHaveLength(2); // the "10 languages" claim is correct
  });

  it('ignores prose without language-count claims', () => {
    const findings = docClaimsRule(
      input({
        languageCount: 5,
        texts: [{ path: 'README.md', content: 'There are 3 commands and 7 examples.' }],
      })
    );
    expect(findings).toEqual([]);
  });
});
