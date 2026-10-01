/**
 * The engine's node types.
 *
 * A node is plain typed data plus the closure that runs it. The closure is bound
 * once, when the node is parsed, so execution never re-reads syntax: an
 * expression has `ev`, a command has `run`, a feature has `install`. Every
 * member of the unions below is discriminated by `type`.
 */
import type { MaybeP } from './util';

// ---------------------------------------------------------------------------
// Execution context
// ---------------------------------------------------------------------------

export interface Meta {
  /** The element whose script this is. */
  owner: unknown;
  feature?: Feature;
  /** The event, while an `on …[filter]` expression is being evaluated. */
  context?: unknown;
  returned?: boolean;
  returnValue?: unknown;
}

export interface Ctx {
  me: unknown;
  you: unknown;
  result: unknown;
  /** The element under test inside a `when` / `where` clause; `it` reads it first. */
  beingTested: unknown;
  event: unknown;
  target: unknown;
  detail: unknown;
  sender: unknown;
  body: unknown;
  locals: Record<string, unknown>;
  meta: Meta;
}

// ---------------------------------------------------------------------------
// Control flow: what a command returns when it is not "carry on"
// ---------------------------------------------------------------------------

export type Signal = { k: 'return'; value: unknown } | { k: 'break' } | { k: 'continue' };
export type Completion = Signal | void;

// ---------------------------------------------------------------------------
// Nodes
// ---------------------------------------------------------------------------

export interface Node {
  type: string;
  /** Source offsets, `[start, end)`. */
  start: number;
  end: number;
}

/**
 * What every expression has. The optional members are the small protocol other
 * grammar rules read without knowing the concrete kind: a selector-like value
 * exposes `css`, a chained access exposes its `root`, and an assignable
 * expression has `lhs` (evaluate what the write needs) and `put` (do the write).
 */
export interface Expr extends Node {
  ev(ctx: Ctx): unknown;
  lhs?(ctx: Ctx): unknown;
  put?(ctx: Ctx, lhs: unknown, value: unknown): void;
  del?(ctx: Ctx, lhs: unknown): void;
  /** The value, for an expression that needs no context (a literal, `200ms`). */
  stat?(): unknown;
  css?: string;
  root?: Expr;
  /** Symbol, attribute or style name. */
  name?: string;
  /** Property name of a property access. */
  prop?: string;
  /** On a `where` clause inside `for x in …`: the loop variable each item is bound to. */
  varName?: string;
}

export type Scope = 'local' | 'element' | 'global' | 'inherited';

