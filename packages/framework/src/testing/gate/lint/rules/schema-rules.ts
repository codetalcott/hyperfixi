/**
 * Schema-structure rules (R1, R2).
 *
 * Delegates to the validator the input brings (`DomainLintInput.validateSchema`): the domains pass
 * `@lokascript/semantic`'s `validateCommandSchema`, whose checks are already solid. We only surface its
 * error- and warning-level items; notes are dropped to keep linter output focused.
 */

import type { LintFinding, LintRule } from '../types';

const RULE_ID = 'schema-structure';

export const schemaStructureRule: LintRule = input => {
  const findings: LintFinding[] = [];
  if (!input.validateSchema) return findings;

  for (const schema of input.schemas) {
    const result = input.validateSchema(schema);
    for (const item of result.items) {
      if (item.severity === 'note') continue; // skip notes — not actionable at lint time
      findings.push({
        rule: `${RULE_ID}:${item.code}`,
        severity: item.severity,
        message: `[${schema.action}] ${item.message}`,
        context: {
          domain: input.name,
          action: String(schema.action),
          code: item.code,
        },
      });
    }
  }

  return findings;
};
