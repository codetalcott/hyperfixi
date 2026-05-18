/**
 * Semantic → Interchange AST Converter
 */

export { fromSemanticAST } from './from-semantic';
export type { InterchangeNode, EventModifiers } from './types';

// Re-export all type-level exports for consumers
export type {
  EventNode,
  CommandNode,
  LiteralNode,
  IdentifierNode,
  SelectorNode,
  VariableNode,
  BinaryNode,
  UnaryNode,
  MemberNode,
  PossessiveNode,
  CallNode,
  IfNode,
  RepeatNode,
  ForEachNode,
  WhileNode,
  PositionalNode,
  ErrorNode,
} from './types';
