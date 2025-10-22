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
  ExpressionNode
} from './types/core';

// Export utilities for direct usage
export { parse } from './parser/parser';
export { Runtime, type RuntimeOptions } from './runtime/runtime';
export { createContext, createChildContext } from './core/context';
export { Lexer, Tokens, type Token } from './tokenizer';

// Export enhanced feature implementations
export {
  TypedDefFeatureImplementation,
  createDefFeature,
  createEnhancedDef,
  enhancedDefImplementation,
  type EnhancedDefInput,
  type EnhancedDefOutput
} from './features/enhanced-def';

export {
  TypedOnFeatureImplementation,
  createOnFeature,
  createEnhancedOn,
  enhancedOnImplementation,
  type EnhancedOnInput,
  type EnhancedOnOutput
} from './features/on';

export {
  TypedBehaviorsFeatureImplementation,
  createBehaviorsFeature,
  createEnhancedBehaviors,
  enhancedBehaviorsImplementation,
  type EnhancedBehaviorsInput,
  type EnhancedBehaviorsOutput
} from './features/enhanced-behaviors';

export {
  TypedSocketsFeatureImplementation,
  createSocketsFeature,
  createEnhancedSockets,
  enhancedSocketsImplementation,
  type EnhancedSocketsInput,
  type EnhancedSocketsOutput
} from './features/enhanced-sockets';

export {
  TypedWebWorkerFeatureImplementation,
  createWebWorkerFeature,
  createEnhancedWebWorker,
  enhancedWebWorkerImplementation,
  type EnhancedWebWorkerInput,
  type EnhancedWebWorkerOutput
} from './features/enhanced-webworker';

export {
  TypedEventSourceFeatureImplementation,
  createEventSourceFeature,
  createEnhancedEventSource,
  enhancedEventSourceImplementation,
  type EnhancedEventSourceInput,
  type EnhancedEventSourceOutput
} from './features/enhanced-eventsource';

// Export enhanced context types
export type {
  TypedContextImplementation,
  ContextMetadata,
  EvaluationResult,
  EnhancedContextBase
} from './types/enhanced-context';

export type { ValidationResult, EvaluationType } from './types/base-types';

export type {
  LLMDocumentation
} from './types/enhanced-core';

// Export the main API as default
export { default } from './api/hyperscript-api';