/**
 * Enhanced Context Types for HyperFixi
 * Extends TypedExpressionImplementation pattern to context management
 * Building on proven enhanced expression architecture
 */

import type { RuntimeValidator } from '../validation/lightweight-validators';
import { v, z } from '../validation/lightweight-validators';
import type {
  TypedExpressionContext,
  EvaluationType,
  ExpressionMetadata,
  ValidationResult,
} from './expression-types';
import type { LLMDocumentation } from './command-types';

// ============================================================================
// Enhanced Context Result Types
// ============================================================================

export interface EvaluationResult<TOutput> {
  success: boolean;
  value?: TOutput;
  errors?: Array<{ type: string; message: string; path?: string }>;
  suggestions?: string[];
  type?: EvaluationType;
}

// ============================================================================
// Context Categories
// ============================================================================

export type ContextCategory = 'Frontend' | 'Backend' | 'Universal' | 'SSR' | 'Testing';

// ============================================================================
// Base Context Metadata (extends ExpressionMetadata pattern)
// ============================================================================

export interface ContextMetadata extends Omit<ExpressionMetadata, 'category'> {
  /** Context category for environment-specific behavior */
  category: ContextCategory;
  /** Related context implementations */
  relatedContexts?: string[];
  /** Framework-specific dependencies */
  frameworkDependencies?: string[];
  /** Environment requirements */
  environmentRequirements?: {
    browser?: boolean;
    server?: boolean;
    nodejs?: boolean;
    python?: boolean;
  };
}

// ============================================================================
// TypedContextImplementation Interface (follows TypedExpressionImplementation)
// ============================================================================

export interface TypedContextImplementation<TInput, TOutput> {
  /** Context identifier */
  readonly name: string;
  /** Context category */
  readonly category: ContextCategory;
  /** Human-readable description */
  readonly description: string;
  /** Runtime validator for input validation */
  readonly inputSchema: RuntimeValidator<TInput>;
  /** Expected output type */
  readonly outputType: EvaluationType;
  /** Context metadata for tooling */
  readonly metadata: ContextMetadata;
  /** LLM-compatible documentation */
  readonly documentation?: LLMDocumentation; // Optional

  /** Initialize context with validated input */
  initialize(input: TInput): Promise<EvaluationResult<TOutput>>;

  /** Validate input using runtime validator */
  validate(input: unknown): ValidationResult;

  /** Performance tracking */
  trackPerformance?(startTime: number, success: boolean, output?: any): void;
}

// ============================================================================
// Enhanced Context Base Class
// ============================================================================

export abstract class ContextBase<TInput, TOutput>
  implements TypedContextImplementation<TInput, TOutput>
{
  abstract readonly name: string;
  abstract readonly category: ContextCategory;
  abstract readonly description: string;
  abstract readonly inputSchema: RuntimeValidator<TInput>;
  abstract readonly outputType: EvaluationType;
  abstract readonly metadata: ContextMetadata;
  abstract readonly documentation?: LLMDocumentation; // Optional

  /** Evaluation history for performance tracking */
  protected evaluationHistory: Array<{
    contextName: string;
    category: ContextCategory;
    input: string;
    output: any;
    timestamp: number;
    duration: number;
    success: boolean;
  }> = [];

  abstract initialize(input: TInput): Promise<EvaluationResult<TOutput>>;

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);

      if (!parsed.success) {
        return {
          isValid: false,
          errors:
            parsed.error?.errors.map((err: any) => ({
              type: 'type-mismatch' as const,
              message: `Invalid ${this.category.toLowerCase()} context input: ${err.message}`,
              path: err.path?.join('.') || 'root',
              suggestions: [],
            })) || [],
          suggestions: this.generateValidationSuggestions(parsed.error!),
        };
      }

      // Additional context-specific validation
      const contextValidation = this.validateContextSpecific(parsed.data as TInput);
      if (!contextValidation.isValid) {
        return contextValidation;
      }

      return {
        isValid: true,
        errors: [],
        suggestions: [],
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [
          {
            type: 'runtime-error',
            message: `Context validation failed: ${error instanceof Error ? error.message : String(error)}`,
            suggestions: [],
          },
        ],
        suggestions: ['Check input structure and types', 'Verify context requirements'],
      };
    }
  }

  protected validateContextSpecific(_data: TInput): ValidationResult {
    // Override in subclasses for context-specific validation
    return { isValid: true, errors: [], suggestions: [] };
  }

  protected generateValidationSuggestions(error: any): string[] {
    const suggestions = [
      `Ensure all required ${this.category.toLowerCase()} context properties are provided`,
      'Check property types match the expected schema',
    ];

    // Add context-specific suggestions based on error
    if (error.errors.some((e: { path: unknown[] }) => e.path.includes('variables'))) {
      suggestions.push('Verify variable types and values');
    }
    if (error.errors.some((e: { path: unknown[] }) => e.path.includes('environment'))) {
      suggestions.push('Check environment configuration is valid');
    }

    return suggestions;
  }

  public trackPerformance(startTime: number, success: boolean, output?: any): void {
    this.evaluationHistory.push({
      contextName: this.name,
      category: this.category,
      input: 'context initialization',
      output: success ? (output ? 'context created' : 'success') : 'error',
      timestamp: startTime,
      duration: Date.now() - startTime,
      success,
    });
  }

  /** Get performance metrics */
  getPerformanceMetrics() {
    return {
      totalInitializations: this.evaluationHistory.length,
      successRate:
        this.evaluationHistory.filter(h => h.success).length / this.evaluationHistory.length,
      averageDuration:
        this.evaluationHistory.reduce((sum, h) => sum + h.duration, 0) /
        this.evaluationHistory.length,
      recentPerformance: this.evaluationHistory.slice(-10),
    };
  }
}

