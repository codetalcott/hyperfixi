/**
 * Base Types for Enhanced Command System
 * Defines core interfaces and types used across all enhanced commands
 */

import type { TypedExecutionContext, ValidationResult } from '../../types/core.js';

/**
 * Enhanced command implementation interface
 * All enhanced commands must implement this interface for consistent behavior
 */
export interface TypedCommandImplementation<TInput, TOutput, TContext extends TypedExecutionContext> {
  /**
   * Command metadata for documentation and introspection
   */
  metadata: {
    name: string;
    description: string;
    examples: string[];
    syntax: string;
    category: 'dom' | 'event' | 'async' | 'data' | 'flow' | 'utility';
    version: string;
  };

  /**
   * Input validation schema and validator
   */
  validation: {
    validate(input: unknown): ValidationResult<TInput>;
    schema?: any; // Optional Zod schema for introspection
  };

  /**
   * Execute the command with validated input and typed context
   */
  execute(input: TInput, context: TContext): Promise<TOutput>;

  /**
   * Optional cleanup or finalization logic
   */
  cleanup?(context: TContext): Promise<void>;
}

/**
 * Factory function type for creating enhanced commands
 * Used for lazy initialization and dependency injection
 */
export interface EnhancedCommandFactory<TInput, TOutput, TContext extends TypedExecutionContext> {
  (): TypedCommandImplementation<TInput, TOutput, TContext>;
}

/**
 * Bundle size annotation for factory functions
 * Used by bundlers for tree-shaking and size analysis
 */
export interface BundleSizeInfo {
  estimatedSize: string;
  dependencies: string[];
  treeshakeable: boolean;
}

/**
 * Command execution statistics for monitoring and debugging
 */
export interface CommandStats {
  name: string;
  executionCount: number;
  averageExecutionTime: number;
  lastExecuted: Date | null;
  errorCount: number;
  lastError: string | null;
}

/**
 * Enhanced command registry entry
 */
export interface CommandRegistryEntry<TInput, TOutput, TContext extends TypedExecutionContext> {
  implementation: TypedCommandImplementation<TInput, TOutput, TContext>;
  factory?: EnhancedCommandFactory<TInput, TOutput, TContext>;
  stats: CommandStats;
  bundleInfo?: BundleSizeInfo;
}

/**
 * Command execution options
 */
export interface CommandExecutionOptions {
  timeout?: number;
  validateInput?: boolean;
  trackStats?: boolean;
  debugMode?: boolean;
}

/**
 * Base error class for enhanced commands
 */
export class EnhancedCommandError extends Error {
  constructor(
    message: string,
    public readonly commandName: string,
    public readonly input?: unknown,
    public readonly suggestions: string[] = []
  ) {
    super(message);
    this.name = 'EnhancedCommandError';
  }
}

/**
 * Validation error for command input
 */
export class CommandValidationError extends EnhancedCommandError {
  constructor(
    commandName: string,
    input: unknown,
    validationErrors: string[],
    suggestions: string[] = []
  ) {
    const message = `Invalid input for ${commandName}: ${validationErrors.join(', ')}`;
    super(message, commandName, input, suggestions);
    this.name = 'CommandValidationError';
  }
}

/**
 * Execution timeout error
 */
export class CommandTimeoutError extends EnhancedCommandError {
  constructor(
    commandName: string,
    timeout: number
  ) {
    const message = `Command ${commandName} timed out after ${timeout}ms`;
    super(message, commandName);
    this.name = 'CommandTimeoutError';
  }
}

/**
 * Utility type for extracting input type from command implementation
 */
export type ExtractCommandInput<T> = T extends TypedCommandImplementation<infer U, any, any> ? U : never;

/**
 * Utility type for extracting output type from command implementation
 */
export type ExtractCommandOutput<T> = T extends TypedCommandImplementation<any, infer U, any> ? U : never;

/**
 * Utility type for extracting context type from command implementation
 */
export type ExtractCommandContext<T> = T extends TypedCommandImplementation<any, any, infer U> ? U : never;

/**
 * Type-safe command builder helper
 */
export interface CommandBuilder<TInput, TOutput, TContext extends TypedExecutionContext> {
  withMetadata(metadata: TypedCommandImplementation<TInput, TOutput, TContext>['metadata']): CommandBuilder<TInput, TOutput, TContext>;
  withValidation(validation: TypedCommandImplementation<TInput, TOutput, TContext>['validation']): CommandBuilder<TInput, TOutput, TContext>;
  withExecutor(executor: TypedCommandImplementation<TInput, TOutput, TContext>['execute']): CommandBuilder<TInput, TOutput, TContext>;
  withCleanup(cleanup: TypedCommandImplementation<TInput, TOutput, TContext>['cleanup']): CommandBuilder<TInput, TOutput, TContext>;
  build(): TypedCommandImplementation<TInput, TOutput, TContext>;
}

/**
 * Creates a command builder for type-safe command construction
 */
export function createCommandBuilder<TInput, TOutput, TContext extends TypedExecutionContext>(): CommandBuilder<TInput, TOutput, TContext> {
  let metadata: TypedCommandImplementation<TInput, TOutput, TContext>['metadata'] | undefined;
  let validation: TypedCommandImplementation<TInput, TOutput, TContext>['validation'] | undefined;
  let executor: TypedCommandImplementation<TInput, TOutput, TContext>['execute'] | undefined;
  let cleanup: TypedCommandImplementation<TInput, TOutput, TContext>['cleanup'] | undefined;

  const builder: CommandBuilder<TInput, TOutput, TContext> = {
    withMetadata(meta) {
      metadata = meta;
      return builder;
    },
    withValidation(val) {
      validation = val;
      return builder;
    },
    withExecutor(exec) {
      executor = exec;
      return builder;
    },
    withCleanup(clean) {
      cleanup = clean;
      return builder;
    },
    build() {
      if (!metadata) {
        throw new Error('Command metadata is required');
      }
      if (!validation) {
        throw new Error('Command validation is required');
      }
      if (!executor) {
        throw new Error('Command executor is required');
      }

      const implementation: TypedCommandImplementation<TInput, TOutput, TContext> = {
        metadata,
        validation,
        execute: executor,
        ...(cleanup && { cleanup })
      };

      return implementation;
    }
  };

  return builder;
}

/**
 * Enhanced command registry interface
 * Provides type-safe command registration and retrieval
 */
export interface IEnhancedCommandRegistry {
  register<TInput, TOutput, TContext extends TypedExecutionContext>(
    impl: TypedCommandImplementation<TInput, TOutput, TContext>
  ): void;
  
  get<TInput, TOutput, TContext extends TypedExecutionContext>(
    name: string
  ): TypedCommandImplementation<TInput, TOutput, TContext> | undefined;
  
  has(name: string): boolean;
  getCommandNames(): string[];
  getStats(name: string): CommandStats | undefined;
}