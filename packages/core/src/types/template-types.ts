/**
 * Enhanced Template Types for HyperScript Template System
 * Provides deep TypeScript integration for template directives with comprehensive validation
 * Follows the enhanced typing pattern established for expressions and commands
 */

import { v } from '../validation/lightweight-validators';
import type {
  BaseTypedExpression,
  TypedExpressionContext,
  EvaluationResult,
  ValidationResult,
  LLMDocumentation,
} from './base-types';
import type { HyperScriptValue } from './command-types';
import type { ExecutionContext } from './core.ts';

// ============================================================================
// Enhanced Template Context
// ============================================================================

/**
 * Enhanced context specifically for template execution
 * Extends TypedExpressionContext with template-specific properties
 */
export interface TemplateExecutionContext extends TypedExpressionContext {
  /** Template result buffer for content accumulation */
  readonly templateBuffer: string[];

  /** Current template depth for nested directive handling */
  readonly templateDepth: number;

  /** Template iteration context for @repeat directives */
  readonly iterationContext?: {
    collection: HyperScriptValue;
    currentIndex: number;
    currentItem: HyperScriptValue;
    totalItems: number;
  };

  /** Conditional context for @if/@else chains */
  readonly conditionalContext?:
    | {
        conditionMet: boolean;
        elseAllowed: boolean;
        branchExecuted: boolean;
      }
    | undefined;

  /** Template execution metadata */
  readonly templateMeta: {
    templateName?: string;
    compiledAt: number;
    executionStartTime: number;
    directiveStack: string[];
  };
}

// ============================================================================
// Template Directive Types
// ============================================================================

/**
 * Union type of all supported template directive types
 */
export type TemplateDirectiveType = '@if' | '@else' | '@repeat' | '@include' | '@end';

/**
 * Render strategy for template directives
 */
export type TemplateRenderStrategy = 'replace' | 'append' | 'conditional' | 'iterate';

/**
 * Base interface for enhanced template directives
 * Extends BaseTypedExpression with template-specific functionality
 */
export interface EnhancedTemplateDirective<TInput = unknown, TOutput = string>
  extends BaseTypedExpression<TOutput> {
  /** Template directive type (@if, @else, @repeat, etc.) */
  readonly directiveType: TemplateDirectiveType;

  /** How this directive renders content */
  readonly renderStrategy: TemplateRenderStrategy;

  /** Whether this directive creates a new scope */
  readonly createsScope: boolean;

  /** Whether this directive can be nested inside others */
  readonly allowsNesting: boolean;

  /** Directives that can follow this one */
  readonly allowedNext: TemplateDirectiveType[];

  /** Enhanced template execution method */
  executeTemplate(
    context: TemplateExecutionContext,
    input: TInput,
    templateContent: string
  ): Promise<EvaluationResult<string>>;

  /** Validate template context and input */
  validateTemplateContext(context: TemplateExecutionContext, input: TInput): ValidationResult;
}

// ============================================================================
// Specific Directive Input Types
// ============================================================================

/**
 * Input schema for @if directive
 */
export const IfDirectiveInputSchema = v.object({
  condition: v.any(), // Any value that can be evaluated for truthiness
  templateContent: v.string(),
});

export type IfDirectiveInput = any; // Inferred from RuntimeValidator

/**
 * Input schema for @else directive
 */
export const ElseDirectiveInputSchema = v.object({
  templateContent: v.string(),
});

export type ElseDirectiveInput = any; // Inferred from RuntimeValidator

/**
 * Input schema for @repeat directive
 */
export const RepeatDirectiveInputSchema = v.object({
  collection: v.any(), // Collection to iterate over
  iteratorVariable: v.string().optional(), // Variable name for current item (defaults to 'it')
  templateContent: v.string(),
});

export type RepeatDirectiveInput = any; // Inferred from RuntimeValidator

// ============================================================================
// Template Compilation Types
// ============================================================================

/**
 * Enhanced compiled template with type safety
 */
export interface EnhancedCompiledTemplate {
  /** Enhanced template directives */
  directives: EnhancedTemplateDirective[];

  /** Static content segments */
  content: string[];

  /** Template interpolation expressions */
  interpolations: Array<{
    expression: string;
    startIndex: number;
    endIndex: number;
    evaluatedType?: string;
  }>;

  /** Template metadata */
  metadata: {
    originalTemplate: string;
    compiledAt: number;
    directiveCount: number;
    interpolationCount: number;
    estimatedComplexity: 'simple' | 'medium' | 'complex';
  };

  /** Template dependencies */
  dependencies: {
    requiredVariables: string[];
    usedFeatures: string[];
    nestedTemplates: string[];
  };
}

// ============================================================================
// Template Error Types
// ============================================================================

/**
 * Enhanced template-specific error types
 */
