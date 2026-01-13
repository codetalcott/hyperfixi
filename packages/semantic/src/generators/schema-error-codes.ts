/**
 * Schema Error Codes
 *
 * Provides machine-readable error codes for schema validation.
 * These codes enable LLMs and tooling to programmatically identify
 * and respond to specific validation issues.
 */

import type { SemanticRole } from '../types';

/**
 * Severity levels for schema validation items.
 */
export type SchemaValidationSeverity = 'error' | 'warning' | 'note';

/**
 * A structured validation item with machine-readable code.
 */
export interface SchemaValidationItem {
  /** Machine-readable error code */
  code: string;
  /** Human-readable message */
  message: string;
  /** Severity level */
  severity: SchemaValidationSeverity;
  /** Affected role, if applicable */
  role?: SemanticRole;
  /** Suggested fix */
  suggestion?: string;
}

/**
 * Schema error codes organized by category.
 */
export const SchemaErrorCodes = {
  // Type ambiguity issues
  AMBIGUOUS_TYPE_LITERAL_SELECTOR: 'SCHEMA_AMBIGUOUS_TYPE_LITERAL_SELECTOR',
  TOO_MANY_EXPECTED_TYPES: 'SCHEMA_TOO_MANY_EXPECTED_TYPES',
  MULTI_TYPE_PATIENT_EXPECTED: 'SCHEMA_MULTI_TYPE_PATIENT_EXPECTED',

  // Role issues
  NO_REQUIRED_ROLES: 'SCHEMA_NO_REQUIRED_ROLES',
  NO_REQUIRED_ROLES_EXPECTED: 'SCHEMA_NO_REQUIRED_ROLES_EXPECTED',

  // Transition command
  TRANSITION_PATIENT_ACCEPTS_SELECTOR: 'SCHEMA_TRANSITION_PATIENT_ACCEPTS_SELECTOR',
  TRANSITION_MISSING_GOAL: 'SCHEMA_TRANSITION_MISSING_GOAL',

  // Event handler command
  EVENT_HANDLER_MISSING_EVENT: 'SCHEMA_EVENT_HANDLER_MISSING_EVENT',
  EVENT_HANDLER_EVENT_NOT_REQUIRED: 'SCHEMA_EVENT_HANDLER_EVENT_NOT_REQUIRED',

  // Conditional commands
  CONDITIONAL_MISSING_CONDITION: 'SCHEMA_CONDITIONAL_MISSING_CONDITION',
  CONDITIONAL_CONDITION_NOT_REQUIRED: 'SCHEMA_CONDITIONAL_CONDITION_NOT_REQUIRED',

  // Loop commands
  FOR_LOOP_MISSING_SOURCE: 'SCHEMA_FOR_LOOP_MISSING_SOURCE',
  WHILE_LOOP_MISSING_CONDITION: 'SCHEMA_WHILE_LOOP_MISSING_CONDITION',
} as const;

export type SchemaErrorCode = (typeof SchemaErrorCodes)[keyof typeof SchemaErrorCodes];

/**
 * Message templates for each error code.
 * Use {role}, {command}, {count} placeholders for dynamic values.
 */
