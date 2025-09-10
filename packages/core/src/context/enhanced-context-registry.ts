/**
 * Enhanced Context Registry
 * Manages context implementations using proven enhanced pattern
 * Follows same architecture as enhanced expression registry
 */

import { v, type RuntimeValidator } from '../validation/lightweight-validators';
import type { 
  TypedContextImplementation,
  ContextRegistry,
  ContextFilter,
  ContextCategory,
  ValidationResult
} from '../types/enhanced-context';

// ============================================================================
// Context Registry Implementation
// ============================================================================

export class EnhancedContextRegistry implements ContextRegistry {
  private contexts = new Map<string, TypedContextImplementation<any, any>>();
  private categoryIndex = new Map<ContextCategory, Set<string>>();
  private frameworkIndex = new Map<string, Set<string>>();

  /**
   * Register a context implementation
   * Validates the context follows enhanced pattern
   */
  register<T extends TypedContextImplementation<any, any>>(context: T): void {
    // Validate context implementation
    const validation = this.validate(context);
    if (!validation.isValid) {
      throw new Error(`Context registration failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Register context
    this.contexts.set(context.name, context);
    
    // Update category index
    if (!this.categoryIndex.has(context.category)) {
      this.categoryIndex.set(context.category, new Set());
    }
    this.categoryIndex.get(context.category)!.add(context.name);
    
    // Update framework index if framework dependencies exist
    if (context.metadata.frameworkDependencies) {
      context.metadata.frameworkDependencies.forEach(framework => {
        if (!this.frameworkIndex.has(framework)) {
          this.frameworkIndex.set(framework, new Set());
        }
        this.frameworkIndex.get(framework)!.add(context.name);
      });
    }
  }

  /**
   * Get context by name
   */
  get<T>(name: string): TypedContextImplementation<any, any> | null {
    return this.contexts.get(name) || null;
  }

  /**
   * List all contexts by category
   */
  listByCategory(category: ContextCategory): TypedContextImplementation<any, any>[] {
    const contextNames = this.categoryIndex.get(category) || new Set();
    return Array.from(contextNames)
      .map(name => this.contexts.get(name))
      .filter((context): context is TypedContextImplementation<any, any> => context !== undefined);
  }

  /**
   * List contexts by filter criteria
   */
  list(filter?: ContextFilter): TypedContextImplementation<any, any>[] {
    let results = Array.from(this.contexts.values());

    if (filter?.category) {
      results = results.filter(context => context.category === filter.category);
    }

    if (filter?.framework) {
      results = results.filter(context => 
        context.metadata.frameworkDependencies?.includes(filter.framework!)
      );
    }

    if (filter?.capabilities) {
      results = results.filter(context =>
        filter.capabilities!.every(capability =>
          context.metadata.examples?.some(example => 
            example.description.toLowerCase().includes(capability.toLowerCase())
          )
        )
      );
    }

    if (filter?.environment) {
      results = results.filter(context => {
        const env = filter.environment!;
        const requirements = context.metadata.environmentRequirements;
        
        switch (env) {
          case 'frontend':
            return requirements?.browser === true;
          case 'backend':
            return requirements?.server === true || requirements?.nodejs === true || requirements?.python === true;
          case 'universal':
            return !requirements || (requirements.browser && (requirements.server || requirements.nodejs));
          default:
            return true;
        }
      });
    }

    return results;
  }

  /**
   * Validate context implementation follows enhanced pattern
   */
  validate<T extends TypedContextImplementation<any, any>>(context: T): ValidationResult {
    const errors: Array<{ type: string; message: string; path?: string }> = [];
    const suggestions: string[] = [];

    // Validate required properties exist
    if (!context.name || typeof context.name !== 'string') {
      errors.push({ type: 'missing-property', message: 'Context must have a string name property' });
    }

    if (!context.category) {
      errors.push({ type: 'missing-property', message: 'Context must have a category property' });
    }

    if (!context.description || typeof context.description !== 'string') {
      errors.push({ type: 'missing-property', message: 'Context must have a string description property' });
    }

    if (!context.inputSchema) {
      errors.push({ type: 'missing-property', message: 'Context must have an inputSchema (Zod schema)' });
    }

    if (!context.outputType) {
      errors.push({ type: 'missing-property', message: 'Context must have an outputType property' });
    }

    if (!context.metadata) {
      errors.push({ type: 'missing-property', message: 'Context must have metadata property' });
    } else {
      // Validate metadata structure
      if (!context.metadata.category) {
        errors.push({ type: 'invalid-metadata', message: 'Context metadata must include category' });
      }
      if (!context.metadata.complexity) {
        errors.push({ type: 'invalid-metadata', message: 'Context metadata must include complexity level' });
      }
      if (!Array.isArray(context.metadata.examples) || context.metadata.examples.length === 0) {
        errors.push({ type: 'invalid-metadata', message: 'Context metadata must include examples array' });
        suggestions.push('Add at least one usage example to metadata.examples');
      }
    }

    if (!context.documentation) {
      errors.push({ type: 'missing-property', message: 'Context must have documentation property' });
    } else {
      // Validate LLM documentation structure
      if (!context.documentation.summary || typeof context.documentation.summary !== 'string') {
        errors.push({ type: 'invalid-documentation', message: 'Context documentation must include summary' });
      }
      if (!Array.isArray(context.documentation.parameters)) {
        errors.push({ type: 'invalid-documentation', message: 'Context documentation must include parameters array' });
      }
      if (!context.documentation.returns) {
        errors.push({ type: 'invalid-documentation', message: 'Context documentation must include returns specification' });
      }
      if (!Array.isArray(context.documentation.examples) || context.documentation.examples.length === 0) {
        errors.push({ type: 'invalid-documentation', message: 'Context documentation must include examples' });
        suggestions.push('Add comprehensive examples to documentation for LLM training');
      }
      if (!Array.isArray(context.documentation.tags) || context.documentation.tags.length === 0) {
        errors.push({ type: 'invalid-documentation', message: 'Context documentation must include tags for discoverability' });
        suggestions.push('Add relevant tags like ["context", "frontend", "backend", etc.]');
      }
    }

    // Validate required methods exist
    if (typeof context.initialize !== 'function') {
      errors.push({ type: 'missing-method', message: 'Context must implement initialize method' });
    }

    if (typeof context.validate !== 'function') {
      errors.push({ type: 'missing-method', message: 'Context must implement validate method' });
    }

    // Check for naming conflicts
    if (this.contexts.has(context.name)) {
      errors.push({ 
        type: 'naming-conflict', 
        message: `Context with name "${context.name}" is already registered` 
      });
      suggestions.push('Use a unique name or unregister the existing context first');
    }

    // Validate Zod schema functionality
    if (context.inputSchema) {
      try {
        // Test schema with empty object
        context.inputSchema.safeParse({});
      } catch (error) {
        errors.push({
          type: 'invalid-schema',
          message: `Input schema validation failed: ${error instanceof Error ? error.message : String(error)}`
        });
        suggestions.push('Ensure inputSchema is a valid Zod schema');
      }
    }

    // Add general suggestions if errors exist
    if (errors.length > 0) {
      suggestions.push(
        'Follow the TypedContextImplementation pattern from enhanced expressions',
        'Refer to existing enhanced expression implementations for examples',
        'Ensure all required properties and methods are implemented'
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      suggestions
    };
  }

  /**
   * Unregister a context
   */
  unregister(name: string): boolean {
    const context = this.contexts.get(name);
    if (!context) {
      return false;
    }

    // Remove from main registry
    this.contexts.delete(name);

    // Remove from category index
    const categorySet = this.categoryIndex.get(context.category);
    if (categorySet) {
      categorySet.delete(name);
      if (categorySet.size === 0) {
        this.categoryIndex.delete(context.category);
      }
    }

    // Remove from framework index
    if (context.metadata.frameworkDependencies) {
      context.metadata.frameworkDependencies.forEach(framework => {
        const frameworkSet = this.frameworkIndex.get(framework);
        if (frameworkSet) {
          frameworkSet.delete(name);
          if (frameworkSet.size === 0) {
            this.frameworkIndex.delete(framework);
          }
        }
      });
    }

    return true;
  }

  /**
   * Get registry statistics
   */
  getStats() {
    const categoryCounts = new Map<ContextCategory, number>();
    const frameworkCounts = new Map<string, number>();

    for (const [category, contexts] of this.categoryIndex) {
      categoryCounts.set(category, contexts.size);
    }

    for (const [framework, contexts] of this.frameworkIndex) {
      frameworkCounts.set(framework, contexts.size);
    }

    return {
      totalContexts: this.contexts.size,
      categoryCounts: Object.fromEntries(categoryCounts),
      frameworkCounts: Object.fromEntries(frameworkCounts),
      categories: Array.from(this.categoryIndex.keys()),
      frameworks: Array.from(this.frameworkIndex.keys())
    };
  }

  /**
   * Clear all contexts (useful for testing)
   */
  clear(): void {
    this.contexts.clear();
    this.categoryIndex.clear();
    this.frameworkIndex.clear();
  }

  /**
   * Get all context names
   */
  getAllNames(): string[] {
    return Array.from(this.contexts.keys());
  }

  /**
   * Check if context exists
   */
  has(name: string): boolean {
    return this.contexts.has(name);
  }
}

// ============================================================================
// Default Registry Instance
// ============================================================================

export const defaultContextRegistry = new EnhancedContextRegistry();

// ============================================================================
// Registry Factory Function
// ============================================================================

export function createContextRegistry(): EnhancedContextRegistry {
  return new EnhancedContextRegistry();
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Register multiple contexts at once
 */
export function registerContexts(
  registry: EnhancedContextRegistry,
  contexts: TypedContextImplementation<any, any>[]
): ValidationResult {
  const errors: Array<{ type: string; message: string; path?: string }> = [];
  const suggestions: string[] = [];

  for (const context of contexts) {
    try {
      registry.register(context);
    } catch (error) {
      errors.push({
        type: 'registration-error',
        message: `Failed to register context "${context.name}": ${error instanceof Error ? error.message : String(error)}`,
        path: context.name
      });
    }
  }

  if (errors.length > 0) {
    suggestions.push(
      'Fix validation errors for failed context registrations',
      'Ensure all contexts follow the enhanced pattern requirements'
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    suggestions
  };
}