/**
 * Command Schema Types
 *
 * Defines the structure of DSL commands for pattern generation and validation.
 * Language-neutral — describes semantic structure, not surface syntax.
 */

import type { ActionType, SemanticRole, SemanticValue, ExpectedType } from './types';

export interface CommandSchema {
  readonly action: ActionType;
  readonly description: string;
  readonly roles: RoleSpec[];
  readonly primaryRole: SemanticRole;
  readonly category: string;
  readonly hasBody?: boolean;
  readonly notes?: string;
}

export interface RoleSpec {
  readonly role: SemanticRole;
  readonly description: string;
  readonly required: boolean;
  readonly expectedTypes: Array<ExpectedType>;
  readonly default?: SemanticValue;
  /**
   * Ordering priority for SVO (Subject-Verb-Object) languages.
   * **Higher values appear EARLIER** in the surface form (descending sort).
   *
   * Example — `select <columns> from <source> where <condition>`:
   *   `columns: 2, source: 1, condition: 0`
   *
   * Pick values so the most "central" role is highest and optional / trailing
   * clauses are lowest. When adding a role between two existing ones, bump all
   * higher positions rather than using fractional numbers.
   */
  readonly svoPosition?: number;
  /**
   * Ordering priority for SOV (Subject-Object-Verb) languages.
   * **Higher values appear EARLIER** in the surface form (descending sort).
   *
   * Same convention as {@link svoPosition} — the verb is appended last by the
   * pattern generator, so role positions order the pre-verb material.
   */
  readonly sovPosition?: number;
  readonly markerOverride?: Record<string, string>;
  readonly renderOverride?: Record<string, string>;
  readonly markerPosition?: 'before' | 'after';
  readonly greedy?: boolean;
  readonly selectorKinds?: ReadonlyArray<'id' | 'class' | 'attribute' | 'element' | 'complex'>;
}

/**
 * Helper to create a command schema with sensible defaults.
 */
export function defineCommand(
  schema: Partial<CommandSchema> & Pick<CommandSchema, 'action' | 'roles'>
): CommandSchema {
  return {
    description: schema.description || `${schema.action} command`,
    category: schema.category || 'general',
    primaryRole: schema.primaryRole || schema.roles[0]?.role || 'patient',
    ...schema,
    action: schema.action,
    roles: schema.roles,
  } as CommandSchema;
}

/**
 * Helper to create a role spec with sensible defaults.
 */
export function defineRole(
  role: Partial<RoleSpec> & Pick<RoleSpec, 'role' | 'required' | 'expectedTypes'>
): RoleSpec {
  return {
    description: role.description || `${role.role} role`,
    ...role,
    role: role.role,
    required: role.required,
    expectedTypes: role.expectedTypes,
  };
}

/**
 * Look up a role spec by name within a command schema.
 * Returns `undefined` if no role with that name exists.
 *
 * @example
 * const spec = getRoleSpec(toggleSchema, 'patient');
 * if (spec?.required) { ... }
 */
export function getRoleSpec(schema: CommandSchema, role: string): RoleSpec | undefined {
  return schema.roles.find(r => r.role === role);
}
