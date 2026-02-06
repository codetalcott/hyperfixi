/**
 * AST Interchange Format
 *
 * A shared, simplified AST representation that both the core parser and
 * semantic parser can convert to. This eliminates the need for parser-specific
 * adapter code in downstream tools (AOT compiler, language server, linters).
 *
 * Naming convention follows the hybrid parser's short names (unary, binary,
 * member, event) which the AOT compiler independently converged on.
 *
 * All node interfaces use a discriminated union on the `type` field,
 * enabling exhaustive `switch` checking in TypeScript.
 *
 * ## Current consumers
 * - **AOT compiler**: uses `fromCoreAST` / `fromSemanticAST` to normalize
 *   both parser outputs before code generation.
 * - **Language server**: uses `interchangeToLSPDiagnostics` (from `lsp.ts`)
 *   for structural diagnostics (complexity, code smells) on interchange nodes.
 * - **Roundtrip**: `toCoreAST` converts interchange back to core AST format
 *   for runtime fallback execution.
 *
 * ## Position Info
 * BaseNode includes optional position fields (`start`, `end`, `line`, `column`).
 * Converters (`fromCoreAST`, `fromSemanticAST`) preserve positions from source
 * nodes when available. Consumers that don't need positions simply ignore them.
 * The AOT compiler ignores positions; the language server uses them for LSP ranges.
 */

// =============================================================================
// BASE TYPE
// =============================================================================

/**
 * Discriminated union of all interchange AST node types.
 */
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
 * Base fields shared by all nodes. Not used directly — use InterchangeNode.
 *
 * Position fields are optional — present when the source parser provides them,
 * absent for synthetically constructed nodes (e.g. from tests or transformations).
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
  /** Optional: original identifier name if different from value */
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
  /** Semantic roles from the semantic parser (patient, destination, source, etc.). */
  readonly roles?: Readonly<Record<string, InterchangeNode>>;
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

/**
 * Normalized event modifiers. Both the core parser (flat properties) and
 * semantic parser (nested eventModifiers object) are normalized to this shape.
 */
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
