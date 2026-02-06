/**
 * AST Interchange Format Types (Semantic-local copy)
 *
 * These are structurally identical to the canonical types in
 * @lokascript/core/ast-utils/interchange/types.ts
 *
 * Duplicated here because the semantic package has no dependency on core.
 * TypeScript's structural typing ensures these are assignable to the
 * core package's versions when both are used by a consumer (e.g. AOT compiler).
 */

// =============================================================================
// BASE TYPE
// =============================================================================

export type InterchangeNode =
  | EventNode
  | CommandNode
  | LiteralNode
  | IdentifierNode
  | SelectorNode
  | VariableNode
  | BinaryNode
  | UnaryNode
  | MemberNode
  | PossessiveNode
  | CallNode
  | IfNode
  | RepeatNode
  | ForEachNode
  | WhileNode
  | PositionalNode;

/**
 * Position fields are optional — present when the source parser provides them,
 * absent for synthetically constructed nodes.
 */
export interface BaseNode {
  readonly type: string;
  /** Byte offset of node start in source (0-indexed). */
  readonly start?: number;
  /** Byte offset of node end in source (0-indexed, exclusive). */
  readonly end?: number;
  /** Source line number (1-indexed). */
  readonly line?: number;
  /** Column offset within line (0-indexed). */
  readonly column?: number;
}

// =============================================================================
// EXPRESSION NODES
// =============================================================================

export interface LiteralNode extends BaseNode {
  readonly type: 'literal';
  readonly value: string | number | boolean | null;
}

export interface IdentifierNode extends BaseNode {
  readonly type: 'identifier';
  readonly value: string;
  readonly name?: string;
}

export interface SelectorNode extends BaseNode {
  readonly type: 'selector';
  readonly value: string;
}

export interface VariableNode extends BaseNode {
  readonly type: 'variable';
  readonly name: string;
  readonly scope: 'local' | 'global' | 'element';
}

export interface BinaryNode extends BaseNode {
  readonly type: 'binary';
  readonly operator: string;
  readonly left: InterchangeNode;
  readonly right: InterchangeNode;
}

export interface UnaryNode extends BaseNode {
  readonly type: 'unary';
  readonly operator: string;
  readonly operand: InterchangeNode;
}

export interface MemberNode extends BaseNode {
  readonly type: 'member';
  readonly object: InterchangeNode;
  readonly property: string | InterchangeNode;
  readonly computed?: boolean;
}

export interface PossessiveNode extends BaseNode {
  readonly type: 'possessive';
  readonly object: InterchangeNode;
  readonly property: string;
}

export interface CallNode extends BaseNode {
  readonly type: 'call';
  readonly callee: InterchangeNode;
  readonly args?: InterchangeNode[];
}

export interface PositionalNode extends BaseNode {
  readonly type: 'positional';
  readonly position: 'first' | 'last' | 'next' | 'previous' | 'closest' | 'parent' | 'random';
  readonly target?: InterchangeNode;
}

// =============================================================================
// COMMAND & EVENT NODES
// =============================================================================

export interface CommandNode extends BaseNode {
  readonly type: 'command';
  readonly name: string;
  readonly args?: InterchangeNode[];
  readonly target?: InterchangeNode;
  readonly modifiers?: Record<string, unknown>;
}

export interface EventNode extends BaseNode {
  readonly type: 'event';
  readonly event: string;
  readonly modifiers?: EventModifiers;
  readonly body?: InterchangeNode[];
  readonly target?: InterchangeNode;
}

// =============================================================================
// CONTROL FLOW NODES
// =============================================================================

export interface IfNode extends BaseNode {
  readonly type: 'if';
  readonly condition: InterchangeNode;
  readonly thenBranch: InterchangeNode[];
  readonly elseBranch?: InterchangeNode[];
  readonly elseIfBranches?: ReadonlyArray<{
    readonly condition: InterchangeNode;
    readonly body: InterchangeNode[];
  }>;
}

export interface RepeatNode extends BaseNode {
  readonly type: 'repeat';
  readonly count?: number | InterchangeNode;
  readonly whileCondition?: InterchangeNode;
  readonly untilEvent?: string;
  readonly body: InterchangeNode[];
}

export interface ForEachNode extends BaseNode {
  readonly type: 'foreach';
  readonly itemName: string;
  readonly indexName?: string;
  readonly collection: InterchangeNode;
  readonly body: InterchangeNode[];
}

export interface WhileNode extends BaseNode {
  readonly type: 'while';
  readonly condition: InterchangeNode;
  readonly body: InterchangeNode[];
}

// =============================================================================
// EVENT MODIFIERS
// =============================================================================

export interface EventModifiers {
  readonly prevent?: boolean;
  readonly stop?: boolean;
  readonly once?: boolean;
  readonly passive?: boolean;
  readonly capture?: boolean;
  readonly debounce?: number;
  readonly throttle?: number;
  readonly from?: string;
}
