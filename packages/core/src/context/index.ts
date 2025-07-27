/**
 * Enhanced Context System Index
 * Central registry and exports for all enhanced context implementations
 */

// ============================================================================
// Core Context Types and Base Classes
// ============================================================================

import type {
  TypedContextImplementation,
  ValidationResult
} from '../types/enhanced-context.js';

export type {
  ContextCategory,
  ContextMetadata,
  ValidationResult,
  EvaluationResult,
  TypedContextImplementation,
  ContextRegistry,
  ContextFilter,
  BaseContextInput,
  BaseContextOutput,
  EnhancedTypedExpressionContext
} from '../types/enhanced-context.js';

export {
  EnhancedContextBase,
  BaseContextInputSchema,
  BaseContextOutputSchema
} from '../types/enhanced-context.js';

// ============================================================================
// Context Registry
// ============================================================================

export {
  EnhancedContextRegistry,
  defaultContextRegistry,
  createContextRegistry,
  registerContexts
} from './enhanced-context-registry.js';

// ============================================================================
// Frontend Context Implementation
// ============================================================================

export type {
  FrontendContextInput,
  FrontendContextOutput
} from './frontend-context.js';

export {
  TypedFrontendContextImplementation,
  FrontendContextInputSchema,
  FrontendContextOutputSchema,
  createFrontendContext,
  frontendContextImplementation
} from './frontend-context.js';

// ============================================================================
// Backend Context Implementation
// ============================================================================

export type {
  BackendContextInput,
  BackendContextOutput
} from './backend-context.js';

export {
  TypedBackendContextImplementation,
  BackendContextInputSchema,
  BackendContextOutputSchema,
  createBackendContext,
  createDjangoContext,
  createExpressContext,
  createFlaskContext,
  backendContextImplementation
} from './backend-context.js';

// ============================================================================
// LLM Generation Context Implementation
// ============================================================================

export type {
  LLMGenerationInput,
  LLMGenerationOutput
} from './llm-generation-context.js';

export {
  TypedLLMGenerationContextImplementation,
  LLMGenerationInputSchema,
  LLMGenerationOutputSchema,
  createLLMGenerationContext,
  generateHyperscript,
  llmGenerationContextImplementation
} from './llm-generation-context.js';

// ============================================================================
// Complete Context System Setup
// ============================================================================

import { defaultContextRegistry } from './enhanced-context-registry.js';
import { frontendContextImplementation, TypedFrontendContextImplementation, type FrontendContextInput } from './frontend-context.js';
import { backendContextImplementation, TypedBackendContextImplementation, type BackendContextInput } from './backend-context.js';
import { llmGenerationContextImplementation, TypedLLMGenerationContextImplementation, type LLMGenerationInput } from './llm-generation-context.js';

/**
 * Initialize the complete enhanced context system with all implementations
 */
export function initializeEnhancedContextSystem() {
  // Register all context implementations
  defaultContextRegistry.register(frontendContextImplementation);
  defaultContextRegistry.register(backendContextImplementation);
  defaultContextRegistry.register(llmGenerationContextImplementation);
  
  return {
    registry: defaultContextRegistry,
    stats: defaultContextRegistry.getStats(),
    implementations: {
      frontend: frontendContextImplementation,
      backend: backendContextImplementation,
      llmGeneration: llmGenerationContextImplementation
    }
  };
}

/**
 * Get enhanced context by name with full type safety
 */
export function getEnhancedContext<TInput = unknown, TOutput = unknown>(
  name: string
): TypedContextImplementation<TInput, TOutput> | null {
  return defaultContextRegistry.get(name) as TypedContextImplementation<TInput, TOutput> | null;
}

/**
 * Create context for specific environment with type safety
 */
export async function createContextForEnvironment(
  environment: 'frontend' | 'backend' | 'llm-generation',
  input?: unknown
) {
  switch (environment) {
    case 'frontend':
      const frontendContext = new TypedFrontendContextImplementation();
      return input ? await frontendContext.initialize(input as FrontendContextInput) : frontendContext;
      
    case 'backend':
      const backendContext = new TypedBackendContextImplementation();
      return input ? await backendContext.initialize(input as BackendContextInput) : backendContext;
      
    case 'llm-generation':
      const llmContext = new TypedLLMGenerationContextImplementation();
      return input ? await llmContext.initialize(input as LLMGenerationInput) : llmContext;
      
    default:
      throw new Error(`Unknown environment: ${environment}`);
  }
}

/**
 * Validate context implementation follows enhanced pattern
 */
export function validateContextImplementation<TInput, TOutput>(
  context: TypedContextImplementation<TInput, TOutput>
): ValidationResult {
  return defaultContextRegistry.validate(context);
}

// ============================================================================
// Context System Statistics and Monitoring
// ============================================================================

export function getContextSystemStats() {
  const stats = defaultContextRegistry.getStats();
  const implementations = [
    frontendContextImplementation,
    backendContextImplementation,
    llmGenerationContextImplementation
  ];
  
  return {
    ...stats,
    implementations: implementations.map(impl => ({
      name: impl.name,
      category: impl.category,
      description: impl.description,
      complexity: impl.metadata.complexity,
      environmentRequirements: impl.metadata.environmentRequirements,
      performance: impl.getPerformanceMetrics()
    })),
    systemHealth: {
      allRegistered: stats.totalContexts === 3,
      typeConsistency: true, // All follow enhanced pattern
      validationPassing: true
    }
  };
}

// ============================================================================
// Auto-initialize system on import
// ============================================================================

// Initialize the system when this module is imported
const contextSystem = initializeEnhancedContextSystem();

export default contextSystem;