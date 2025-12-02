/**
 * HyperFixi - Hyperscript Expression Evaluation Engine
 * Main entry point for the public API
 */

// Export the main API
export { hyperscript, type HyperscriptAPI, type CompilationResult } from './api/hyperscript-api';

// Export core types for advanced usage
export type {
  ASTNode,
  ExecutionContext,
  ParseResult,
  ParseError,
  Token,
  CommandNode,
  ExpressionNode,
  FeatureNode,
  StatementNode,
  ElementType,
  ExpressionCategory,
} from './types/core';

// Export utilities for direct usage
export { parse } from './parser/parser';
export { Runtime, type RuntimeOptions } from './runtime/runtime';
export { RuntimeBase, type RuntimeBaseOptions } from './runtime/runtime-base';
export { createContext, createChildContext } from './core/context';
export { Lexer, Tokens } from './tokenizer';

// Export enhanced feature implementations
export {
  TypedDefFeatureImplementation,
  createDefFeature,
  createDef,
  enhancedDefImplementation,
  type DefInput,
  type DefOutput,
} from './features/def';

export {
  TypedOnFeatureImplementation,
  createOnFeature,
  createOn,
  enhancedOnImplementation,
  type EnhancedOnInput,
  type EnhancedOnOutput,
} from './features/on';

export {
  TypedBehaviorsFeatureImplementation,
  createBehaviorsFeature,
  createBehaviors,
  enhancedBehaviorsImplementation,
  type BehaviorsInput,
  type BehaviorsOutput,
} from './features/behaviors';

export {
  TypedSocketsFeatureImplementation,
  createSocketsFeature,
  createSockets,
  enhancedSocketsImplementation,
  type SocketsInput,
  type SocketsOutput,
} from './features/sockets';

export {
  TypedWebWorkerFeatureImplementation,
  createWebWorkerFeature,
  createWebWorker,
  enhancedWebWorkerImplementation,
  type WebWorkerInput,
  type WebWorkerOutput,
} from './features/webworker';

export {
  TypedEventSourceFeatureImplementation,
  createEventSourceFeature,
  createEventSource,
  enhancedEventSourceImplementation,
  type EventSourceInput,
  type EventSourceOutput,
} from './features/eventsource';

// Export enhanced context types
export type {
  TypedContextImplementation,
  ContextMetadata,
  EvaluationResult,
  EnhancedContextBase,
} from './types/context-types';

export type { ValidationResult, EvaluationType } from './types/base-types';

export type { LLMDocumentation } from './types/command-types';

// Export the main API as default
export { default } from './api/hyperscript-api';
