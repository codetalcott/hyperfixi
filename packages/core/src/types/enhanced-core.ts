

/**
 * Enhanced Core Types - Deep TypeScript Integration
 * Designed for LLM code agents with maximum type safety
 * 
 * IMPORTANT: Core types now imported from base-types.ts for consistency
 * This file now focuses on enhanced features while using unified base types
 */

import type { RuntimeValidator } from '../validation/lightweight-validators';
import { v, z } from '../validation/lightweight-validators';
// ============================================================================
// Import Unified Types
// ============================================================================

// Import from base type system
import type {
  ValidationResult,
  ValidationError,
  TypedResult,
  HyperScriptValueType,
  EvaluationType,
  EvaluationResult,
  TypedExecutionContext
} from './base-types';

// ============================================================================
// Re-export Unified Types with Legacy Names
// ============================================================================

// Enhanced-specific type aliases - re-export from base types
export type {
  ExecutionContext,
  TypedExecutionContext,
  TypedExecutionContext as TypedExpressionContext,
  ValidationResult,
  TypedResult,
  LLMDocumentation
} from './base-types';

// ============================================================================
// Enhanced Type System for LLM Agents
// ============================================================================

/**
 * Use unified HyperScript value type
 */
export type HyperScriptValue = unknown;

/**
 * Strongly typed evaluation results with error handling
 */
/**
 * Use unified result type
 */
export type { EvaluationResult } from './base-types';

/**
 * Runtime type validation schema
 */
export const HyperScriptValueSchema = v.union([
  v.string(),
  v.number(),
  v.boolean(),
  v.null(),
  v.undefined(),
  v.custom((value: unknown) => value instanceof HTMLElement),
  v.array(v.custom((value: unknown) => value instanceof HTMLElement)),
  z.record(v.string(), v.unknown()), // Will be refined recursively
  v.array(v.unknown())
]);

// TypedExecutionContext and TypedExpressionContext now imported from base-types.ts above

/**
 * Legacy ExecutionMeta for enhanced-core compatibility
 */
export interface ExecutionMeta {
  readonly startTime: number;
  readonly commandStack: string[];
  readonly sourceLocation?: SourceLocation;
  readonly debugMode: boolean;
}

/**
 * Source location information for enhanced debugging
 */
export interface SourceLocation {
  readonly line: number;
  readonly column: number;
  readonly source: string;
}

// ============================================================================
// Enhanced Command Interface for LLM Type Safety
// ============================================================================

/**
 * Generic command interface with input/output type constraints
 */
export interface TypedCommandImplementation<
  TInput extends readonly HyperScriptValue[] = readonly HyperScriptValue[],
  TOutput extends HyperScriptValue = HyperScriptValue,
  TContext extends TypedExecutionContext = TypedExecutionContext
> {
  /** Command name - must be literal for LLM understanding */
  readonly name: string;
  
  /** Human-readable syntax - for LLM documentation */
  readonly syntax: string;
  
  /** Detailed description for LLMs */
  readonly description: string;
  
  /** Input parameter schema for validation */
  readonly inputSchema: RuntimeValidator<TInput>;
  
  /** Output type information for LLMs */
  readonly outputType: HyperScriptValueType;
  
  /** Type-safe execution with validated inputs */
  execute(context: TContext, ...args: TInput): Promise<TypedResult<TOutput>>;
  
  /** Compile-time validation for static analysis */
  validate(args: unknown[]): ValidationResult;
  
  /** Runtime metadata */
  readonly metadata: CommandMetadata;
}

/**
 * Command metadata for LLM understanding
 */
export interface CommandMetadata {
  readonly category: CommandCategory;
  readonly complexity: 'simple' | 'medium' | 'complex';
  readonly sideEffects: SideEffect[];
  readonly examples: CommandExample[];
  readonly relatedCommands: string[];
}

// Define command category
export type CommandCategory = 'DOM' | 'Event' | 'Control' | 'Data' | 'Communication' | 'Style';

// Define side effect type
export type SideEffect = string;

export interface CommandExample {
  readonly code: string;
  readonly description: string;
  readonly expectedOutput: HyperScriptValue;
}

// ============================================================================
// Enhanced Expression Interface
// ============================================================================

