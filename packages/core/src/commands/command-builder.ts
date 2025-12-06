/**
 * Command Builder Pattern
 *
 * Fluent API for defining commands with full TypeScript support.
 * Inspired by napi-rs patterns - systematic type definitions, zero-boilerplate.
 *
 * Benefits:
 * - No experimental TC39 decorators required
 * - Full TypeScript type inference
 * - Chainable, self-documenting API
 * - Easy to migrate to decorators later if desired
 *
 * @example
 * ```typescript
 * const swapCommand = defineCommand('swap')
 *   .category('dom')
 *   .description('Swap content into target element')
 *   .syntax(['swap <target> with <content>', 'swap <strategy> of <target> with <content>'])
 *   .examples(['swap #target with it', 'swap innerHTML of #target with it'])
 *   .sideEffects(['dom-mutation'])
 *   .parseInput(async (raw, evaluator, context) => { ... })
 *   .execute(async (input, context) => { ... })
 *   .build();
 * ```
 */

import type { ExecutionContext, TypedExecutionContext } from '../types/core';
import type { ASTNode, ExpressionNode } from '../types/base-types';
import type { ExpressionEvaluator } from '../core/expression-evaluator';
import type {
  CommandMetadata,
  CommandCategory,
  CommandSideEffect,
} from '../types/command-metadata';

/**
 * Mutable version of CommandMetadata for builder internal use
 */
type MutableCommandMetadata = {
  -readonly [K in keyof CommandMetadata]: CommandMetadata[K] extends readonly (infer T)[]
    ? T[]
    : CommandMetadata[K];
};

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Raw command arguments from parser
 */
export interface RawCommandArgs {
  args: ASTNode[];
  modifiers: Record<string, ExpressionNode>;
}

/**
 * Function type for parsing raw AST into typed input
 */
export type ParseInputFn<TInput> = (
  raw: RawCommandArgs,
  evaluator: ExpressionEvaluator,
  context: ExecutionContext
) => Promise<TInput>;

/**
 * Function type for executing command with typed input
 */
export type ExecuteFn<TInput, TOutput> = (
  input: TInput,
  context: TypedExecutionContext
) => Promise<TOutput>;

/**
 * Function type for validating parsed input
 */
export type ValidateFn<TInput> = (input: unknown) => input is TInput;

/**
 * Built command interface - matches existing command structure
 */
export interface BuiltCommand<TInput = unknown, TOutput = unknown> {
  readonly name: string;
  readonly metadata: CommandMetadata;
  parseInput: ParseInputFn<TInput>;
  execute: ExecuteFn<TInput, TOutput>;
  validate?: ValidateFn<TInput>;
}

// ============================================================================
// Builder Interface
// ============================================================================

/**
 * Fluent builder interface for defining commands
 *
 * Methods can be called in any order, but build() will validate
 * that all required fields are set.
 */
export interface CommandBuilder<TInput = unknown, TOutput = unknown> {
  /**
   * Set command category (required)
   */
  category(cat: CommandCategory): CommandBuilder<TInput, TOutput>;

  /**
   * Set command description (required)
   */
  description(desc: string): CommandBuilder<TInput, TOutput>;

  /**
   * Set syntax pattern(s) (required)
   * @param syn - Single syntax string or array of syntax variants
   */
  syntax(syn: string | string[]): CommandBuilder<TInput, TOutput>;

  /**
   * Set usage examples (required, recommend 2+)
   */
  examples(ex: string[]): CommandBuilder<TInput, TOutput>;

  /**
   * Set side effects (optional)
   */
  sideEffects(effects: CommandSideEffect[]): CommandBuilder<TInput, TOutput>;

  /**
   * Mark command as deprecated (optional)
   */
  deprecated(message: string): CommandBuilder<TInput, TOutput>;

  /**
   * Set command aliases (optional)
   */
  aliases(names: string[]): CommandBuilder<TInput, TOutput>;

  /**
   * Set related commands (optional)
   */
  relatedCommands(names: string[]): CommandBuilder<TInput, TOutput>;

  /**
   * Mark command as blocking (optional)
   */
  blocking(isBlocking?: boolean): CommandBuilder<TInput, TOutput>;

  /**
   * Mark command as having a body (optional)
   */
  hasBody(hasBody?: boolean): CommandBuilder<TInput, TOutput>;

  /**
   * Set parseInput function (required)
   * Type parameter allows narrowing input type
   */
  parseInput<T>(fn: ParseInputFn<T>): CommandBuilder<T, TOutput>;

  /**
   * Set execute function (required)
   * Type parameter allows narrowing output type
   */
  execute<O>(fn: ExecuteFn<TInput, O>): CommandBuilder<TInput, O>;

  /**
   * Set validate function (optional but recommended)
   */
  validate(fn: ValidateFn<TInput>): CommandBuilder<TInput, TOutput>;

  /**
   * Build the command
   * @throws Error if required fields are missing
   */
  build(): BuiltCommand<TInput, TOutput>;
}

// ============================================================================
// Builder Implementation
// ============================================================================

/**
 * Internal builder implementation
 */
