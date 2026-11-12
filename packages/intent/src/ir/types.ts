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
export type ProtocolChainType = 'then' | 'and' | 'async' | 'sequential';

export interface ProtocolValueJSON {
  type: 'selector' | 'literal' | 'reference' | 'expression' | 'property-path' | 'flag';
  value?: string | number | boolean;
  dataType?: 'string' | 'number' | 'boolean' | 'duration';
  raw?: string;
  name?: string;
  enabled?: boolean;
  selectorKind?: 'id' | 'class' | 'attribute' | 'element' | 'complex';
}

/** What every protocol node carries. */
interface ProtocolNodeBaseJSON {
  action: string;
  diagnostics?: ProtocolDiagnosticJSON[];
  annotations?: AnnotationJSON[];
}

/**
 * A command. `kind` may be left out. With `trigger` it is a handler around this
 * one command (the compact form); with `thenBranch`/`elseBranch` a conditional;
 * with `loopVariant` a loop; with `body` a block command (`tell`).
 */
export interface ProtocolCommandJSON extends ProtocolNodeBaseJSON {
  kind?: 'command';
  roles: Record<string, ProtocolValueJSON>;
  trigger?: { event: string; modifiers?: Record<string, unknown> };
  body?: ProtocolNodeJSON[];
  thenBranch?: ProtocolNodeJSON[];
  elseBranch?: ProtocolNodeJSON[];
  loopVariant?: string;
  loopBody?: ProtocolNodeJSON[];
  loopVariable?: string;
  indexVariable?: string;
  statements?: never;
  chainType?: never;
}

/** An event handler in the verbose form: its event in `roles`, its commands in `body`. */
export interface ProtocolEventHandlerJSON extends ProtocolNodeBaseJSON {
  kind: 'event-handler';
  roles: Record<string, ProtocolValueJSON>;
  body: ProtocolNodeJSON[];
  trigger?: never;
  statements?: never;
  chainType?: never;
  thenBranch?: never;
  elseBranch?: never;
  loopVariant?: never;
  loopBody?: never;
  loopVariable?: never;
  indexVariable?: never;
}

/** A chain of statements. It has no roles of its own. */
export interface ProtocolCompoundJSON extends ProtocolNodeBaseJSON {
  kind: 'compound';
  statements: ProtocolNodeJSON[];
  chainType?: ProtocolChainType;
  roles?: Record<string, never>;
  trigger?: never;
  body?: never;
  thenBranch?: never;
  elseBranch?: never;
  loopVariant?: never;
  loopBody?: never;
  loopVariable?: never;
  indexVariable?: never;
}

/**
 * A node of the wire format, discriminated by `kind` (absent means `command`).
 * A field on the wrong kind (`thenBranch` on a compound, `statements` on a
 * command) is a type error; it was one flat interface with every field optional.
 */
export type ProtocolNodeJSON =
  ProtocolCommandJSON | ProtocolEventHandlerJSON | ProtocolCompoundJSON;

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
