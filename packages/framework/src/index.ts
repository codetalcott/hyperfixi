/**
 * @lokascript/framework - Generic framework for building multilingual DSLs
 *
 * This framework provides the building blocks for creating domain-specific languages
 * that work across multiple human languages (English, Japanese, Spanish, etc.) with
 * semantic parsing and grammar transformation.
 *
 * @example
 * ```typescript
 * import { createMultilingualDSL } from '@lokascript/framework';
 *
 * const myDSL = createMultilingualDSL({
 *   schemas: [{ action: 'select', roles: [...] }],
 *   languages: [{ code: 'en', profile: {...}, tokenizer: {...} }],
 *   codeGenerator: (node) => generateSQL(node)
 * });
 *
 * myDSL.parse('select name from users', 'en');
 * myDSL.translate('select name from users', 'en', 'ja');
 * ```
 */

// Core types
export * from './core';

// Re-export submodules for convenience
export type {
  ActionType,
  SemanticRole,
  SemanticValue,
  SemanticNode,
  CommandSemanticNode,
  EventHandlerSemanticNode,
  ConditionalSemanticNode,
  CompoundSemanticNode,
  LoopSemanticNode,
  LiteralValue,
  SelectorValue,
  ReferenceValue,
  PropertyPathValue,
  ExpressionValue,
  SemanticMetadata,
  SourcePosition,
} from './core/types';

export {
  createLiteral,
  createSelector,
  createReference,
  createPropertyPath,
  createExpression,
  createCommandNode,
  createEventHandlerNode,
  createConditionalNode,
  createCompoundNode,
  createLoopNode,
} from './core/types';
