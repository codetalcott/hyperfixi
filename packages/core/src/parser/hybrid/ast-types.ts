/**
 * HyperFixi Hybrid Parser - AST Types
 *
 * Type definitions for the Abstract Syntax Tree nodes.
 */

export interface ASTNode {
  type: string;
  [key: string]: any;
}

export interface CommandNode extends ASTNode {
  type: 'command';
  name: string;
  args: ASTNode[];
  target?: ASTNode;
  modifier?: string;
}

export interface BlockNode extends ASTNode {
  type: 'if' | 'repeat' | 'for' | 'while' | 'fetch';
  condition?: ASTNode;
  body: ASTNode[];
  elseBody?: ASTNode[];
}

export interface EventModifiers {
  once?: boolean;
  prevent?: boolean;
  stop?: boolean;
  debounce?: number;
  throttle?: number;
}

export interface EventNode extends ASTNode {
  type: 'event';
  event: string;
  filter?: ASTNode;
  modifiers: EventModifiers;
  body: ASTNode[];
}

export interface SequenceNode extends ASTNode {
  type: 'sequence';
  commands: ASTNode[];
}

export interface LiteralNode extends ASTNode {
  type: 'literal';
  value: any;
  unit?: string;
}

export interface IdentifierNode extends ASTNode {
  type: 'identifier';
  value: string;
}

export interface SelectorNode extends ASTNode {
  type: 'selector';
  value: string;
}

export interface VariableNode extends ASTNode {
  type: 'variable';
  name: string;
  scope: 'local' | 'global';
}

export interface BinaryNode extends ASTNode {
  type: 'binary';
  operator: string;
  left: ASTNode;
  right: ASTNode;
}

export interface UnaryNode extends ASTNode {
  type: 'unary';
  operator: string;
  operand: ASTNode;
}

export interface PossessiveNode extends ASTNode {
  type: 'possessive';
  object: ASTNode;
  property: string;
}

export interface MemberNode extends ASTNode {
  type: 'member';
  object: ASTNode;
  property: ASTNode | string;
  computed?: boolean;
}

export interface CallNode extends ASTNode {
  type: 'call';
  callee: ASTNode;
  args: ASTNode[];
}

export interface PositionalNode extends ASTNode {
  type: 'positional';
  position: string;
  target: ASTNode;
}

export interface ObjectNode extends ASTNode {
  type: 'object';
  properties: Array<{ key: string; value: ASTNode }>;
}

export interface ArrayNode extends ASTNode {
  type: 'array';
  elements: ASTNode[];
}