/**
 * Type-safe expression evaluation with return type inference
 */
export interface TypedExpressionImplementation<
  TOutput extends HyperScriptValue = HyperScriptValue,
  TContext extends TypedExecutionContext = TypedExecutionContext
> {
  readonly name: string;
  readonly category: ExpressionCategory;
  readonly precedence: number;
  readonly associativity: 'left' | 'right' | 'none';
  
  /** Output type for LLM inference */
  readonly outputType: string;
  
  /** Type-safe evaluation */
  evaluate(context: TContext, ...args: HyperScriptValue[]): Promise<EvaluationResult<TOutput>>;
  
  /** Static analysis information */
  readonly analysisInfo: ExpressionAnalysisInfo;
}

export interface ExpressionAnalysisInfo {
  readonly isPure: boolean;
  readonly canThrow: boolean;
  readonly complexity: 'O(1)' | 'O(n)' | 'O(n²)' | 'O(log n)';
  readonly dependencies: string[];
}

// ============================================================================
// Type System Enums and Utilities
// ============================================================================

// Use UnifiedHyperScriptValueType from unified-types.ts instead of local definition
export type { UnifiedHyperScriptValueType as HyperScriptValueType } from './unified-types';

export type ExpressionCategory = 
  | 'reference'
  | 'logical'
  | 'comparison'
  | 'arithmetic'
  | 'string'
  | 'array'
  | 'object'
  | 'conversion'
  | 'special';

// ValidationResult and ValidationError now imported from base-types.ts above

/**
 * Enhanced validation error for backward compatibility with legacy enhanced-core usage
 */
export interface EnhancedValidationError extends ValidationError {
  readonly position?: SourceLocation;
  readonly suggestion?: string;
}

export interface HyperScriptError {
  readonly name: string;
  readonly message: string;
  readonly code: string;
  readonly source?: SourceLocation;
  readonly cause?: Error;
  readonly suggestions: string[];
}

// ============================================================================
// Runtime Type Utilities for LLM Agents
// ============================================================================

/**
 * Runtime type checking with detailed feedback for LLMs
 */
export class TypeChecker {
  static getType(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'function') return 'function';
    if (value instanceof Promise) return 'promise';
    if (value instanceof HTMLElement) return 'element';
    if (value instanceof NodeList || (Array.isArray(value) && value.every(v => v instanceof HTMLElement))) {
      return 'element-list';
    }
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    
    throw new Error(`Unknown type for value: ${value}`);
  }

  static validateType(value: unknown, expectedType: string): ValidationResult {
    const actualType = this.getType(value);
    
    if (actualType === expectedType) {
      return { isValid: true, errors: [], suggestions: [] };
    }
    
    return {
      isValid: false,
      errors: [{
        type: 'type-mismatch',
        message: `Expected ${expectedType}, got ${actualType}`,
        suggestions: [this.getTypeSuggestion(actualType, expectedType)]
      }],
      suggestions: [this.getTypeSuggestion(actualType, expectedType)]
    };
  }
  
  private static getTypeSuggestion(actual: string, expected: string): string {
    const conversions: Record<string, Record<string, string>> = {
      string: {
        number: 'Use parseFloat() or parseInt() to convert string to number',
        boolean: 'Use Boolean() or check if string is "true"/"false"',
      },
      number: {
        string: 'Use toString() or String() to convert number to string',
        boolean: 'Use Boolean() - 0 is false, everything else is true',
      },
      // Add more conversion suggestions...
    };
    
    return conversions[actual]?.[expected] || `Convert ${actual} to ${expected}`;
  }
}

// ============================================================================
// LLM-Friendly Documentation Types  
// ============================================================================

// LLMDocumentation is imported from base-types.ts

export interface ParameterDoc {
  readonly name: string;
  readonly type: string;
  readonly description: string;
  readonly optional: boolean;
  readonly defaultValue?: HyperScriptValue;
  readonly examples: string[];
}

export interface ReturnDoc {
  readonly type: string;
  readonly description: string;
  readonly examples: HyperScriptValue[];
}

export interface DocumentationExample {
  readonly title: string;
  readonly code: string;
  readonly explanation: string;
  readonly output: HyperScriptValue;
}

// ============================================================================
// HyperScript Program Types - Complete Program Representation
// ============================================================================

