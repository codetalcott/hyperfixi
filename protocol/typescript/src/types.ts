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
export type ChainType = 'then' | 'and' | 'async' | 'sequential';

/** A typed value in a role slot. */
export interface SemanticValue {
  type: ValueType;
  value?: string | number | boolean;
  dataType?: string;
  raw?: string;
  name?: string;
  enabled?: boolean;
}

/** A parsed LSE node. */
export interface SemanticNode {
  kind: NodeKind;
  action: string;
  roles: Record<string, SemanticValue>;
  body?: SemanticNode[];
  statements?: SemanticNode[];
  chainType?: ChainType;
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
