/**
 * Package lse implements the LokaScript Explicit Syntax (LSE) protocol.
 *
 * LSE is a language-agnostic, role-labeled intermediate representation for
 * imperative commands: [command role:value +flag ...]
 */

/** Discriminated union of semantic value types. */
export type ValueType =
  | 'selector'
  | 'literal'
  | 'reference'
  | 'expression'
  | 'property-path'
  | 'flag';

/** Kinds of semantic nodes. */
export type NodeKind = 'command' | 'event-handler' | 'compound';

/** Chain operators for compound statements. */
export type ChainType = 'then' | 'and' | 'async' | 'sequential' | 'pipe';

/** A single arm in a match command (v1.2). */
export interface MatchArm {
  pattern: SemanticValue;
  body: SemanticNode[];
}

/** A typed value in a role slot. */
export interface SemanticValue {
  type: ValueType;
  value?: string | number | boolean;
  dataType?: string;
  raw?: string;
  name?: string;
  enabled?: boolean;
  selectorKind?: 'id' | 'class' | 'attribute' | 'element' | 'complex';
}

/** Loop variant discriminant. */
export type LoopVariant = 'forever' | 'times' | 'for' | 'while' | 'until';

/** Async coordination variant discriminant (v1.2). */
export type AsyncVariant = 'all' | 'race';

/** A type constraint diagnostic (v1.2). */
export interface Diagnostic {
  level: 'error' | 'warning';
  role: string;
  message: string;
  code: string;
}

/** A metadata annotation on a node (v1.2). */
export interface Annotation {
  name: string;
  value?: string;
}

/** A parsed LSE node. */
export interface SemanticNode {
  kind: NodeKind;
  action: string;
  roles: Record<string, SemanticValue>;
  body?: SemanticNode[];
  statements?: SemanticNode[];
  chainType?: ChainType;
  // Conditional fields (v1.1)
  thenBranch?: SemanticNode[];
  elseBranch?: SemanticNode[];
  // Loop fields (v1.1)
  loopVariant?: LoopVariant;
  loopBody?: SemanticNode[];
  loopVariable?: string;
  indexVariable?: string;
  // Type constraint diagnostics (v1.2)
  diagnostics?: Diagnostic[];
  // Metadata annotations (v1.2)
  annotations?: Annotation[];
  // Error handling (v1.2): try/catch/finally
  catchBranch?: SemanticNode[];
  finallyBranch?: SemanticNode[];
  // Async coordination (v1.2): all/race
  asyncVariant?: AsyncVariant;
  asyncBody?: SemanticNode[];
  // Pattern matching (v1.2): match/arms
  arms?: MatchArm[];
  defaultArm?: SemanticNode[];
}

/** Wire format envelope with version metadata (v1.2). */
export interface LSEEnvelope {
  lseVersion: string;
  features?: string[];
  nodes: SemanticNode[];
}

// Constructor helpers

export function selectorValue(value: string): SemanticValue {
  return { type: 'selector', value };
}

export function literalValue(
  value: string | number | boolean,
  dataType: string,
): SemanticValue {
  return { type: 'literal', value, dataType };
}

export function referenceValue(value: string): SemanticValue {
  return { type: 'reference', value };
}

export function expressionValue(raw: string): SemanticValue {
  return { type: 'expression', raw };
}

export function flagValue(name: string, enabled: boolean): SemanticValue {
  return { type: 'flag', name, enabled };
}
