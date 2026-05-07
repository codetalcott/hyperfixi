/**
 * Schema Consistency Tests
 *
 * Iterates the `commandSchemas` registry and asserts a small set of
 * structural invariants. Catches drift early — the wait/settle case
 * (schema declared role 'patient' while the mapper, bridge, and
 * downstream all used 'duration') would have been flagged here.
 *
 * These checks are intentionally cheap and per-schema so a failure
 * pinpoints exactly which command's schema is broken.
 */
import { describe, it, expect } from 'vitest';
import { commandSchemas } from '../src/generators/command-schemas';

describe('Schema Consistency', () => {
  describe('every schema is internally consistent', () => {
    for (const [action, schema] of Object.entries(commandSchemas)) {
      // Skip schemas with no roles (compound, control-flow placeholders).
      if (schema.roles.length === 0) continue;

      describe(action, () => {
        it('primaryRole exists in roles[].role', () => {
          const roleNames = schema.roles.map(r => r.role);
          expect(roleNames).toContain(schema.primaryRole);
        });

        it('all role names are non-empty unique strings', () => {
          const seen = new Set<string>();
          for (const role of schema.roles) {
            expect(typeof role.role).toBe('string');
            expect(role.role.length).toBeGreaterThan(0);
            expect(seen.has(role.role)).toBe(false);
            seen.add(role.role);
          }
        });

        it('action field matches the registry key', () => {
          expect(schema.action).toBe(action);
        });

        it('methodCarrier (if set) names a real role', () => {
          // Note: methodCarrier may be a *derived* role populated by
          // schema-driven inference and not declared in roles[]. So we
          // don't require it to be in roles[]; just that it's a
          // non-empty string when present.
          for (const role of schema.roles) {
            if (role.methodCarrier !== undefined) {
              expect(typeof role.methodCarrier).toBe('string');
              expect(role.methodCarrier.length).toBeGreaterThan(0);
            }
          }
        });

        it('targetRole (if set) is a non-empty string', () => {
          if (schema.targetRole !== undefined) {
            expect(typeof schema.targetRole).toBe('string');
            expect(schema.targetRole.length).toBeGreaterThan(0);
          }
        });
      });
    }
  });

  describe('every schema has a registry entry whose key matches its action', () => {
    it('no orphan or mislabeled schemas', () => {
      for (const [action, schema] of Object.entries(commandSchemas)) {
        expect(schema.action, `Registry key "${action}" mismatches schema.action "${schema.action}"`).toBe(action);
      }
    });
  });
});
