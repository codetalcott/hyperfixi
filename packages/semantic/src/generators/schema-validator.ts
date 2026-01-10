/**
 * Schema Validation
 *
 * Validates command schemas to catch design issues early:
 * - Ambiguous type combinations (e.g., both 'literal' and 'selector')
 * - Missing required roles for specific commands
 * - Schema inconsistencies
 *
 * This runs at build time in development to catch schema errors before they cause
 * runtime issues.
 */

import type { CommandSchema } from './command-schemas';
import type { ActionType } from '../types';

/**
 * Result from validating a single command schema.
 */
export interface SchemaValidation {
  action: ActionType;
  notes: string[];      // Informational notes (known patterns, not issues)
  warnings: string[];   // Potential issues to review
  errors: string[];     // Definite problems that should be fixed
}

/**
 * Validate a single command schema for potential issues.
 *
 * @param schema - The command schema to validate
 * @returns Validation result with warnings and errors
 */
// Commands where multi-type patient roles are intentional (not ambiguous)
const MULTI_TYPE_PATIENT_COMMANDS = new Set([
  'put', 'append', 'prepend', 'log', 'throw', 'make', 'measure', 'return',
  'swap', 'morph',  // DOM manipulation commands that accept various content types
]);

// Commands that intentionally have no required roles
const NO_REQUIRED_ROLES_COMMANDS = new Set([
  'compound', 'else', 'halt', 'continue', 'async', 'init',
  'settle', 'focus', 'blur', 'return', 'js', 'measure',  // Commands with optional-only roles
]);

export function validateCommandSchema(schema: CommandSchema): SchemaValidation {
  const notes: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check for ambiguous type combinations in roles
  for (const role of schema.roles) {
    // Check if a role accepts both 'literal' and 'selector'
    if (role.expectedTypes.includes('literal') && role.expectedTypes.includes('selector')) {
      if (role.role === 'patient' && MULTI_TYPE_PATIENT_COMMANDS.has(schema.action)) {
        // Known pattern - add as note, not warning
        notes.push(
          `Role '${role.role}' accepts multiple types (expected for ${schema.action} command).`
        );
      } else {
        warnings.push(
          `Role '${role.role}' accepts both 'literal' and 'selector'. ` +
          `This may cause ambiguous type inference for values starting with special characters (* . # etc.). ` +
          `Consider being more specific about which type is expected.`
        );
      }
    }

    // Warn if a role has too many expected types (> 3)
    if (role.expectedTypes.length > 3 && !MULTI_TYPE_PATIENT_COMMANDS.has(schema.action)) {
      warnings.push(
        `Role '${role.role}' accepts ${role.expectedTypes.length} different types. ` +
        `This may make type inference unreliable. Consider narrowing the accepted types.`
      );
    }
  }

  // Command-specific validation rules
  switch (schema.action) {
    case 'transition':
      validateTransitionSchema(schema, warnings, errors);
      break;

    case 'on':
      validateEventHandlerSchema(schema, warnings, errors);
      break;

    case 'if':
    case 'unless':
      validateConditionalSchema(schema, warnings, errors);
      break;

    case 'repeat':
    case 'for':
    case 'while':
      validateLoopSchema(schema, warnings, errors);
      break;
  }

  // Check for schemas with no required roles
  const requiredRoles = schema.roles.filter(r => r.required);
  if (requiredRoles.length === 0) {
    if (NO_REQUIRED_ROLES_COMMANDS.has(schema.action)) {
      // Known pattern - add as note
      notes.push(`Command has no required roles (expected for ${schema.action}).`);
    } else {
      warnings.push(`Command has no required roles. Is this intentional?`);
    }
  }

  return { action: schema.action, notes, warnings, errors };
}

/**
 * Validate the transition command schema.
 */
