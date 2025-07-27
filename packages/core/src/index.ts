/**
 * HyperFixi - Hyperscript Expression Evaluation Engine
 * Main entry point for the public API
 */

// Export the main API
export { hyperscript, type HyperscriptAPI, type CompilationResult } from './api/hyperscript-api.js';

// Export core types for advanced usage
export type { 
  ASTNode, 
  ExecutionContext, 
  ParseResult, 
  ParseError,
  Token,
  CommandNode,
  ExpressionNode
} from './types/core.js';

// Export utilities for direct usage
export { parse } from './parser/parser.js';
export { Runtime, type RuntimeOptions } from './runtime/runtime.js';
export { createContext, createChildContext } from './core/context.js';
export { Lexer, Tokens, type Token } from './tokenizer.js';

// Export enhanced feature implementations
export {
  TypedDefFeatureImplementation,
  createDefFeature,
  createEnhancedDef,
  enhancedDefImplementation,
  type EnhancedDefInput,
  type EnhancedDefOutput
} from './features/enhanced-def.js';

export {
  TypedOnFeatureImplementation,
  createOnFeature,
  createEnhancedOn,
  enhancedOnImplementation,
  type EnhancedOnInput,
  type EnhancedOnOutput
} from './features/on.js';

export {
  TypedBehaviorsFeatureImplementation,
  createBehaviorsFeature,
  createEnhancedBehaviors,
  enhancedBehaviorsImplementation,
  type EnhancedBehaviorsInput,
  type EnhancedBehaviorsOutput
} from './features/enhanced-behaviors.js';

export {
  TypedSocketsFeatureImplementation,
  createSocketsFeature,
  createEnhancedSockets,
  enhancedSocketsImplementation,
  type EnhancedSocketsInput,
  type EnhancedSocketsOutput
} from './features/enhanced-sockets.js';

export {
  TypedWebWorkerFeatureImplementation,
  createWebWorkerFeature,
  createEnhancedWebWorker,
  enhancedWebWorkerImplementation,
  type EnhancedWebWorkerInput,
  type EnhancedWebWorkerOutput
} from './features/enhanced-webworker.js';

export {
  TypedEventSourceFeatureImplementation,
  createEventSourceFeature,
  createEnhancedEventSource,
  enhancedEventSourceImplementation,
  type EnhancedEventSourceInput,
  type EnhancedEventSourceOutput
} from './features/enhanced-eventsource.js';

// Export enhanced context types
export type {
  TypedContextImplementation,
  ContextMetadata,
  ValidationResult,
  EvaluationResult,
  EnhancedContextBase
} from './types/enhanced-context.js';

export type {
  LLMDocumentation,
  EvaluationType
} from './types/enhanced-core.js';

// Export the main API as default
export { default } from './api/hyperscript-api.js';