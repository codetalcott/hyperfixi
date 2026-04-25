/**
 * IR Types — Wire Format and Parse Options
 *
 * Types for the explicit bracket syntax, LLM JSON format, and
 * schema-based validation. Domain-agnostic.
 */

import type { CommandSchema } from '../schema';

// =============================================================================
// LLM JSON Format
// =============================================================================

/**
 * Structured input format for LLMs.
 * No parsing ambiguity — action and roles are explicitly typed.
 */
export interface SemanticJSON {
  action: string;
  roles: Record<string, SemanticJSONValue>;
  trigger?: {
    event: string;
    modifiers?: Record<string, unknown>;
  };
}

export interface SemanticJSONValue {
  type: 'selector' | 'literal' | 'reference' | 'expression' | 'property-path' | 'flag';
  value: string | number | boolean;
}

// =============================================================================
// Schema Lookup
// =============================================================================

/**
 * Interface for optional schema-based role validation in the explicit parser.
 */
export interface SchemaLookup {
  getSchema(action: string): CommandSchema | undefined;
}

/**
 * Options for parseExplicit().
 */
export interface ParseExplicitOptions {
  schemaLookup?: SchemaLookup;
  referenceSet?: ReadonlySet<string>;
  /**
   * When true, validation errors are collected as diagnostics on the
   * returned node instead of throwing. Fatal parse errors still throw.
   */
  collectDiagnostics?: boolean;
}

// =============================================================================
// Diagnostics
// =============================================================================

export interface IRDiagnostic {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  suggestion?: string;
}

// =============================================================================
// Protocol Full-Fidelity JSON Format
// =============================================================================

export type ProtocolNodeKind = 'command' | 'event-handler' | 'compound';
export type ProtocolChainType = 'then' | 'and' | 'async' | 'sequential' | 'pipe';

export interface ProtocolValueJSON {
  type: 'selector' | 'literal' | 'reference' | 'expression' | 'property-path' | 'flag';
  value?: string | number | boolean;
  dataType?: 'string' | 'number' | 'boolean' | 'duration';
  raw?: string;
  name?: string;
  enabled?: boolean;
  selectorKind?: 'id' | 'class' | 'attribute' | 'element' | 'complex';
}

export interface ProtocolNodeJSON {
  kind?: ProtocolNodeKind;
  action: string;
  roles: Record<string, ProtocolValueJSON>;
  trigger?: { event: string; modifiers?: Record<string, unknown> };
  body?: ProtocolNodeJSON[];
  statements?: ProtocolNodeJSON[];
  chainType?: ProtocolChainType;
  // v1.1 conditional fields
  thenBranch?: ProtocolNodeJSON[];
  elseBranch?: ProtocolNodeJSON[];
  // v1.1 loop fields
  loopVariant?: string;
  loopBody?: ProtocolNodeJSON[];
  loopVariable?: string;
  indexVariable?: string;
  // v1.2 fields
  diagnostics?: ProtocolDiagnosticJSON[];
  annotations?: AnnotationJSON[];
  catchBranch?: ProtocolNodeJSON[];
  finallyBranch?: ProtocolNodeJSON[];
  asyncVariant?: 'all' | 'race';
  asyncBody?: ProtocolNodeJSON[];
  arms?: MatchArmJSON[];
  defaultArm?: ProtocolNodeJSON[];
}

// =============================================================================
// v1.2 Sub-types
// =============================================================================

export interface ProtocolDiagnosticJSON {
  level: 'error' | 'warning' | 'info';
  role?: string;
  message: string;
  code?: string;
  source?: string;
  suggestions?: string[];
}

export interface AnnotationJSON {
  name: string;
  value?: string;
}

export interface MatchArmJSON {
  pattern: ProtocolValueJSON;
  body: ProtocolNodeJSON[];
}

export interface LSEEnvelopeJSON {
  lseVersion: string;
  features?: string[];
  nodes: ProtocolNodeJSON[];
}
