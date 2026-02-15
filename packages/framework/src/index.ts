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

// Main API
export * from './api';

// Interfaces (for dependency injection)
export * from './interfaces';

// Core modules
export * from './schema';
export * from './generation';

// Grammar exports - explicitly list to avoid PatternMatcher conflict with core
export { GrammarTransformer } from './grammar/transformer';
export type { TransformerConfig } from './grammar/transformer';
export { reorderRoles, insertMarkers, joinTokens } from './grammar/types';
export type {
  LanguageProfile,
  PatternTransform,
  ParsedElement,
  WordOrder,
  GrammaticalMarker,
  AdpositionType,
} from './grammar/types';

// Core - export classes and utilities
export * from './core';

// Re-export key types for convenience
export type {
  ActionType,
  SemanticRole as SemanticRoleType,
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
  LanguageToken,
  TokenStream,
  LanguageTokenizer,
  LanguagePattern,
} from './core/types';

export type { CommandSchema, RoleSpec } from './schema';

export type {
  LanguageConfig,
  DSLConfig,
  MultilingualDSL,
  CodeGenerator,
  ValidationResult,
  CompileResult,
} from './api';

// Re-export helper functions
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
  extractValue,
  extractRoleValue,
} from './core/types';

export { defineCommand, defineRole } from './schema';
export { createSimpleTokenizer } from './core/tokenization/base-tokenizer';
export type { SimpleTokenizerConfig } from './core/tokenization/base-tokenizer';
