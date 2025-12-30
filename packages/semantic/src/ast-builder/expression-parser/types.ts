/**
 * Expression Parser Types
 *
 * Defines AST node types for expressions that can be shared between
 * the semantic package (AST building) and core package (runtime).
 *
 * These types are intentionally minimal and focused on expressions only.
 */

// =============================================================================
// Base Types
// =============================================================================

/**
 * Base interface for all expression AST nodes
 */
export interface ExpressionNode {
  readonly type: string;
  readonly start?: number | undefined;
  readonly end?: number | undefined;
  readonly line?: number | undefined;
  readonly column?: number | undefined;
}

// =============================================================================
// Literal Nodes
// =============================================================================

export interface LiteralNode extends ExpressionNode {
  readonly type: 'literal';
  readonly value: string | number | boolean | null | undefined;
  readonly raw?: string | undefined;
  readonly dataType?: 'string' | 'number' | 'boolean' | 'null' | 'undefined' | 'duration' | undefined;
}

export interface TemplateLiteralNode extends ExpressionNode {
  readonly type: 'templateLiteral';
  readonly value: string;
}

// =============================================================================
// Selector Nodes
// =============================================================================

export type SelectorKind = 'id' | 'class' | 'attribute' | 'element' | 'query' | 'complex';

export interface SelectorNode extends ExpressionNode {
  readonly type: 'selector' | 'cssSelector' | 'idRef' | 'classRef';
  readonly value?: string;
  readonly selector?: string;
  readonly selectorType?: SelectorKind;
}

// =============================================================================
// Reference Nodes
// =============================================================================

export type ContextType = 'me' | 'you' | 'it' | 'its' | 'my' | 'your' | 'result' | 'event' | 'target' | 'body' | 'detail';

export interface ContextReferenceNode extends ExpressionNode {
  readonly type: 'contextReference' | 'symbol';
  readonly contextType?: ContextType;
  readonly name?: string;
}

export interface IdentifierNode extends ExpressionNode {
  readonly type: 'identifier';
  readonly name: string;
  readonly scope?: 'local' | 'global' | 'element';
}

// =============================================================================
// Property Access Nodes
// =============================================================================

export interface PropertyAccessNode extends ExpressionNode {
  readonly type: 'propertyAccess';
  readonly object: ExpressionNode;
  readonly property: string;
}

export interface MemberExpressionNode extends ExpressionNode {
  readonly type: 'memberExpression';
  readonly object: ExpressionNode;
  readonly property: ExpressionNode;
  readonly computed?: boolean;
}

export interface PossessiveExpressionNode extends ExpressionNode {
  readonly type: 'possessiveExpression';
  readonly object: ExpressionNode;
  readonly property: ExpressionNode | string;
}

// =============================================================================
// Binary/Unary Expression Nodes
// =============================================================================

export interface BinaryExpressionNode extends ExpressionNode {
  readonly type: 'binaryExpression';
  readonly operator: string;
  readonly left: ExpressionNode;
  readonly right: ExpressionNode;
}

export interface UnaryExpressionNode extends ExpressionNode {
  readonly type: 'unaryExpression';
  readonly operator: string;
  readonly operand: ExpressionNode;
  readonly prefix?: boolean;
}

// =============================================================================
// Call Expression Nodes
// =============================================================================

export interface CallExpressionNode extends ExpressionNode {
  readonly type: 'callExpression' | 'functionCall';
  readonly callee: ExpressionNode | string;
  readonly arguments: ExpressionNode[];
}

// =============================================================================
// Array/Object Nodes
// =============================================================================

export interface ArrayLiteralNode extends ExpressionNode {
  readonly type: 'arrayLiteral';
  readonly elements: ExpressionNode[];
}

export interface ObjectLiteralNode extends ExpressionNode {
  readonly type: 'objectLiteral';
  readonly properties: ObjectPropertyNode[];
}

export interface ObjectPropertyNode extends ExpressionNode {
  readonly type: 'objectProperty';
  readonly key: string | ExpressionNode;
  readonly value: ExpressionNode;
  readonly computed?: boolean;
}

// =============================================================================
// Special Nodes
// =============================================================================

export interface TimeExpressionNode extends ExpressionNode {
  readonly type: 'timeExpression';
  readonly value: number;
  readonly unit: 'ms' | 's' | 'seconds' | 'milliseconds' | 'minutes' | 'hours';
  readonly raw?: string | undefined;
}

export interface ErrorNode extends ExpressionNode {
  readonly type: 'error';
  readonly message?: string;
}

// =============================================================================
// Union Type for All Expression Nodes
// =============================================================================

export type AnyExpressionNode =
  | LiteralNode
  | TemplateLiteralNode
  | SelectorNode
  | ContextReferenceNode
  | IdentifierNode
  | PropertyAccessNode
  | MemberExpressionNode
  | PossessiveExpressionNode
  | BinaryExpressionNode
  | UnaryExpressionNode
  | CallExpressionNode
  | ArrayLiteralNode
  | ObjectLiteralNode
  | TimeExpressionNode
  | ErrorNode;

// =============================================================================
// Parse Result
// =============================================================================

export interface ExpressionParseResult {
  readonly success: boolean;
  readonly node?: ExpressionNode;
  readonly error?: string;
  readonly consumed?: number;
}