/**
 * Complete hyperscript program type for comprehensive type coverage
 * Represents a full hyperscript program from source to executable form
 * Designed for LLM agents with rich metadata and type safety
 */
export interface HyperScriptProgram {
  /** Original hyperscript source code */
  readonly source: string;
  
  /** Parsed features that compose this program */
  readonly features: HyperScriptFeature[];
  
  /** Program compilation and execution metadata */
  readonly metadata: ProgramMetadata;
  
  /** Source location information for debugging */
  readonly sourceInfo?: SourceLocation;
  
  /** Program execution state */
  readonly state: ProgramState;
}

/**
 * Individual hyperscript feature within a program
 * Features are the building blocks of hyperscript (event handlers, behaviors, etc.)
 */
export interface HyperScriptFeature {
  /** Type of hyperscript feature */
  readonly type: HyperScriptFeatureType;
  
  /** Feature identifier for debugging and tooling */
  readonly id: string;
  
  /** Event trigger configuration (for event-based features) */
  readonly trigger?: EventTrigger;
  
  /** Commands that execute when this feature is triggered */
  readonly commands: ParsedCommand[];
  
  /** Feature-specific configuration and options */
  readonly config: FeatureConfig;
  
  /** Source location within the program */
  readonly sourceRange: SourceRange;
  
  /** Feature execution metadata */
  readonly metadata: FeatureMetadata;
}

/**
 * Parsed command that bridges parser output to executable implementations
 * Connects hyperscript syntax to enhanced TypeScript implementations
 */
export interface ParsedCommand {
  /** Command identifier and type information */
  readonly type: ParsedCommandType;
  readonly name: string;
  
  /** Reference to executable implementation */
  readonly implementation?: unknown | TypedExpressionImplementation<unknown, unknown>;
  
  /** Parsed arguments with type information */
  readonly args: ParsedArgument[];
  
  /** Command execution options and metadata */
  readonly options: CommandOptions;
  
  /** Source location for debugging */
  readonly sourceRange: SourceRange;
  
  /** Static analysis results */
  readonly analysis?: CommandAnalysis;
}

/**
 * Parsed argument with rich type information
 */
export interface ParsedArgument {
  /** Argument value and type */
  readonly value: HyperScriptValue;
  readonly type: string;
  
  /** Whether this argument is a literal or expression */
  readonly kind: 'literal' | 'expression' | 'reference';
  
  /** Source location for this argument */
  readonly sourceRange?: SourceRange;
  
  /** Static analysis of argument usage */
  readonly analysis?: ArgumentAnalysis;
}

// ============================================================================
// Supporting Type Definitions
// ============================================================================

/**
 * Types of hyperscript features based on official specification
 */
export type HyperScriptFeatureType = 
  | 'event'        // on click, on load, etc.
  | 'behavior'     // behavior definitions
  | 'definition'   // def myFunction(), etc.
  | 'init'         // init scripts
  | 'worker'       // web worker integration
  | 'socket'       // websocket integration
  | 'eventsource'  // server-sent events
  | 'set'          // variable definitions
  | 'js'           // JavaScript integration
  | 'custom';      // Extension features

/**
 * Types of parsed commands
 */
export type ParsedCommandType = 
  | 'dom-manipulation'  // hide, show, add, remove, etc.
  | 'content'          // put, take, settle
  | 'navigation'       // go, back, forward
  | 'event'            // send, trigger
  | 'async'            // wait, fetch
  | 'control-flow'     // if, repeat, while
  | 'data'             // set, increment, decrement
  | 'expression'       // pure expressions
  | 'custom';          // Extension commands

/**
 * Event trigger configuration for event-based features
 */
export interface EventTrigger {
  /** Event name (click, load, customEvent, etc.) */
  readonly event: string;
  
  /** Event target selector or reference */
  readonly target?: string | HTMLElement;
  
  /** Event options (once, passive, capture, etc.) */
  readonly options: EventListenerOptions & {
    readonly once?: boolean;
    readonly debounce?: number;
    readonly throttle?: number;
  };
  
  /** Event filter conditions */
  readonly filter?: EventFilter;
}

/**
 * Event filter for conditional event handling
 */
export interface EventFilter {
  /** CSS selector that must match the event target */
  readonly selector?: string;
  
