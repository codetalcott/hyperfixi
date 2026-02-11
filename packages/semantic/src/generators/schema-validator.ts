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
import type { LanguageProfile } from './profiles/types';
import {
  type SchemaValidationItem,
  type SchemaValidationSeverity,
  SchemaErrorCodes,
  createSchemaValidationItem,
} from './schema-error-codes';

// Re-export for convenience
export type { SchemaValidationItem, SchemaValidationSeverity };
export { SchemaErrorCodes };

/**
 * Result from validating a single command schema.
 *
 * The `items` array contains all validation results with machine-readable codes.
 * For backward compatibility, `notes`, `warnings`, and `errors` getters are provided.
 */
export interface SchemaValidation {
  action: ActionType;
  /** All validation items with structured codes and severity */
  items: SchemaValidationItem[];
}

/**
 * Extended validation result with backward-compatible getters.
 */
export interface SchemaValidationResult extends SchemaValidation {
  /** @deprecated Since v1.3.0. Will be removed in v2.0.0. Use items.filter(i => i.severity === 'note') */
  readonly notes: string[];
  /** @deprecated Since v1.3.0. Will be removed in v2.0.0. Use items.filter(i => i.severity === 'warning') */
  readonly warnings: string[];
  /** @deprecated Since v1.3.0. Will be removed in v2.0.0. Use items.filter(i => i.severity === 'error') */
  readonly errors: string[];
}

/**
 * Create a SchemaValidationResult with backward-compatible getters.
 */
function createValidationResult(
  action: ActionType,
  items: SchemaValidationItem[]
): SchemaValidationResult {
  return {
    action,
    items,
    get notes() {
      return items.filter(i => i.severity === 'note').map(i => i.message);
    },
    get warnings() {
      return items.filter(i => i.severity === 'warning').map(i => i.message);
    },
    get errors() {
      return items.filter(i => i.severity === 'error').map(i => i.message);
    },
  };
}

// Commands where multi-type patient roles are intentional (not ambiguous)
const MULTI_TYPE_PATIENT_COMMANDS = new Set([
  'put',
  'append',
  'prepend',
  'log',
  'throw',
  'make',
  'measure',
  'return',
  'swap',
  'morph', // DOM manipulation commands that accept various content types
  'beep', // Debug command — accepts any expression type
  'copy', // Clipboard — accepts text literals, selectors, or references
]);

// Commands that intentionally have no required roles
const NO_REQUIRED_ROLES_COMMANDS = new Set([
  'compound',
  'else',
  'halt',
  'continue',
  'async',
  'init',
  'settle',
  'focus',
  'blur',
  'return',
  'js',
  'measure', // Commands with optional-only roles
  'break', // Zero-arg control flow (exit loop)
  'exit', // Zero-arg control flow (exit handler)
  'beep', // Debug command — all roles optional
]);

/**
 * Validate a single command schema for potential issues.
 *
 * @param schema - The command schema to validate
 * @returns Validation result with structured items and backward-compatible getters
 */
export function validateCommandSchema(schema: CommandSchema): SchemaValidationResult {
  const items: SchemaValidationItem[] = [];

  // Check for ambiguous type combinations in roles
  for (const role of schema.roles) {
    // Check if a role accepts both 'literal' and 'selector'
    if (role.expectedTypes.includes('literal') && role.expectedTypes.includes('selector')) {
      if (role.role === 'patient' && MULTI_TYPE_PATIENT_COMMANDS.has(schema.action)) {
        // Known pattern - add as note, not warning
        items.push(
          createSchemaValidationItem(
            SchemaErrorCodes.MULTI_TYPE_PATIENT_EXPECTED,
            'note',
            { role: role.role, command: schema.action },
            role.role
          )
        );
      } else {
        items.push(
          createSchemaValidationItem(
            SchemaErrorCodes.AMBIGUOUS_TYPE_LITERAL_SELECTOR,
            'warning',
            { role: role.role },
            role.role
          )
        );
      }
    }

    // Warn if a role has too many expected types (> 3)
    if (role.expectedTypes.length > 3 && !MULTI_TYPE_PATIENT_COMMANDS.has(schema.action)) {
      items.push(
        createSchemaValidationItem(
          SchemaErrorCodes.TOO_MANY_EXPECTED_TYPES,
          'warning',
          { role: role.role, count: role.expectedTypes.length },
          role.role
        )
      );
    }
  }

  // Command-specific validation rules
  switch (schema.action) {
    case 'transition':
      validateTransitionSchema(schema, items);
      break;

    case 'on':
      validateEventHandlerSchema(schema, items);
      break;

    case 'if':
    case 'unless':
      validateConditionalSchema(schema, items);
      break;

    case 'repeat':
    case 'for':
    case 'while':
      validateLoopSchema(schema, items);
      break;
  }

  // Check for schemas with no required roles
  const requiredRoles = schema.roles.filter(r => r.required);
  if (requiredRoles.length === 0) {
    if (NO_REQUIRED_ROLES_COMMANDS.has(schema.action)) {
      // Known pattern - add as note
      items.push(
        createSchemaValidationItem(SchemaErrorCodes.NO_REQUIRED_ROLES_EXPECTED, 'note', {
          command: schema.action,
        })
      );
    } else {
      items.push(createSchemaValidationItem(SchemaErrorCodes.NO_REQUIRED_ROLES, 'warning', {}));
    }
  }

  return createValidationResult(schema.action, items);
}

