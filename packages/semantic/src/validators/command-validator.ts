/**
 * Per-Command Semantic Validation
 *
 * Validates semantic parse results against command schemas.
 * Ensures that role assignments match expected types and constraints.
 *
 * Design Philosophy:
 * - Command schemas are the source of truth for validation rules
 * - Validation happens AFTER pattern matching, BEFORE AST conversion
 * - Provides detailed error messages for debugging
 * - Supports confidence scoring for ambiguous parses
 *
 * Integration with core validators:
 * - Uses patterns from @hyperfixi/core's lightweight-validators where applicable
 * - Type validation follows same patterns as runtime validation
 * - Can be extended with custom validators using the same API
 */

import type {
  SemanticParseResult,
  SemanticValue,
  SemanticRole,
  ActionType,
  ExpectedType,
} from '../types';
import type { CommandSchema } from '../generators/command-schemas';
import { commandSchemas } from '../generators/command-schemas';

// =============================================================================
// Types
// =============================================================================

/**
 * Validation error with detailed context.
 */
export interface ValidationError {
  /** Error code for programmatic handling */
  code: 'MISSING_REQUIRED_ROLE' | 'INVALID_TYPE' | 'UNKNOWN_ROLE' | 'CONSTRAINT_VIOLATION';
  /** Human-readable message */
  message: string;
  /** The role that failed validation */
  role?: SemanticRole;
  /** Expected types */
  expected?: string[];
  /** Actual value */
  actual?: SemanticValue;
  /** Severity: 'error' blocks execution, 'warning' is logged */
  severity: 'error' | 'warning';
}

/**
 * Result of command validation.
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Validation errors (if any) */
  errors: ValidationError[];
  /** Warnings (non-blocking issues) */
  warnings: ValidationError[];
  /** Confidence adjustment (-1 to +1) based on validation */
  confidenceAdjustment: number;
  /** Suggested fixes for errors */
  suggestions: string[];
}

// =============================================================================
// Schema Registry
// =============================================================================

/**
 * Maps action types to their schemas.
 * Initialized from the full commandSchemas record (54 schemas).
 * Custom schemas can be added via registerSchema().
 */
const schemaRegistry = new Map<ActionType, CommandSchema>(
  Object.entries(commandSchemas) as [ActionType, CommandSchema][]
);

/**
 * Get schema for an action type.
 */
export function getSchema(action: ActionType): CommandSchema | undefined {
  return schemaRegistry.get(action);
}

/**
 * Register a custom schema.
 */
export function registerSchema(action: ActionType, schema: CommandSchema): void {
  schemaRegistry.set(action, schema);
}

// =============================================================================
// Type Validation
// =============================================================================

/**
 * Helper to get the string value from a semantic value (if it has one).
 */
function getStringValue(value: SemanticValue): string | undefined {
  if (value.type === 'literal' && typeof value.value === 'string') {
    return value.value;
  }
  if (value.type === 'selector') {
    return value.value;
  }
  if (value.type === 'reference') {
    return value.value;
  }
  // PropertyPathValue and ExpressionValue don't have a direct string value
  return undefined;
}

/**
 * Check if a semantic value matches expected types.
 */
function valueMatchesType(value: SemanticValue, expectedTypes: Array<ExpectedType>): boolean {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return false;
  }

  // Type-specific checks
  for (const expectedType of expectedTypes) {
    switch (expectedType) {
      case 'selector':
        // Selectors are strings starting with ., #, or [
        if (value.type === 'selector') {
          return true;
        }
        // Check if literal/reference looks like a selector
        const selectorStr = getStringValue(value);
        if (
          selectorStr &&
          (selectorStr.startsWith('.') ||
            selectorStr.startsWith('#') ||
            selectorStr.startsWith('['))
        ) {
          return true;
        }
        break;

      case 'literal':
        // Literals include strings, numbers, booleans
        if (value.type === 'literal') {
          return true;
        }
        // PropertyPathValue is also a valid value (e.g., "my value")
        if (value.type === 'property-path') {
          return true;
        }
        break;

      case 'reference':
        // References are special keywords (me, you, it, etc.)
        if (value.type === 'reference') {
          return true;
        }
        // PropertyPathValue represents a reference with property access
        if (value.type === 'property-path') {
          return true;
        }
        // Check if it looks like a reference
        const refStr = getStringValue(value);
        if (
          refStr &&
          ['me', 'you', 'it', 'my', 'its', 'result', 'event', 'target'].includes(
            refStr.toLowerCase()
          )
        ) {
          return true;
        }
        break;

      case 'expression':
        // Expressions are complex computed values
        if (value.type === 'expression') {
          return true;
        }
        // PropertyPathValue is essentially an expression
        if (value.type === 'property-path') {
          return true;
        }
        break;
    }
  }

  return false;
}

// =============================================================================
// Validation Logic
// =============================================================================

