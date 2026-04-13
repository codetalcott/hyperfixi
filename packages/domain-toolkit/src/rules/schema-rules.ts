/**
 * Schema-structure rules (R1, R2).
 *
 * Delegates to `@lokascript/semantic`'s already-solid schema validator.
 * We only surface its error- and warning-level items; notes are dropped
 * to keep linter output focused.
 */

import { validateCommandSchema } from '@lokascript/semantic';
import type { LintFinding, LintRule, Severity } from '../types';

const RULE_ID = 'schema-structure';

/**
 * Maps semantic's validation severity to our linter severity.
 * Semantic uses the same three levels, but we keep the conversion explicit.
 */
function toSeverity(sem: 'error' | 'warning' | 'note'): Severity {
  return sem;
}

// Semantic's CommandSchema narrows `action` to a hardcoded union of hyperscript
// actions; framework's CommandSchema accepts any string. Domain-specific
// actions like 'select', 'get', 'obtener' aren't in semantic's union but the
// validator doesn't depend on the narrower typing at runtime — it just
// iterates roles and checks types. Cast through `unknown` is safe here and
// scoped to this one boundary.
type SemanticSchema = Parameters<typeof validateCommandSchema>[0];

export const schemaStructureRule: LintRule = input => {
  const findings: LintFinding[] = [];

  for (const schema of input.schemas) {
    const result = validateCommandSchema(schema as unknown as SemanticSchema);
    for (const item of result.items) {
      if (item.severity === 'note') continue; // skip notes — not actionable at lint time
      findings.push({
        rule: `${RULE_ID}:${item.code}`,
        severity: toSeverity(item.severity),
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