export interface TemplateError {
  readonly name: 'TemplateCompilationError' | 'TemplateExecutionError' | 'TemplateValidationError';
  readonly message: string;
  readonly code: string;
  readonly templateName?: string;
  readonly lineNumber?: number;
  readonly columnNumber?: number;
  readonly directiveType?: TemplateDirectiveType;
  readonly suggestions: string[];
  readonly context?: {
    originalTemplate: string;
    compiledDirectives: string[];
    executionStack: string[];
  };
}

// ============================================================================
// Template Performance Types
// ============================================================================

/**
 * Template performance metrics
 */
export interface TemplatePerformanceMetrics {
  readonly compilationTime: number;
  readonly executionTime: number;
  readonly renderTime: number;
  readonly memoryUsage: number;
  readonly cacheHits: number;
  readonly cacheMisses: number;
  readonly directiveExecutions: Record<TemplateDirectiveType, number>;
}

// ============================================================================
// Template Configuration
// ============================================================================

/**
 * Enhanced template system configuration
 */
export interface EnhancedTemplateConfig {
  /** Enable template caching */
  enableCaching: boolean;

  /** Maximum template cache size */
  maxCacheSize: number;

  /** Enable performance metrics collection */
  enableMetrics: boolean;

  /** Enable template validation */
  enableValidation: boolean;

  /** Template execution timeout (ms) */
  executionTimeout: number;

  /** Maximum template nesting depth */
  maxNestingDepth: number;

  /** Custom directive plugins */
  customDirectives: Record<string, EnhancedTemplateDirective>;

  /** Template preprocessing hooks */
  preprocessors: Array<(template: string) => string>;

  /** Template postprocessing hooks */
  postprocessors: Array<(result: string) => string>;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Context bridge for converting ExecutionContext to TemplateExecutionContext
 */
export interface TemplateContextBridge {
  toTemplateContext(
    context: ExecutionContext,
    options?: {
      templateName?: string;
      initialBuffer?: string[];
      iterationContext?: TemplateExecutionContext['iterationContext'];
    }
  ): TemplateExecutionContext;

  fromTemplateContext(
    templateContext: TemplateExecutionContext,
    originalContext: ExecutionContext
  ): ExecutionContext;
}

/**
 * Template directive registry for managing enhanced directives
 */
export interface TemplateDirectiveRegistry {
  register<T extends TemplateDirective>(directive: T): void;
  get(directiveType: TemplateDirectiveType): EnhancedTemplateDirective | undefined;
  has(directiveType: TemplateDirectiveType): boolean;
  list(): TemplateDirectiveType[];
  validate(directiveType: TemplateDirectiveType, input: unknown): ValidationResult;
}

// ============================================================================
// LLM Documentation Types
// ============================================================================

/**
 * Template-specific LLM documentation
 */
export interface TemplateLLMDocumentation extends LLMDocumentation {
  /** Template usage patterns */
  patterns: Array<{
    name: string;
    template: string;
    context: Record<string, unknown>;
    expectedOutput: string;
    explanation: string;
  }>;

  /** Directive combinations */
  combinations: Array<{
    directives: TemplateDirectiveType[];
    description: string;
    example: string;
    useCase: string;
  }>;

  /** Common template errors and solutions */
  troubleshooting: Array<{
    error: string;
    cause: string;
    solution: string;
    prevention: string;
  }>;
}

// ============================================================================
// Standard Template Types (Industry Standards)
// ============================================================================

/**
 * Standard template literal types commonly used in JavaScript/TypeScript ecosystems
 * Based on Template Literal Types from TypeScript 4.1+ and common templating patterns
 */
export type TemplateStringLiteral<T extends string> = T;

/**
 * Standard interpolation pattern for ${expression} syntax
 */
export type InterpolationPattern = `\${${string}}`;

/**
 * Standard directive pattern for @directive syntax
 */
export type DirectivePattern = `@${string}`;

/**
 * Common template data types used across templating systems
 */
export type TemplateDataTypes =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number | boolean | null | undefined | Record<string, unknown>>
  | Record<string, string | number | boolean | null | undefined | Array<unknown>>;

/**
 * Standard template context interface
 * Compatible with most JavaScript templating systems (Handlebars, Mustache, EJS, etc.)
 */
export interface StandardTemplateContext {
  /** Current data scope */
  readonly data: Record<string, TemplateDataTypes>;

  /** Parent context (for nested scopes) */
  readonly parent?: StandardTemplateContext;

  /** Helper functions */
  readonly helpers: Record<string, (...args: unknown[]) => unknown>;

  /** Partial templates */
  readonly partials: Record<string, string>;

  /** Template options */
  readonly options: Record<string, unknown>;
}

// Re-export for convenience
export type {
  BaseTypedExpression,
  TypedExpressionContext,
  ExpressionMetadata,
  ValidationResult,
  LLMDocumentation,
} from './expression-types';
