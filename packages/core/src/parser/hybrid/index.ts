/**
 * HyperFixi Hybrid Parser Module
 *
 * Tree-shakeable parser components for the hybrid parser.
 * Import only what you need:
 *
 * @example
 * ```typescript
 * // Full parser
 * import { HybridParser } from '@hyperfixi/core/parser/hybrid';
 *
 * // Just tokenizer
 * import { tokenize, Token } from '@hyperfixi/core/parser/hybrid';
 *
 * // Just aliases
 * import { addCommandAliases } from '@hyperfixi/core/parser/hybrid';
 * ```
 */

// Tokenizer
export { tokenize, KEYWORDS } from './tokenizer';
export type { Token, TokenType } from './tokenizer';

// AST Types
export type {
  ASTNode,
  CommandNode,
  BlockNode,
  EventNode,
  EventModifiers,
  SequenceNode,
  LiteralNode,
  IdentifierNode,
  SelectorNode,
  VariableNode,
  BinaryNode,
  UnaryNode,
  PossessiveNode,
  MemberNode,
  CallNode,
  PositionalNode,
  ObjectNode,
  ArrayNode,
} from './ast-types';

// Aliases
export {
  COMMAND_ALIASES,
  EVENT_ALIASES,
  normalizeCommand,
  normalizeEvent,
  addCommandAliases,
  addEventAliases,
} from './aliases';

// Parser
export { HybridParser } from './parser-core';