function validateTransitionSchema(
  schema: CommandSchema,
  warnings: string[],
  errors: string[]
): void {
  const patientRole = schema.roles.find(r => r.role === 'patient');
  const goalRole = schema.roles.find(r => r.role === 'goal');

  // Check that patient (property name) only accepts literals
  if (patientRole && patientRole.expectedTypes.includes('selector')) {
    warnings.push(
      `Transition command 'patient' role (CSS property name) should only accept 'literal', not 'selector'. ` +
      `CSS property names like 'background-color' are strings, not CSS selectors.`
    );
  }

  // Check that transition has a goal role for the target value
  if (patientRole && !goalRole) {
    errors.push(
      `Transition command requires a 'goal' role for the target value (to <value>). ` +
      `Without it, there's no way to specify what value to transition to.`
    );
  }
}

/**
 * Validate event handler schemas (on command).
 */
function validateEventHandlerSchema(
  schema: CommandSchema,
  warnings: string[],
  _errors: string[]
): void {
  const eventRole = schema.roles.find(r => r.role === 'event');

  if (!eventRole) {
    warnings.push(`Event handler command should have an 'event' role to specify which event to listen for.`);
  }

  if (eventRole && !eventRole.required) {
    warnings.push(`Event role should be required - every event handler needs an event to listen for.`);
  }
}

/**
 * Validate conditional schemas (if/unless).
 */
function validateConditionalSchema(
  schema: CommandSchema,
  warnings: string[],
  _errors: string[]
): void {
  const conditionRole = schema.roles.find(r => r.role === 'condition');

  if (!conditionRole) {
    warnings.push(`Conditional command should have a 'condition' role for the boolean expression.`);
  }

  if (conditionRole && !conditionRole.required) {
    warnings.push(`Condition role should be required - conditionals need a condition to evaluate.`);
  }
}

/**
 * Validate loop schemas (repeat, for, while).
 */
function validateLoopSchema(
  schema: CommandSchema,
  warnings: string[],
  _errors: string[]
): void {
  // Different loop types have different requirements
  if (schema.action === 'for') {
    const sourceRole = schema.roles.find(r => r.role === 'source');
    if (!sourceRole) {
      warnings.push(`For-loop should have a 'source' role for the collection to iterate over.`);
    }
  } else if (schema.action === 'while') {
    const conditionRole = schema.roles.find(r => r.role === 'condition');
    if (!conditionRole) {
      warnings.push(`While-loop should have a 'condition' role for the loop condition.`);
    }
  }
}

/**
 * Validate all command schemas in the registry.
 *
 * @param schemas - Map of action names to command schemas
 * @returns Map of action names to validation results (only includes schemas with issues)
 */
export function validateAllSchemas(
  schemas: Record<string, CommandSchema>,
  options: { includeNotes?: boolean } = {}
): Map<string, SchemaValidation> {
  const results = new Map<string, SchemaValidation>();
  const { includeNotes = false } = options;

  for (const [action, schema] of Object.entries(schemas)) {
    const validation = validateCommandSchema(schema);

    // Include in results if there are warnings/errors (or notes if requested)
    const hasIssues = validation.warnings.length > 0 || validation.errors.length > 0;
    const hasNotes = includeNotes && validation.notes.length > 0;

    if (hasIssues || hasNotes) {
      results.set(action, validation);
    }
  }

  return results;
}

/**
 * Format validation results for console output.
 *
 * @param validations - Map of validation results
 * @param options - Formatting options
 * @returns Formatted string for console output
 */
export function formatValidationResults(
  validations: Map<string, SchemaValidation>,
  options: { showNotes?: boolean } = {}
): string {
  const lines: string[] = [];
  const { showNotes = false } = options;

  for (const [action, result] of validations) {
    if (result.errors.length > 0) {
      lines.push(`  ❌ ${action}:`);
      for (const error of result.errors) {
        lines.push(`     ERROR: ${error}`);
      }
    }

    if (result.warnings.length > 0) {
      lines.push(`  ⚠️  ${action}:`);
      for (const warning of result.warnings) {
        lines.push(`     ${warning}`);
      }
    }

    if (showNotes && result.notes.length > 0) {
      lines.push(`  ℹ️  ${action}:`);
      for (const note of result.notes) {
        lines.push(`     ${note}`);
      }
    }
  }

  return lines.join('\n');
}