/**
 * Validate the transition command schema.
 */
function validateTransitionSchema(schema: CommandSchema, items: SchemaValidationItem[]): void {
  const patientRole = schema.roles.find(r => r.role === 'patient');
  const goalRole = schema.roles.find(r => r.role === 'goal');

  // Check that patient (property name) only accepts literals
  if (patientRole && patientRole.expectedTypes.includes('selector')) {
    items.push(
      createSchemaValidationItem(
        SchemaErrorCodes.TRANSITION_PATIENT_ACCEPTS_SELECTOR,
        'warning',
        {},
        'patient'
      )
    );
  }

  // Check that transition has a goal role for the target value
  if (patientRole && !goalRole) {
    items.push(createSchemaValidationItem(SchemaErrorCodes.TRANSITION_MISSING_GOAL, 'error', {}));
  }
}

/**
 * Validate event handler schemas (on command).
 */
function validateEventHandlerSchema(schema: CommandSchema, items: SchemaValidationItem[]): void {
  const eventRole = schema.roles.find(r => r.role === 'event');

  if (!eventRole) {
    items.push(
      createSchemaValidationItem(SchemaErrorCodes.EVENT_HANDLER_MISSING_EVENT, 'warning', {})
    );
  }

  if (eventRole && !eventRole.required) {
    items.push(
      createSchemaValidationItem(SchemaErrorCodes.EVENT_HANDLER_EVENT_NOT_REQUIRED, 'warning', {})
    );
  }
}

/**
 * Validate conditional schemas (if/unless).
 */
function validateConditionalSchema(schema: CommandSchema, items: SchemaValidationItem[]): void {
  const conditionRole = schema.roles.find(r => r.role === 'condition');

  if (!conditionRole) {
    items.push(
      createSchemaValidationItem(SchemaErrorCodes.CONDITIONAL_MISSING_CONDITION, 'warning', {})
    );
  }

  if (conditionRole && !conditionRole.required) {
    items.push(
      createSchemaValidationItem(SchemaErrorCodes.CONDITIONAL_CONDITION_NOT_REQUIRED, 'warning', {})
    );
  }
}

/**
 * Validate loop schemas (repeat, for, while).
 */
function validateLoopSchema(schema: CommandSchema, items: SchemaValidationItem[]): void {
  // Different loop types have different requirements
  if (schema.action === 'for') {
    const sourceRole = schema.roles.find(r => r.role === 'source');
    if (!sourceRole) {
      items.push(
        createSchemaValidationItem(SchemaErrorCodes.FOR_LOOP_MISSING_SOURCE, 'warning', {})
      );
    }
  } else if (schema.action === 'while') {
    const conditionRole = schema.roles.find(r => r.role === 'condition');
    if (!conditionRole) {
      items.push(
        createSchemaValidationItem(SchemaErrorCodes.WHILE_LOOP_MISSING_CONDITION, 'warning', {})
      );
    }
  }
}

/**
 * Validate all command schemas in the registry.
 *
 * @param schemas - Map of action names to command schemas
 * @param options - Validation options
 * @returns Map of action names to validation results (only includes schemas with issues)
 */