/**
 * Validate a semantic parse result against its command schema.
 *
 * @param result - The semantic parse result to validate
 * @returns Validation result with errors, warnings, and confidence adjustment
 */
export function validateSemanticResult(result: SemanticParseResult): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const suggestions: string[] = [];
  let confidenceAdjustment = 0;

  // Get schema for this action
  const schema = getSchema(result.action);
  if (!schema) {
    // No schema means we can't validate - pass through with warning
    warnings.push({
      code: 'UNKNOWN_ROLE',
      message: `No schema found for action '${result.action}'. Skipping validation.`,
      severity: 'warning',
    });
    return {
      valid: true,
      errors,
      warnings,
      confidenceAdjustment: -0.1, // Slight penalty for unknown command
      suggestions,
    };
  }

  // Create a map of assigned roles
  const assignedRoles = new Map<SemanticRole, SemanticValue>();
  for (const arg of result.arguments) {
    if (arg.role) {
      assignedRoles.set(arg.role, arg);
    }
  }

  // Validate each role spec
  for (const roleSpec of schema.roles) {
    const assignedValue = assignedRoles.get(roleSpec.role);

    // Check required roles
    if (roleSpec.required && !assignedValue) {
      // Check if there's a default
      if (roleSpec.default) {
        // Has default - just a warning
        warnings.push({
          code: 'MISSING_REQUIRED_ROLE',
          message: `Role '${roleSpec.role}' not provided, using default.`,
          role: roleSpec.role,
          severity: 'warning',
        });
      } else {
        // No default - error
        errors.push({
          code: 'MISSING_REQUIRED_ROLE',
          message: `Required role '${roleSpec.role}' (${roleSpec.description}) is missing.`,
          role: roleSpec.role,
          expected: roleSpec.expectedTypes,
          severity: 'error',
        });
        suggestions.push(`Add ${roleSpec.description.toLowerCase()} to the command.`);
        confidenceAdjustment -= 0.2;
      }
      continue;
    }

    // Validate type if value is provided
    if (assignedValue && !valueMatchesType(assignedValue, roleSpec.expectedTypes)) {
      warnings.push({
        code: 'INVALID_TYPE',
        message: `Role '${roleSpec.role}' expected ${roleSpec.expectedTypes.join(' or ')}, got ${assignedValue.type}.`,
        role: roleSpec.role,
        expected: roleSpec.expectedTypes,
        actual: assignedValue,
        severity: 'warning',
      });
      confidenceAdjustment -= 0.1;
    }
  }

  // Check for unknown roles
  for (const arg of result.arguments) {
    if (arg.role) {
      const isKnownRole = schema.roles.some(spec => spec.role === arg.role);
      if (!isKnownRole) {
        warnings.push({
          code: 'UNKNOWN_ROLE',
          message: `Role '${arg.role}' is not recognized for command '${result.action}'.`,
          role: arg.role,
          severity: 'warning',
        });
        confidenceAdjustment -= 0.05;
      }
    }
  }

  // Boost confidence if all required roles are properly typed
  const allRequiredPresent = schema.roles
    .filter(spec => spec.required && !spec.default)
    .every(spec => assignedRoles.has(spec.role));
  if (allRequiredPresent && errors.length === 0) {
    confidenceAdjustment += 0.1;
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    confidenceAdjustment: Math.max(-1, Math.min(1, confidenceAdjustment)),
    suggestions,
  };
}

/**
 * Apply validation to a parse result and adjust confidence.
 *
 * @param result - The semantic parse result
 * @returns Updated result with adjusted confidence
 */
export function validateAndAdjustConfidence(
  result: SemanticParseResult
): SemanticParseResult & { validation: ValidationResult } {
  const validation = validateSemanticResult(result);

  return {
    ...result,
    confidence: Math.max(0, Math.min(1, result.confidence + validation.confidenceAdjustment)),
    validation,
  };
}

// =============================================================================
// Relationship to Core Validators
// =============================================================================
//
// This semantic validator is distinct from but complementary to core validators:
//
// 1. @hyperfixi/core/validation/lightweight-validators.ts
//    - Runtime type validation (v.string(), v.object(), etc.)
//    - Zod-replacement for validating runtime input shapes
//    - Used: command inputs, API payloads, configuration
//
// 2. @hyperfixi/core/validation/command-pattern-validator.ts
//    - Class structure validation
//    - Checks command classes follow TypeScript patterns
//    - Used: CI/CD, development tooling
//
// 3. @lokascript/semantic/validators/command-validator.ts (this file)
//    - Semantic role validation
//    - Checks parse results against command schemas
//    - Used: semantic parser confidence scoring, debugging
//
// Future integration opportunity: Use lightweight-validators for type checking
// in valueMatchesType() for consistency with core validation patterns.
//
// =============================================================================
// Exports
// =============================================================================

export { schemaRegistry };