  /** Key combinations for keyboard events */
  readonly keys?: string[];
  
  /** Custom filter function */
  readonly condition?: string; // hyperscript expression
}

/**
 * Feature configuration and options
 */
export interface FeatureConfig {
  /** Whether this feature is enabled */
  readonly enabled: boolean;
  
  /** Execution priority (higher = executes first) */
  readonly priority: number;
  
  /** Feature-specific options */
  readonly options: Record<string, HyperScriptValue>;
  
  /** Dependencies on other features */
  readonly dependencies: string[];
  
  /** Feature capabilities and requirements */
  readonly capabilities: FeatureCapabilities;
}

/**
 * Feature capabilities and requirements
 */
export interface FeatureCapabilities {
  /** Whether this feature requires DOM access */
  readonly requiresDOM: boolean;
  
  /** Whether this feature uses async operations */
  readonly isAsync: boolean;
  
  /** Whether this feature modifies global state */
  readonly modifiesGlobalState: boolean;
  
  /** Required browser APIs */
  readonly requiredAPIs: string[];
  
  /** Performance characteristics */
  readonly performance: PerformanceCharacteristics;
}

/**
 * Performance characteristics for features and commands
 */
export interface PerformanceCharacteristics {
  /** Expected execution complexity */
  readonly complexity: 'low' | 'medium' | 'high';
  
  /** Memory usage characteristics */
  readonly memoryUsage: 'minimal' | 'moderate' | 'heavy';
  
  /** Whether operation is CPU intensive */
  readonly cpuIntensive: boolean;
  
  /** Expected execution time range (ms) */
  readonly executionTime: {
    readonly min: number;
    readonly max: number;
    readonly typical: number;
  };
}

/**
 * Program metadata for compilation and execution
 */
export interface ProgramMetadata {
  /** Compilation information */
  readonly compilation: {
    readonly compiled: boolean;
    readonly compiledAt?: Date;
    readonly compiler: string;
    readonly version: string;
  };
  
  /** Static analysis results */
  readonly analysis: {
    readonly complexity: number;
    readonly estimatedExecutionTime: number;
    readonly memoryRequirements: number;
    readonly warnings: AnalysisWarning[];
    readonly optimizations: string[];
  };
  
  /** Performance profiling data */
  readonly performance?: {
    readonly lastExecutionTime: number;
    readonly averageExecutionTime: number;
    readonly executionCount: number;
    readonly errorCount: number;
  };
}

/**
 * Feature execution metadata
 */
export interface FeatureMetadata {
  /** When this feature was last compiled */
  readonly compiledAt: Date;
  
  /** Execution statistics */
  readonly stats: {
    readonly executionCount: number;
    readonly totalExecutionTime: number;
    readonly averageExecutionTime: number;
    readonly errorCount: number;
    readonly lastExecuted?: Date;
  };
  
  /** Dependencies resolved at compile time */
  readonly resolvedDependencies: string[];
  
  /** Static analysis warnings specific to this feature */
  readonly warnings: AnalysisWarning[];
}

/**
 * Command execution options
 */
export interface CommandOptions {
  /** Whether to validate inputs at runtime */
  readonly validateInputs: boolean;
  
  /** Whether to track performance metrics */
  readonly trackPerformance: boolean;
  
  /** Error handling strategy */
  readonly errorHandling: 'throw' | 'return' | 'ignore';
  
  /** Timeout for async operations (ms) */
  readonly timeout?: number;
  
  /** Retry configuration for failed operations */
  readonly retry?: {
    readonly attempts: number;
    readonly delay: number;
    readonly backoff: 'linear' | 'exponential';
  };
}

/**
 * Static analysis results for commands
 */
export interface CommandAnalysis {
  /** Estimated execution complexity */
  readonly complexity: number;
  
  /** Required permissions or capabilities */
  readonly requirements: string[];
  
  /** Potential side effects */
  readonly sideEffects: string[];
  
  /** Type inference results */
  readonly typeInference: {
    readonly inputTypes: string[];
    readonly outputType: string;
    readonly confidence: number;
  };
  
  /** Optimization opportunities */
  readonly optimizations: string[];
}

/**
 * Static analysis results for arguments
 */
