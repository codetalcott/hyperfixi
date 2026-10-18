/**
 * R9: Role position uniqueness within a schema.
 *
 * `sortRolesByWordOrder` in the pattern generator sorts roles descending by
 * svoPosition or sovPosition (higher value = earlier in surface form). If two
 * roles share the same position value, their relative order is undefined
 * (falls through to array stability) — a latent footgun because token
 * ordering silently changes if someone reorders the roles array.
 *
 * This rule warns when a schema has multiple roles AND any two share an
 * explicit position for the same word order.
 *
 * Warning (not error) because:
 *   - Single-role schemas have nothing to order.
 *   - A schema might intentionally tie two roles when only one is present
 *     at a time (e.g., mutually-exclusive alternatives). In practice we
 *     haven't seen this, but the rule should prompt a review, not block.
 *
 * The `sovPosition: 0` default assigned when omitted is NOT flagged — only
 * explicit non-zero collisions count. Otherwise most schemas with 3+
 * optional roles would warn spuriously.
 */

import type { LintFinding, LintRule } from '../types';

const RULE_ID = 'position-ordering';

function findCollisions(
  values: Array<{ role: string; position: number }>
): Array<{ position: number; roles: string[] }> {
  const byPosition = new Map<number, string[]>();
  for (const { role, position } of values) {
    const existing = byPosition.get(position) ?? [];
    existing.push(role);
    byPosition.set(position, existing);
  }
  return Array.from(byPosition.entries())
    .filter(([, roles]) => roles.length > 1)
    .map(([position, roles]) => ({ position, roles }));
}

export const positionOrderingRule: LintRule = input => {
  const findings: LintFinding[] = [];

  for (const schema of input.schemas) {
    if (schema.roles.length < 2) continue;

    const svoValues = schema.roles
      .filter(r => typeof r.svoPosition === 'number' && r.svoPosition !== 0)
      .map(r => ({ role: r.role, position: r.svoPosition! }));
    const sovValues = schema.roles
      .filter(r => typeof r.sovPosition === 'number' && r.sovPosition !== 0)
      .map(r => ({ role: r.role, position: r.sovPosition! }));

    for (const { position, roles } of findCollisions(svoValues)) {
      findings.push({
        rule: RULE_ID,
        severity: 'warning',
        message: `[${String(schema.action)}] roles ${roles.join(', ')} share svoPosition=${position} — order is undefined`,
        context: {
          domain: input.name,
          action: String(schema.action),
          wordOrder: 'SVO',
          position,
          roles: roles.join(','),
        },
      });
    }

    for (const { position, roles } of findCollisions(sovValues)) {
      findings.push({
        rule: RULE_ID,
        severity: 'warning',
        message: `[${String(schema.action)}] roles ${roles.join(', ')} share sovPosition=${position} — order is undefined`,
        context: {
          domain: input.name,
          action: String(schema.action),
          wordOrder: 'SOV',
          position,
          roles: roles.join(','),
        },
      });
    }
  }

  return findings;
};
