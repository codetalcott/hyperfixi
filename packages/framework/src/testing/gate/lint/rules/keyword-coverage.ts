/**
 * R6: Keyword coverage across profiles.
 *
 * For every schema action + every registered profile, the profile must have
 * a `keywords[action]` entry. Without it, `createMultilingualDSL()` throws
 * at pattern generation time ("No keyword translation for 'X' in 'Y'").
 *
 * This rule catches the "I added a new schema but only wired it into the
 * English profile" class of drift.
 */

import type { LintFinding, LintRule } from '../types';

const RULE_ID = 'keyword-coverage';

export const keywordCoverageRule: LintRule = input => {
  const findings: LintFinding[] = [];

  for (const profile of input.profiles) {
    for (const schema of input.schemas) {
      const action = schema.action;
      if (!profile.keywords[action]) {
        findings.push({
          rule: RULE_ID,
          severity: 'error',
          message: `profile [${profile.code}] has no keyword for action '${String(action)}'`,
          context: {
            domain: input.name,
            lang: profile.code,
            action: String(action),
          },
        });
      }
    }
  }

  return findings;
};
