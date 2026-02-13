/**
 * Command Schema Types
 *
 * Defines the structure of DSL commands for pattern generation.
 * These schemas are language-neutral and describe the semantic structure
 * of commands rather than their surface syntax.
 */

import type { ActionType, SemanticRole, SemanticValue, ExpectedType } from '../core/types';

/**
 * Command schema - defines a DSL command's structure.
 */
export interface CommandSchema {
  /** The action type (command name) */
  readonly action: ActionType;

  /** Human-readable description */
  readonly description: string;

  /** Roles this command accepts */
  readonly roles: RoleSpec[];

  /** The primary role (what the command acts on) */
  readonly primaryRole: SemanticRole;

  /** Category for grouping (DSL-specific) */
  readonly category: string;

  /** Whether this command typically has a body (like event handlers, blocks) */
  readonly hasBody?: boolean;

  /** Notes about special handling or usage */
  readonly notes?: string;
}

/**
 * Role specification - defines a semantic role in a command.
 */
export interface RoleSpec {
  /** The semantic role */
  readonly role: SemanticRole;

  /** Description of what this role represents */
  readonly description: string;

  /** Whether this role is required */
  readonly required: boolean;

  /** Expected value types */
  readonly expectedTypes: Array<ExpectedType>;

  /** Default value if not provided */
  readonly default?: SemanticValue;

  /** Position hint for SVO languages (higher = earlier) */
  readonly svoPosition?: number;

  /** Position hint for SOV languages (higher = earlier) */
  readonly sovPosition?: number;

  /**
   * Override the default role marker for this command.
   * Maps language code to the marker to use (e.g., { en: 'from', ja: 'から' }).
   * If not specified, uses the language profile's default roleMarker.
   */
  readonly markerOverride?: Record<string, string>;

  /**
   * Override the rendering marker separately from parsing.
   * Used when the parsing grammar differs from rendered output.
   * Maps language code to the rendering marker.
   */
  readonly renderOverride?: Record<string, string>;
}

/**
 * Helper to create a command schema with sensible defaults.
 * Provides defaults for description, category, and primaryRole.
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
 * Provides default for description.
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