export function validateAllSchemas(
  schemas: Record<string, CommandSchema>,
  options: { includeNotes?: boolean } = {}
): Map<string, SchemaValidationResult> {
  const results = new Map<string, SchemaValidationResult>();
  const { includeNotes = false } = options;

  for (const [action, schema] of Object.entries(schemas)) {
    const validation = validateCommandSchema(schema);

    // Include in results if there are warnings/errors (or notes if requested)
    const hasWarningsOrErrors = validation.items.some(
      i => i.severity === 'warning' || i.severity === 'error'
    );
    const hasNotes = includeNotes && validation.items.some(i => i.severity === 'note');

    if (hasWarningsOrErrors || hasNotes) {
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
  validations: Map<string, SchemaValidationResult>,
  options: { showNotes?: boolean; showCodes?: boolean } = {}
): string {
  const lines: string[] = [];
  const { showNotes = false, showCodes = true } = options;

  for (const [action, result] of validations) {
    const errors = result.items.filter(i => i.severity === 'error');
    const warnings = result.items.filter(i => i.severity === 'warning');
    const notes = result.items.filter(i => i.severity === 'note');

    if (errors.length > 0) {
      lines.push(`  ❌ ${action}:`);
      for (const item of errors) {
        const codeStr = showCodes ? ` [${item.code}]` : '';
        lines.push(`     ERROR${codeStr}: ${item.message}`);
        if (item.suggestion) {
          lines.push(`     💡 Suggestion: ${item.suggestion}`);
        }
      }
    }

    if (warnings.length > 0) {
      lines.push(`  ⚠️  ${action}:`);
      for (const item of warnings) {
        const codeStr = showCodes ? ` [${item.code}]` : '';
        lines.push(`     ${codeStr ? `${item.code}: ` : ''}${item.message}`);
        if (item.suggestion) {
          lines.push(`     💡 ${item.suggestion}`);
        }
      }
    }

    if (showNotes && notes.length > 0) {
      lines.push(`  ℹ️  ${action}:`);
      for (const item of notes) {
        const codeStr = showCodes ? ` [${item.code}]` : '';
        lines.push(`     ${codeStr ? `${item.code}: ` : ''}${item.message}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Get validation statistics.
 */
export function getValidationStats(validations: Map<string, SchemaValidationResult>): {
  totalCommands: number;
  errors: number;
  warnings: number;
  notes: number;
  byCode: Record<string, number>;
} {
  let errors = 0;
  let warnings = 0;
  let notes = 0;
  const byCode: Record<string, number> = {};

  for (const result of validations.values()) {
    for (const item of result.items) {
      if (item.severity === 'error') errors++;
      else if (item.severity === 'warning') warnings++;
      else if (item.severity === 'note') notes++;

      byCode[item.code] = (byCode[item.code] || 0) + 1;
    }
  }

  return {
    totalCommands: validations.size,
    errors,
    warnings,
    notes,
    byCode,
  };
}

// =============================================================================
// Keyword Collision Validation
// =============================================================================

/**
 * Collision type indicating how the keyword overlap occurs.
 */
export type KeywordCollisionType =
  | 'primary-primary'
  | 'primary-alternative'
  | 'alternative-alternative';

/**
 * A keyword collision between two or more commands in a language profile.
 */
export interface KeywordCollision {
  /** The colliding keyword string */
  keyword: string;
  /** Commands that share this keyword */
  commands: string[];
  /** How the collision occurs */
  type: KeywordCollisionType;
}

/**
 * Result of keyword collision validation for a single language profile.
 */
export interface KeywordCollisionResult {
  language: string;
  collisions: KeywordCollision[];
}

/**
 * Validate a language profile for keyword collisions.
 *
 * Checks both primary keywords and alternatives. Any keyword string that
 * appears in two or more commands (in any position) is reported as a collision.
 *
 * @param profile - Language profile to validate
 * @returns Validation result with all collisions found
 */
export function validateKeywordCollisions(profile: LanguageProfile): KeywordCollisionResult {
  const collisions: KeywordCollision[] = [];

  if (!profile.keywords) {
    return { language: profile.code, collisions };
  }

  // Build map: keyword string → [{ command, isPrimary }]
  const keywordUsage = new Map<string, Array<{ command: string; isPrimary: boolean }>>();

  for (const [command, translation] of Object.entries(profile.keywords)) {
    if (!translation || !translation.primary) continue;

    // Track primary
    const existing = keywordUsage.get(translation.primary) || [];
    existing.push({ command, isPrimary: true });
    keywordUsage.set(translation.primary, existing);

    // Track alternatives
    if (translation.alternatives) {
      for (const alt of translation.alternatives) {
        const altExisting = keywordUsage.get(alt) || [];
        altExisting.push({ command, isPrimary: false });
        keywordUsage.set(alt, altExisting);
      }
    }
  }

  // Find keywords used by multiple commands
  for (const [keyword, usages] of keywordUsage) {
    // Get unique commands
    const uniqueCommands = [...new Set(usages.map(u => u.command))];
    if (uniqueCommands.length <= 1) continue;

    // Determine collision type
    const primaryCount = usages.filter(u => u.isPrimary).length;
    let type: KeywordCollisionType;
    if (primaryCount >= 2) {
      type = 'primary-primary';
    } else if (primaryCount === 1) {
      type = 'primary-alternative';
    } else {
      type = 'alternative-alternative';
    }

    collisions.push({
      keyword,
      commands: uniqueCommands.sort(),
      type,
    });
  }

  // Sort: primary-primary first, then primary-alternative, then alternative-alternative
  const typeOrder: Record<KeywordCollisionType, number> = {
    'primary-primary': 0,
    'primary-alternative': 1,
    'alternative-alternative': 2,
  };
  collisions.sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);

  return { language: profile.code, collisions };
}

/**
 * Validate all language profiles for keyword collisions.
 *
 * @param profiles - Map of language code to profile
 * @returns Array of results (only languages with collisions)
 */
export function validateAllKeywordCollisions(
  profiles: Record<string, LanguageProfile>
): KeywordCollisionResult[] {
  const results: KeywordCollisionResult[] = [];

  for (const [, profile] of Object.entries(profiles)) {
    const result = validateKeywordCollisions(profile);
    if (result.collisions.length > 0) {
      results.push(result);
    }
  }

  return results.sort((a, b) => a.language.localeCompare(b.language));
}
