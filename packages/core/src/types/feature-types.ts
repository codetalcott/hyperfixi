/**
 * Enhanced Feature Types - Deep TypeScript Integration for Features
 * Extends enhanced command patterns to hyperscript features like "on", "init", etc.
 */

import type { RuntimeValidator } from '../validation/lightweight-validators';
import type {
  ValidationResult,
  EvaluationResult,
  CommandMetadata,
  LLMDocumentation,
} from './command-types';

/**
 * Enhanced execution context for features with additional feature-specific properties
 */
export interface TypedFeatureContext {
  // Core context
  me: HTMLElement | null;
  it: unknown;
  you: HTMLElement | null;
  result: unknown;
  event?: Event;

  // Variable storage
  variables: Map<string, unknown>;
  locals: Map<string, unknown>;
  globals: Map<string, unknown>;

  // Feature-specific context
  feature: string; // Feature name
  syntax: string; // Original syntax string
  element: HTMLElement; // Element where feature is attached

  // Enhanced features
  errors: Error[];
  featureHistory: FeatureExecution[];
  validationMode: 'strict' | 'permissive';
}

/**
 * Feature execution record for debugging and history
 */
export interface FeatureExecution {
  featureName: string;
  timestamp: number;
  duration?: number;
  success: boolean;
  input: unknown[];
  output?: unknown;
  error?: Error;
}

/**
 * Feature metadata for LLM understanding and tooling
 */
export interface FeatureMetadata extends CommandMetadata {
  // Feature-specific metadata
  syntaxElements: {
    keywords: string[];
    modifiers: string[];
    expressions: string[];
  };
  triggerTypes: string[]; // e.g., ['event', 'mutation', 'time']
  scope: 'element' | 'document' | 'global';
  lifecycle: 'immediate' | 'deferred' | 'continuous';
}

/**
 * Enhanced feature implementation interface
 */
export interface TypedFeatureImplementation<
  TInput = unknown,
  TOutput = unknown,
  TContext extends TypedFeatureContext = TypedFeatureContext,
> {
  readonly name: string;
  readonly syntax: string;
  readonly description: string;
  readonly inputSchema: RuntimeValidator<TInput>;
  readonly outputType: string;
  readonly metadata: FeatureMetadata;
  readonly documentation?: LLMDocumentation; // Optional

  /**
   * Parse feature syntax string into typed input
   */
  parse(syntaxString: string, element: HTMLElement): Promise<EvaluationResult<TInput>>;

  /**
   * Execute feature with typed context and input
   */
  execute(context: TContext, input: TInput): Promise<EvaluationResult<TOutput>>;

  /**
   * Validate parsed input
   */
  validate(input: unknown): ValidationResult;

  /**
   * Cleanup feature resources (called when element is removed)
   */
  cleanup?(context: TContext, registration: TOutput): Promise<void>;
}

/**
 * Feature registration result
 */
export interface FeatureRegistration {
  id: string;
  featureName: string;
  element: HTMLElement;
  syntax: string;
  active: boolean;
  cleanup?: () => Promise<void>;
}

/**
 * Enhanced feature validation error
 */
export interface FeatureValidationError {
  type: 'syntax-error' | 'type-mismatch' | 'semantic-error' | 'runtime-error';
  message: string;
  position?: {
    start: number;
    end: number;
    line?: number;
    column?: number;
    suggestions: [];
  };
  suggestion: string;
  code?: string;
}

/**
 * Enhanced validation result for features
 */
export interface FeatureValidationResult {
  isValid: boolean;
  errors: FeatureValidationError[];
  suggestions: string[];
  parsedSyntax?: {
    tokens: string[];
    structure: Record<string, any>;
  };
}
