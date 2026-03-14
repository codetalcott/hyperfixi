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
  /**
   * When true, validation errors are collected as diagnostics on the
   * returned node instead of throwing. Fatal parse errors (missing brackets,
   * empty input) still throw. Default: false.
   */
  collectDiagnostics?: boolean;
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

// =============================================================================
// Protocol Full-Fidelity JSON Format
// =============================================================================
// These types match the wire format spec (protocol/spec/wire-format.md).
// Wire format has 3 node kinds; TS-only kinds (conditional, loop) are losslessly
// encoded as command nodes with v1.1 extension fields.
// property-path is flattened to expression.

export type ProtocolNodeKind = 'command' | 'event-handler' | 'compound';
export type ProtocolChainType = 'then' | 'and' | 'async' | 'sequential' | 'pipe';

/**
 * A typed semantic value in the protocol full-fidelity JSON format.
 * Matches protocol/spec/wire-format.md "Value Shapes" table.
 */
export interface ProtocolValueJSON {
  type: 'selector' | 'literal' | 'reference' | 'expression' | 'property-path' | 'flag';
  value?: string | number | boolean;
  dataType?: 'string' | 'number' | 'boolean' | 'duration';
  raw?: string; // expression only
  name?: string; // flag only
  enabled?: boolean; // flag only
  selectorKind?: 'id' | 'class' | 'attribute' | 'element' | 'complex'; // selector only, optional
}

/**
 * Protocol JSON node — matches protocol/spec/wire-format.md.
 * Produced by toProtocolJSON() and consumed by fromProtocolJSON().
 *
 * `kind` defaults to `"command"` when omitted.
 * `trigger` is convenience sugar that wraps a command in an event handler.
 */
export interface ProtocolNodeJSON {
  kind?: ProtocolNodeKind; // defaults to "command" when absent
  action: string;
  roles: Record<string, ProtocolValueJSON>;
  trigger?: { event: string; modifiers?: Record<string, unknown> }; // convenience sugar
  body?: ProtocolNodeJSON[]; // event-handler body OR try body (v1.2)
  statements?: ProtocolNodeJSON[]; // compound only
  chainType?: ProtocolChainType; // compound only
  // Conditional fields (v1.1)
  thenBranch?: ProtocolNodeJSON[];
  elseBranch?: ProtocolNodeJSON[];
  // Loop fields (v1.1)
  loopVariant?: 'forever' | 'times' | 'for' | 'while' | 'until';
  loopBody?: ProtocolNodeJSON[];
  loopVariable?: string;
  indexVariable?: string;
  // Type constraint diagnostics (v1.2)
  diagnostics?: ProtocolDiagnosticJSON[];
  // Metadata annotations (v1.2)
  annotations?: AnnotationJSON[];
  // Error handling: try/catch/finally (v1.2)
  catchBranch?: ProtocolNodeJSON[];
  finallyBranch?: ProtocolNodeJSON[];
  // Async coordination: all/race (v1.2)
  asyncVariant?: 'all' | 'race';
  asyncBody?: ProtocolNodeJSON[];
  // Pattern matching: match/arms (v1.2)
  arms?: MatchArmJSON[];
  defaultArm?: ProtocolNodeJSON[];
}

// =============================================================================
// v1.2 Sub-types
// =============================================================================

/** A diagnostic in protocol wire format (v1.2, extended v1.2.1). */
export interface ProtocolDiagnosticJSON {
  level: 'error' | 'warning' | 'info';
  role?: string;
  message: string;
  code?: string;
  /** v1.2.1: source parser/stage that produced this diagnostic. */
  source?: string;
  /** v1.2.1: actionable fix suggestions. */
  suggestions?: string[];
}

/** A metadata annotation in protocol wire format (v1.2). */
export interface AnnotationJSON {
  name: string;
  value?: string;
}

/** A match arm in protocol wire format (v1.2). */
export interface MatchArmJSON {
  pattern: ProtocolValueJSON;
  body: ProtocolNodeJSON[];
}

/** Versioned envelope for multi-node LSE documents (v1.2). */
export interface LSEEnvelopeJSON {
  lseVersion: string;
  features?: string[];
  nodes: ProtocolNodeJSON[];
}
