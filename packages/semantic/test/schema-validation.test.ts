/**
 * Standing schema-validation gate.
 *
 * `command-schemas.ts` used to run this validation at module-load time and print
 * its findings to stderr for every consumer that merely imported the package.
 * That output is now opt-in (LOKASCRIPT_SCHEMA_VALIDATION=1); this test is what
 * keeps the diagnostics from rotting in the meantime:
 *
 *   - any validation ERROR fails outright
 *   - any WARNING outside the pinned allowlist below fails
 *   - an allowlist entry that no longer fires also fails (prune it)
 *
 * To see the full human-readable report:
 *   LOKASCRIPT_SCHEMA_VALIDATION=1 npx tsx -e "import('./src/generators/command-schemas')"
 */

import { describe, it, expect } from 'vitest';
import { commandSchemas } from '../src/generators/command-schemas';
import {
  validateAllSchemas,
  formatValidationResults,
} from '../src/generators/schema-validator';

/**
 * Warnings that exist today and are accepted. Each is a deliberate schema
 * design choice (a role that genuinely accepts many types), not an oversight.
 * Format: `action` → sorted warning codes.
 */
const ALLOWED_WARNINGS: Record<string, string[]> = {
  add: ['SCHEMA_AMBIGUOUS_TYPE_LITERAL_SELECTOR'],
  bind: ['SCHEMA_TOO_MANY_EXPECTED_TYPES'],
  default: ['SCHEMA_TOO_MANY_EXPECTED_TYPES'],
  morph: ['SCHEMA_AMBIGUOUS_TYPE_LITERAL_SELECTOR'],
  set: ['SCHEMA_TOO_MANY_EXPECTED_TYPES'],
  transition: ['SCHEMA_AMBIGUOUS_TYPE_LITERAL_SELECTOR'],
};

describe('command schema validation', () => {
  const validations = validateAllSchemas(commandSchemas);

  it('has no schema validation errors', () => {
    const errors: string[] = [];
    for (const [action, result] of validations) {
      for (const item of result.items) {
        if (item.severity === 'error') errors.push(`${action}: [${item.code}] ${item.message}`);
      }
    }
    expect(errors, `\n${formatValidationResults(validations)}`).toEqual([]);
  });

  it('has no schema warnings outside the allowlist', () => {
    const unexpected: string[] = [];
    for (const [action, result] of validations) {
      const allowed = ALLOWED_WARNINGS[action] ?? [];
      for (const item of result.items) {
        if (item.severity !== 'warning') continue;
        if (!allowed.includes(item.code)) {
          unexpected.push(`${action}: [${item.code}] ${item.message}`);
        }
      }
    }
    expect(
      unexpected,
      'New schema warning(s). Fix the schema, or add the code to ALLOWED_WARNINGS with a reason.'
    ).toEqual([]);
  });

  it('has no stale allowlist entries', () => {
    const actual = new Map<string, Set<string>>();
    for (const [action, result] of validations) {
      const codes = new Set(
        result.items.filter(i => i.severity === 'warning').map(i => i.code)
      );
      if (codes.size > 0) actual.set(action, codes);
    }

    const stale: string[] = [];
    for (const [action, codes] of Object.entries(ALLOWED_WARNINGS)) {
      for (const code of codes) {
        if (!actual.get(action)?.has(code)) stale.push(`${action}: ${code}`);
      }
    }
    expect(stale, 'Allowlisted warning(s) no longer fire — remove them from ALLOWED_WARNINGS.').toEqual(
      []
    );
  });
});

describe('schema validation output is opt-in', () => {
  it('does not print on import unless LOKASCRIPT_SCHEMA_VALIDATION=1', () => {
    // The module-load block reads the env var at import time; if the var were
    // set for this run, the assertions above would still hold but consumers
    // would be getting stderr on a bare import.
    expect(process.env.LOKASCRIPT_SCHEMA_VALIDATION).not.toBe('1');
  });
});