export interface SymbolNode extends Expr {
  type: 'symbol';
  name: string;
  scope: Scope;
}
export interface LiteralNode extends Expr {
  type: 'boolean' | 'null' | 'number';
  value: boolean | null | number;
}
export interface StringNode extends Expr {
  type: 'string';
  value: string;
  /** Present on a backtick string: literal text interleaved with expressions. */
  parts?: (string | Expr)[];
}
export interface ArrayNode extends Expr {
  type: 'arrayLiteral';
  values: Expr[];
}
export interface ObjectNode extends Expr {
  type: 'objectLiteral';
  keys: (string | Expr)[];
  values: Expr[];
}
export interface NamedArgsNode extends Expr {
  type: 'namedArgumentList';
  names: string[];
  values: Expr[];
}
export interface ParenNode extends Expr {
  type: 'parenthesized';
  expr: Expr;
}
export interface IdRefNode extends Expr {
  type: 'idRef';
  /** Absent on `#{expr}`. */
  value?: string;
  expr?: Expr;
}
export interface ClassRefNode extends Expr {
  type: 'classRef';
  /** Absent on `.{expr}`. */
  className?: string;
  expr?: Expr;
}
export interface QueryRefNode extends Expr {
  type: 'queryRef';
  css: string;
  parts?: (string | Expr)[];
}
export interface AttributeRefNode extends Expr {
  type: 'attributeRef';
  name: string;
  css: string;
  value?: string;
}
export interface StyleRefNode extends Expr {
  type: 'styleRef' | 'computedStyleRef';
  name: string;
}
export interface StyleLiteralNode extends Expr {
  type: 'styleLiteral';
  parts: string[];
  exprs: Expr[];
}
export interface ImplicitMeNode extends Expr {
  type: 'implicitMeTarget';
}
export interface PathNode extends Expr {
  type: 'dotOrColonPath' | 'eventName';
  value: string;
}
export interface PropertyAccessNode extends Expr {
  type: 'propertyAccess';
  root: Expr;
  prop: string;
}
export interface OfNode extends Expr {
  type: 'ofExpression';
  root: Expr;
  name: string;
  kind: 'property' | 'attribute' | 'style' | 'computed';
}
export interface PossessiveNode extends Expr {
  type: 'possessive';
  root: Expr;
  prop?: string;
  attribute?: AttributeRefNode | StyleRefNode;
}
export interface InNode extends Expr {
  type: 'inExpression';
  root: Expr;
  target: Expr;
}
export interface AsNode extends Expr {
  type: 'asExpression';
  root: Expr;
  conversion: string;
}
export interface CallNode extends Expr {
  type: 'functionCall';
  root: Expr;
  args: Expr[];
}
export interface AttributeAccessNode extends Expr {
  type: 'attributeRefAccess';
  root: Expr;
  attribute: AttributeRefNode;
}
export interface IndexNode extends Expr {
  type: 'arrayIndex';
  root: Expr;
  first: Expr;
  second?: Expr;
  andBefore: boolean;
  andAfter: boolean;
}
export interface UnaryNode extends Expr {
  type: 'logicalNot' | 'negativeNumber' | 'noExpression' | 'some' | 'beepExpression';
  root: Expr;
}
export interface PostfixNode extends Expr {
  type: 'timeExpression' | 'stringPostfixExpression' | 'typeCheckExpression';
  root: Expr;
  /** Time factor in ms, CSS unit, or type name. */
  suffix: number | string;
}
export interface BinaryNode extends Expr {
  type: 'mathOperator' | 'logicalOperator';
  operator: string;
  left: Expr;
  right: Expr;
}
export interface ComparisonNode extends Expr {
  type: 'comparisonOperator';
  operator: string;
  left: Expr;
  right?: Expr;
  right2?: Expr;
  typeName?: string;
  ignoringCase: boolean;
}
export interface BlockLiteralNode extends Expr {
  type: 'blockLiteral';
  params: string[];
  expr: Expr;
}
export interface PositionalNode extends Expr {
  type: 'positionalExpression';
  operator: string;
  root: Expr;
}
export interface RelativeNode extends Expr {
  type: 'relativePositionalExpression';
  operator: string;
  thing: Expr;
  from: Expr;
  inElt?: Expr;
  withinElt?: Expr;
  wrapping: boolean;
}
export interface ClosestNode extends Expr {
  type: 'closestExpr';
  css: string;
  parentSearch: boolean;
  to: Expr;
}
export interface CollectionNode extends Expr {
  type: 'collectionExpression';
  operator: 'where' | 'sorted' | 'mapped' | 'split' | 'joined';
  root: Expr;
  operand: Expr;
  descending?: boolean;
}

export type AnyExpr =
  | SymbolNode
  | LiteralNode
  | StringNode
  | ArrayNode
  | ObjectNode
  | NamedArgsNode
  | ParenNode
  | IdRefNode
  | ClassRefNode
  | QueryRefNode
  | AttributeRefNode
  | StyleRefNode
  | StyleLiteralNode
  | ImplicitMeNode
  | PathNode
  | PropertyAccessNode
  | OfNode
  | PossessiveNode
  | InNode
  | AsNode
  | CallNode
  | AttributeAccessNode
  | IndexNode
  | UnaryNode
  | PostfixNode
  | BinaryNode
  | ComparisonNode
  | BlockLiteralNode
  | PositionalNode
  | RelativeNode
  | ClosestNode
  | CollectionNode;

/** A command: its own typed fields (declared by the module that parses it) plus `run`. */
export interface Cmd extends Node {
  run(ctx: Ctx): MaybeP<Completion>;
}

export interface Feature extends Node {
  /** `on click or keyup`, for traces. */
  displayName?: string;
  /** Set on the features of a `behavior`: they share that behavior's variable scope. */
  behavior?: string;
  install(target: unknown, source: unknown): void;
}

/** The optional `catch` / `finally` blocks of a handler or a function. */
export interface Handlers {
  errorSymbol?: string;
  errorHandler?: Cmd[];
  finallyHandler?: Cmd[];
}

export interface Program extends Node {
  type: 'hyperscript';
  features: Feature[];
}