export interface ArgumentAnalysis {
  /** Whether this argument is used by the command */
  readonly isUsed: boolean;
  
  /** Type compatibility with command requirements */
  readonly typeCompatibility: number; // 0-1 score
  
  /** Potential issues or improvements */
  readonly suggestions: string[];
}

/**
 * Source location information for debugging
 */
export interface SourceLocation {
  /** Source element where program is defined */
  readonly element?: HTMLElement;
  
  /** Attribute name containing the program */
  readonly attribute?: string; // '_', 'script', 'data-script'
  
  /** File path (if loaded from external file) */
  readonly file?: string;
  
  /** Line and column information */
  readonly position?: {
    readonly line: number;
    readonly column: number;
  };
}

/**
 * Source range for specific code segments
 */
export interface SourceRange {
  /** Start position in source */
  readonly start: number;
  
  /** End position in source */
  readonly end: number;
  
  /** Line and column ranges */
  readonly lines?: {
    readonly start: { line: number; column: number };
    readonly end: { line: number; column: number };
  };
}

/**
 * Program execution state
 */
export interface ProgramState {
  /** Current execution status */
  readonly status: 'ready' | 'running' | 'completed' | 'error' | 'suspended';
  
  /** Currently executing feature (if any) */
  readonly currentFeature?: string;
  
  /** Execution context information */
  readonly context: {
    readonly element: HTMLElement | null;
    readonly variables: Map<string, HyperScriptValue>;
    readonly callStack: string[];
  };
  
  /** Error information (if in error state) */
  readonly error?: HyperScriptError;
  
  /** Execution start time */
  readonly startedAt?: Date;
  
  /** Execution completion time */
  readonly completedAt?: Date;
}

/**
 * Static analysis warning
 */
export interface AnalysisWarning {
  /** Warning severity level */
  readonly level: 'info' | 'warning' | 'error';
  
  /** Warning message */
  readonly message: string;
  
  /** Source location of the issue */
  readonly location: SourceRange;
  
  /** Suggested fix or improvement */
  readonly suggestion?: string;
  
  /** Warning category */
  readonly category: 'performance' | 'compatibility' | 'security' | 'style' | 'type-safety';
}

// ============================================================================
// Runtime Validation Schemas for HyperScript Programs
// ============================================================================

/**
 * Zod schema for runtime validation of HyperScript programs
 */
export const HyperScriptProgramSchema = v.object({
  source: v.string(),
  features: v.array(z.object({
    type: z.enum(['event', 'behavior', 'definition', 'init', 'worker', 'socket', 'eventsource', 'set', 'js', 'custom']),
    id: v.string(),
    trigger: z.object({
      event: v.string(),
      target: v.union([v.string(), v.custom((value: unknown) => value instanceof HTMLElement)]).optional(),
      options: z.object({
        once: v.boolean().optional(),
        debounce: v.number().optional(),
        throttle: v.number().optional(),
      }),
      filter: v.object({
        selector: v.string().optional(),
        keys: v.array(v.string()).optional(),
        condition: v.string().optional(),
      }).optional(),
    }).optional(),
    commands: v.array(v.object({
      type: z.enum(['dom-manipulation', 'content', 'navigation', 'event', 'async', 'control-flow', 'data', 'expression', 'custom']),
      name: v.string(),
      args: v.array(z.object({
        value: HyperScriptValueSchema,
        type: v.string(),
        kind: z.enum(['literal', 'expression', 'reference']),
      })),
    })),
    config: v.object({
      enabled: v.boolean(),
      priority: v.number(),
      options: z.record(v.string(), HyperScriptValueSchema),
      dependencies: v.array(v.string()),
    }),
  })),
  metadata: v.object({
    compilation: z.object({
      compiled: v.boolean(),
      compiledAt: z.date().optional(),
      compiler: v.string(),
      version: v.string(),
    }),
  }),
  state: v.object({
    status: z.enum(['ready', 'running', 'completed', 'error', 'suspended']),
    currentFeature: v.string().optional(),
  }),
});

// ============================================================================
// Export Enhanced Types
// ============================================================================

// EvaluationType is imported from base-types.ts

// Note: ValidationResult is exported via interface declaration above (line 241)
// Additional exports can be added here if needed for specific use cases