// ============================================================================
// Context Input/Output Schemas
// ============================================================================

// Base schemas that can be extended
export const BaseContextInputSchema = v
  .object({
    /** Environment type */
    environment: z.enum(['frontend', 'backend', 'universal', 'testing']).optional(),
    /** Context variables */
    variables: z.record(v.string(), v.unknown()).optional(),
    /** Debug mode */
    debug: v.boolean().optional().default(false),
    /** Performance tracking enabled */
    trackPerformance: v.boolean().optional().default(true),
  })
  .strict();

export const BaseContextOutputSchema = v
  .object({
    /** Context identifier */
    contextId: v.string(),
    /** Initialization timestamp */
    timestamp: v.number(),
    /** Context category */
    category: z.enum(['Frontend', 'Backend', 'Universal', 'SSR', 'Testing']),
    /** Available methods and properties */
    capabilities: v.array(v.string()),
    /** Context state */
    state: z.enum(['initializing', 'ready', 'error']),
    /** Error information if state is error */
    error: v.string().optional(),
  })
  .strict();

export type BaseContextInput = any; // z.infer<typeof BaseContextInputSchema>;
export type BaseContextOutput = any; // z.infer<typeof BaseContextOutputSchema>;

// ============================================================================
// Enhanced TypedExpressionContext Extension
// ============================================================================

export interface EnhancedTypedExpressionContext extends TypedExpressionContext {
  /** Context category for environment-aware behavior */
  contextCategory?: ContextCategory;
  /** Framework-specific data */
  framework?: {
    name: 'django' | 'flask' | 'express' | 'fastapi' | 'vanilla';
    version?: string;
    capabilities?: string[];
  };
  /** Enhanced performance tracking */
  performanceTracking?: {
    enabled: boolean;
    includeMemoryUsage: boolean;
    includeNetworkMetrics: boolean;
  };
  /** Context-specific services */
  services?: {
    logger?: any;
    cache?: any;
    database?: any;
    queue?: any;
  };
}

// ============================================================================
// Utility Types for Context Registry
// ============================================================================

export interface ContextRegistry {
  /** Register a context implementation */
  register<T extends TypedContextImplementation<any, any>>(context: T): void;

  /** Get context by name */
  get<_T>(name: string): TypedContextImplementation<any, any> | null;

  /** List all contexts by category */
  listByCategory(category: ContextCategory): TypedContextImplementation<any, any>[];

  /** Validate context registration */
  validate<T extends TypedContextImplementation<any, any>>(context: T): ValidationResult;
}

export interface ContextFilter {
  category?: ContextCategory;
  environment?: 'frontend' | 'backend' | 'universal';
  framework?: string;
  capabilities?: string[];
}
