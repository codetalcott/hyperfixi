/**
 * Tests for v1.2 type constraint features:
 * - selectorKinds on RoleSpec
 * - validateRoleValues() function
 * - selectorKinds consistency check in validateCommandSchema()
 */
import { describe, it, expect } from 'vitest';
import {
  validateCommandSchema,
  validateRoleValues,
  type RoleValue,
} from '../src/generators/schema-validator';
import { toggleSchema } from '../src/generators/command-schemas';
import type { CommandSchema } from '../src/generators/command-schemas';

describe('type constraints (v1.2)', () => {
  describe('selectorKinds on toggle schema', () => {
    it('toggle patient has selectorKinds: [class, attribute]', () => {
      const patientRole = toggleSchema.roles.find(r => r.role === 'patient');
      expect(patientRole).toBeDefined();
      expect(patientRole!.selectorKinds).toEqual(['class', 'attribute']);
    });
  });

  describe('selectorKinds consistency in validateCommandSchema', () => {
    it('warns if selectorKinds set but expectedTypes lacks selector', () => {
      const badSchema: CommandSchema = {
        action: 'test-bad' as never,
        description: 'test',
        category: 'dom-class',
        primaryRole: 'patient',
        roles: [
          {
            role: 'patient',
            description: 'test',
            required: true,
            expectedTypes: ['literal'],
            selectorKinds: ['class'],
          },
        ],
      };

      const result = validateCommandSchema(badSchema);
      const selectorKindWarning = result.items.find(
        i => i.code === 'SCHEMA_SELECTOR_KINDS_WITHOUT_SELECTOR_TYPE'
      );
      expect(selectorKindWarning).toBeDefined();
      expect(selectorKindWarning!.severity).toBe('warning');
    });

    it('no warning when selectorKinds and selector type are aligned', () => {
      const result = validateCommandSchema(toggleSchema);
      const selectorKindWarning = result.items.find(
        i => i.code === 'SCHEMA_SELECTOR_KINDS_WITHOUT_SELECTOR_TYPE'
      );
      expect(selectorKindWarning).toBeUndefined();
    });
  });

  describe('validateRoleValues', () => {
    it('passes when value type matches expectedTypes', () => {
      const values: RoleValue[] = [
        { role: 'patient', type: 'selector', selectorKind: 'class' },
      ];
      const diagnostics = validateRoleValues(toggleSchema, values);
      expect(diagnostics).toHaveLength(0);
    });

    it('errors when value type does not match expectedTypes', () => {
      const values: RoleValue[] = [
        { role: 'patient', type: 'literal' },
      ];
      const diagnostics = validateRoleValues(toggleSchema, values);
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].code).toBe('SCHEMA_VALUE_TYPE_MISMATCH');
      expect(diagnostics[0].level).toBe('error');
      expect(diagnostics[0].role).toBe('patient');
    });

    it('errors when selector kind does not match selectorKinds', () => {
      const values: RoleValue[] = [
        { role: 'patient', type: 'selector', selectorKind: 'id' },
      ];
      const diagnostics = validateRoleValues(toggleSchema, values);
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].code).toBe('SCHEMA_SELECTOR_KIND_MISMATCH');
      expect(diagnostics[0].role).toBe('patient');
    });

    it('passes when selector kind matches selectorKinds', () => {
      const values: RoleValue[] = [
        { role: 'patient', type: 'selector', selectorKind: 'class' },
        { role: 'destination', type: 'reference' },
      ];
      const diagnostics = validateRoleValues(toggleSchema, values);
      expect(diagnostics).toHaveLength(0);
    });

    it('reports multiple diagnostics for multiple bad roles', () => {
      const values: RoleValue[] = [
        { role: 'patient', type: 'literal' },
        { role: 'destination', type: 'literal' },
      ];
      const diagnostics = validateRoleValues(toggleSchema, values);
      expect(diagnostics).toHaveLength(2);
      expect(diagnostics[0].role).toBe('patient');
      expect(diagnostics[1].role).toBe('destination');
    });

    it('ignores unknown roles (not a type constraint issue)', () => {
      const values: RoleValue[] = [
        { role: 'unknown-role', type: 'literal' },
      ];
      const diagnostics = validateRoleValues(toggleSchema, values);
      expect(diagnostics).toHaveLength(0);
    });

    it('allows any type when expectedTypes includes expression (wildcard)', () => {
      const schemaWithExpression: CommandSchema = {
        action: 'test-expr' as never,
        description: 'test',
        category: 'general',
        primaryRole: 'condition',
        roles: [
          {
            role: 'condition',
            description: 'test',
            required: true,
            expectedTypes: ['expression'],
          },
        ],
      };
      const values: RoleValue[] = [
        { role: 'condition', type: 'literal' },
      ];
      const diagnostics = validateRoleValues(schemaWithExpression, values);
      expect(diagnostics).toHaveLength(0);
    });

    it('no selectorKind check when selectorKinds not specified', () => {
      const schemaNoKinds: CommandSchema = {
        action: 'test-nk' as never,
        description: 'test',
        category: 'general',
        primaryRole: 'patient',
        roles: [
          {
            role: 'patient',
            description: 'test',
            required: true,
            expectedTypes: ['selector'],
            // no selectorKinds — all kinds accepted
          },
        ],
      };
      const values: RoleValue[] = [
        { role: 'patient', type: 'selector', selectorKind: 'id' },
      ];
      const diagnostics = validateRoleValues(schemaNoKinds, values);
      expect(diagnostics).toHaveLength(0);
    });
  });
});