class CommandBuilderImpl<TInput, TOutput>
  implements CommandBuilder<TInput, TOutput>
{
  private _metadata: Partial<MutableCommandMetadata> = {};
  private _parseInput?: ParseInputFn<TInput>;
  private _execute?: ExecuteFn<TInput, TOutput>;
  private _validate?: ValidateFn<TInput>;

  constructor(private readonly _name: string) {}

  category(cat: CommandCategory): CommandBuilder<TInput, TOutput> {
    this._metadata.category = cat;
    return this;
  }

  description(desc: string): CommandBuilder<TInput, TOutput> {
    this._metadata.description = desc;
    return this;
  }

  syntax(syn: string | string[]): CommandBuilder<TInput, TOutput> {
    this._metadata.syntax = syn;
    return this;
  }

  examples(ex: string[]): CommandBuilder<TInput, TOutput> {
    this._metadata.examples = ex;
    return this;
  }

  sideEffects(effects: CommandSideEffect[]): CommandBuilder<TInput, TOutput> {
    this._metadata.sideEffects = effects;
    return this;
  }

  deprecated(message: string): CommandBuilder<TInput, TOutput> {
    this._metadata.deprecated = true;
    this._metadata.deprecationMessage = message;
    return this;
  }

  aliases(names: string[]): CommandBuilder<TInput, TOutput> {
    this._metadata.aliases = names;
    return this;
  }

  relatedCommands(names: string[]): CommandBuilder<TInput, TOutput> {
    this._metadata.relatedCommands = names;
    return this;
  }

  blocking(isBlocking = true): CommandBuilder<TInput, TOutput> {
    this._metadata.isBlocking = isBlocking;
    return this;
  }

  hasBody(hasBody = true): CommandBuilder<TInput, TOutput> {
    this._metadata.hasBody = hasBody;
    return this;
  }

  parseInput<T>(fn: ParseInputFn<T>): CommandBuilder<T, TOutput> {
    // Type assertion needed for type parameter change
    (this as unknown as CommandBuilderImpl<T, TOutput>)._parseInput = fn;
    return this as unknown as CommandBuilder<T, TOutput>;
  }

  execute<O>(fn: ExecuteFn<TInput, O>): CommandBuilder<TInput, O> {
    // Type assertion needed for type parameter change
    (this as unknown as CommandBuilderImpl<TInput, O>)._execute = fn;
    return this as unknown as CommandBuilder<TInput, O>;
  }

  validate(fn: ValidateFn<TInput>): CommandBuilder<TInput, TOutput> {
    this._validate = fn;
    return this;
  }

  build(): BuiltCommand<TInput, TOutput> {
    // Validate required fields
    if (!this._parseInput) {
      throw new Error(`Command '${this._name}': parseInput is required`);
    }
    if (!this._execute) {
      throw new Error(`Command '${this._name}': execute is required`);
    }
    if (!this._metadata.category) {
      throw new Error(`Command '${this._name}': category is required`);
    }
    if (!this._metadata.description) {
      throw new Error(`Command '${this._name}': description is required`);
    }
    if (!this._metadata.syntax) {
      throw new Error(`Command '${this._name}': syntax is required`);
    }
    if (!this._metadata.examples || this._metadata.examples.length === 0) {
      throw new Error(`Command '${this._name}': examples is required (at least 1)`);
    }

    // Build complete metadata with defaults
    const metadata: CommandMetadata = {
      description: this._metadata.description,
      syntax: this._metadata.syntax,
      examples: this._metadata.examples,
      category: this._metadata.category,
      sideEffects: this._metadata.sideEffects,
      deprecated: this._metadata.deprecated,
      deprecationMessage: this._metadata.deprecationMessage,
      aliases: this._metadata.aliases,
      relatedCommands: this._metadata.relatedCommands,
      version: this._metadata.version ?? '1.0.0',
      isBlocking: this._metadata.isBlocking ?? false,
      hasBody: this._metadata.hasBody ?? false,
    };

    // Build command object
    const command: BuiltCommand<TInput, TOutput> = {
      name: this._name,
      metadata,
      parseInput: this._parseInput,
      execute: this._execute,
    };

    // Add validate if provided
    if (this._validate) {
      (command as { validate?: ValidateFn<TInput> }).validate = this._validate;
    }

    return command;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new command builder
 *
 * Entry point for the fluent builder API.
 *
 * @param name - Command name (how it will be registered and invoked)
 * @returns CommandBuilder instance
 *
 * @example
 * ```typescript
 * const pushUrlCommand = defineCommand('push')
 *   .category('navigation')
 *   .description('Push URL to browser history')
 *   .syntax('push url <url>')
 *   .examples(['push url "/page/2"'])
 *   .sideEffects(['navigation'])
 *   .parseInput(async (raw, evaluator, context) => {
 *     const url = await evaluator.evaluate(raw.args[0], context);
 *     return { url: String(url) };
 *   })
 *   .execute(async (input) => {
 *     history.pushState(null, '', input.url);
 *   })
 *   .build();
 * ```
 */
export function defineCommand(name: string): CommandBuilder<unknown, unknown> {
  return new CommandBuilderImpl(name);
}

// Re-export types for convenience
export type { CommandMetadata, CommandCategory, CommandSideEffect };