export const SchemaErrorMessages: Record<SchemaErrorCode, string> = {
  // Type ambiguity
  [SchemaErrorCodes.AMBIGUOUS_TYPE_LITERAL_SELECTOR]:
    "Role '{role}' accepts both 'literal' and 'selector'. This may cause ambiguous type inference for values starting with special characters (* . # etc.).",
  [SchemaErrorCodes.TOO_MANY_EXPECTED_TYPES]:
    "Role '{role}' accepts {count} different types. This may make type inference unreliable.",
  [SchemaErrorCodes.MULTI_TYPE_PATIENT_EXPECTED]:
    "Role '{role}' accepts multiple types (expected for {command} command).",

  // Role issues
  [SchemaErrorCodes.NO_REQUIRED_ROLES]: 'Command has no required roles. Is this intentional?',
  [SchemaErrorCodes.NO_REQUIRED_ROLES_EXPECTED]:
    'Command has no required roles (expected for {command}).',

  // Transition
  [SchemaErrorCodes.TRANSITION_PATIENT_ACCEPTS_SELECTOR]:
    "Transition command 'patient' role (CSS property name) should only accept 'literal', not 'selector'. CSS property names like 'background-color' are strings, not CSS selectors.",
  [SchemaErrorCodes.TRANSITION_MISSING_GOAL]:
    "Transition command requires a 'goal' role for the target value (to <value>). Without it, there's no way to specify what value to transition to.",

  // Event handler
  [SchemaErrorCodes.EVENT_HANDLER_MISSING_EVENT]:
    "Event handler command should have an 'event' role to specify which event to listen for.",
  [SchemaErrorCodes.EVENT_HANDLER_EVENT_NOT_REQUIRED]:
    'Event role should be required - every event handler needs an event to listen for.',

  // Conditionals
  [SchemaErrorCodes.CONDITIONAL_MISSING_CONDITION]:
    "Conditional command should have a 'condition' role for the boolean expression.",
  [SchemaErrorCodes.CONDITIONAL_CONDITION_NOT_REQUIRED]:
    'Condition role should be required - conditionals need a condition to evaluate.',

  // Loops
  [SchemaErrorCodes.FOR_LOOP_MISSING_SOURCE]:
    "For-loop should have a 'source' role for the collection to iterate over.",
  [SchemaErrorCodes.WHILE_LOOP_MISSING_CONDITION]:
    "While-loop should have a 'condition' role for the loop condition.",
};

/**
 * Suggested fixes for each error code.
 */
export const SchemaErrorSuggestions: Partial<Record<SchemaErrorCode, string>> = {
  [SchemaErrorCodes.AMBIGUOUS_TYPE_LITERAL_SELECTOR]:
    'Consider being more specific about which type is expected, or use explicit type markers.',
  [SchemaErrorCodes.TOO_MANY_EXPECTED_TYPES]:
    'Consider narrowing the accepted types to improve type inference reliability.',
  [SchemaErrorCodes.TRANSITION_PATIENT_ACCEPTS_SELECTOR]:
    "Remove 'selector' from expectedTypes and only accept 'literal'.",
  [SchemaErrorCodes.TRANSITION_MISSING_GOAL]:
    "Add a 'goal' role with expectedTypes ['literal', 'variable'].",
  [SchemaErrorCodes.EVENT_HANDLER_MISSING_EVENT]:
    "Add an 'event' role with expectedTypes ['literal'].",
  [SchemaErrorCodes.EVENT_HANDLER_EVENT_NOT_REQUIRED]: "Set required: true on the 'event' role.",
  [SchemaErrorCodes.CONDITIONAL_MISSING_CONDITION]:
    "Add a 'condition' role with expectedTypes ['expression'].",
  [SchemaErrorCodes.CONDITIONAL_CONDITION_NOT_REQUIRED]:
    "Set required: true on the 'condition' role.",
  [SchemaErrorCodes.FOR_LOOP_MISSING_SOURCE]:
    "Add a 'source' role for the collection to iterate over.",
  [SchemaErrorCodes.WHILE_LOOP_MISSING_CONDITION]:
    "Add a 'condition' role for the loop continuation condition.",
};

/**
 * Interpolate placeholders in a message template.
 */
function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? `{${key}}`));
}

/**
 * Create a schema validation item with proper interpolation.
 */
export function createSchemaValidationItem(
  code: SchemaErrorCode,
  severity: SchemaValidationSeverity,
  params: Record<string, string | number> = {},
  role?: SemanticRole
): SchemaValidationItem {
  const messageTemplate = SchemaErrorMessages[code];
  const message = interpolate(messageTemplate, params);
  const suggestionTemplate = SchemaErrorSuggestions[code];
  const suggestion = suggestionTemplate ? interpolate(suggestionTemplate, params) : undefined;

  return {
    code,
    message,
    severity,
    ...(role && { role }),
    ...(suggestion && { suggestion }),
  };
}
