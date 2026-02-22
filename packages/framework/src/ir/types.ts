/**
 * IR (Intermediate Representation) Types
 *
 * Types for the explicit bracket syntax, LLM JSON format, and
 * schema-based validation. These are domain-agnostic — they work
 * for any DSL built on the framework.
 */

import type { CommandSchema } from '../schema/command-schema';

// =============================================================================
// LLM JSON Format
// =============================================================================

/**
 * Structured input format for LLMs.
 * No parsing ambiguity — action and roles are explicitly typed.
 *
 * @example
 * ```json
 * {
 *   "action": "toggle",
 *   "roles": { "patient": { "type": "selector", "value": ".active" } },
 *   "trigger": { "event": "click" }
 * }
 * ```
 */
export interface SemanticJSON {
  /** The command/action name */
  action: string;
  /** Named semantic roles with typed values */
  roles: Record<string, SemanticJSONValue>;
  /** Optional event trigger (wraps command in event handler) */
  trigger?: {
    event: string;
    modifiers?: Record<string, unknown>;
  };
}

/**
 * A typed value in the LLM JSON format.
 */
export interface SemanticJSONValue {
  type: 'selector' | 'literal' | 'reference' | 'expression' | 'property-path' | 'flag';
  value: string | number | boolean;
}

// =============================================================================
// Schema Lookup
// =============================================================================

/**
 * Interface for optional schema-based role validation in the explicit parser.
 * Consumers provide this to validate roles against command definitions.
 *
 * When not provided, the parser accepts any role names.
 */
export interface SchemaLookup {
  getSchema(action: string): CommandSchema | undefined;
}

/**
 * Options for parseExplicit().
 */
export interface ParseExplicitOptions {
  /** Optional schema lookup for role validation */
  schemaLookup?: SchemaLookup;
  /** Custom set of valid reference names (defaults to DEFAULT_REFERENCES) */
  referenceSet?: ReadonlySet<string>;
}

// =============================================================================
// Diagnostics
// =============================================================================

/**
 * A diagnostic message from IR validation.
 *
 * Uses required `code` field (compatible with both framework Diagnostic
 * and compilation-service Diagnostic types via structural typing).
 */
export interface IRDiagnostic {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  suggestion?: string;
}
