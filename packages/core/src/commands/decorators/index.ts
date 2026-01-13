/**
 * Stage 3 TypeScript Decorators for HyperFixi Commands
 *
 * These decorators use the TC39 Stage 3 decorator proposal (TypeScript 5.0+).
 * They eliminate boilerplate by auto-generating:
 * - readonly name property
 * - static/instance metadata accessors
 * - factory function export
 *
 * @example
 * ```typescript
 * @command({ name: 'increment', category: 'data' })
 * @meta({
 *   description: 'Increment a variable',
 *   syntax: 'increment <target>',
 *   examples: ['increment counter'],
 * })
 * export class IncrementCommand {
 *   async execute(input: Input, ctx: ExecutionContext) { ... }
 * }
 * ```
 */

import type {
  CommandMetadata,
  CommandCategory,
  CommandSideEffect,
} from '../../types/command-metadata';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Configuration for the @command decorator
 */
export interface CommandConfig {
  /** Command name as used in hyperscript */
  name: string;
  /** Command category */
  category: CommandCategory;
}

/**
 * Simplified metadata for the @meta decorator (excludes category which is in @command)
 */
export interface MetaConfig {
  description: string;
  syntax: string | readonly string[];
  examples: readonly string[];
  sideEffects?: readonly CommandSideEffect[];
  deprecated?: boolean;
  deprecationMessage?: string;
  aliases?: readonly string[];
  relatedCommands?: readonly string[];
  isBlocking?: boolean;
  hasBody?: boolean;
}

/**
 * Symbol keys for storing decorator data
 */
const COMMAND_NAME = Symbol('command:name');
const COMMAND_CATEGORY = Symbol('command:category');
const COMMAND_METADATA = Symbol('command:metadata');

/**
 * Interface for decorated command classes
 */
export interface DecoratedCommand {
  readonly name: string;
  readonly metadata: CommandMetadata;
}

// ============================================================================
// @command Decorator
// ============================================================================

/**
 * Class decorator that sets command name and category.
 *
 * Adds:
 * - readonly `name` property
 * - category stored for metadata generation
 *
 * @example
 * ```typescript
 * @command({ name: 'increment', category: 'data' })
 * class IncrementCommand { ... }
 * ```
 */
export function command(config: CommandConfig) {
  return function <T extends new (...args: any[]) => object>(
    target: T,
    context: ClassDecoratorContext
  ): T | void {
    // Store config on class for later use
    (target as any)[COMMAND_NAME] = config.name;
    (target as any)[COMMAND_CATEGORY] = config.category;

    // Add name property to prototype
    Object.defineProperty(target.prototype, 'name', {
      value: config.name,
      writable: false,
      enumerable: true,
    });

    // Return undefined to keep original class (mutated)
    return;
  };
}

// ============================================================================
// @meta Decorator
// ============================================================================

/**
 * Class decorator that sets command metadata.
 *
 * Adds:
 * - static `metadata` property
 * - instance `metadata` getter
 *
 * Must be used after @command to access category.
 *
 * @example
 * ```typescript
 * @command({ name: 'increment', category: 'data' })
 * @meta({
 *   description: 'Increment a variable or property',
 *   syntax: 'increment <target> [by <amount>]',
 *   examples: ['increment counter', 'increment counter by 5'],
 * })
 * class IncrementCommand { ... }
 * ```
 */
export function meta(config: MetaConfig) {
  return function <T extends new (...args: any[]) => object>(
    target: T,
    context: ClassDecoratorContext
  ): T | void {
    // Build full metadata (category comes from @command decorator)
    const category = (target as any)[COMMAND_CATEGORY] as CommandCategory | undefined;

    if (!category) {
      throw new Error(
        `@meta decorator requires @command decorator to be applied first on ${target.name}`
      );
    }

    const fullMetadata: CommandMetadata = {
      description: config.description,
      syntax: config.syntax,
      examples: config.examples,
      category,
      sideEffects: config.sideEffects,
      deprecated: config.deprecated,
      deprecationMessage: config.deprecationMessage,
      aliases: config.aliases,
      relatedCommands: config.relatedCommands,
      isBlocking: config.isBlocking ?? false,
      hasBody: config.hasBody ?? false,
      version: '1.0.0',
    };

    // Store on class
    (target as any)[COMMAND_METADATA] = fullMetadata;

    // Add static metadata property
    Object.defineProperty(target, 'metadata', {
      value: fullMetadata,
      writable: false,
      enumerable: true,
      configurable: false,
    });

    // Add instance metadata getter via prototype
    Object.defineProperty(target.prototype, 'metadata', {
      get() {
        return fullMetadata;
      },
      enumerable: true,
      configurable: false,
    });

    // Return undefined to keep original class (mutated)
    return;
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get command name from a decorated class
 */
export function getCommandName<T extends new (...args: any[]) => object>(
  target: T
): string | undefined {
  return (target as any)[COMMAND_NAME];
}

/**
 * Get command category from a decorated class
 */
export function getCommandCategory<T extends new (...args: any[]) => object>(
  target: T
): CommandCategory | undefined {
  return (target as any)[COMMAND_CATEGORY];
}

/**
 * Get command metadata from a decorated class
 */
export function getCommandMetadata<T extends new (...args: any[]) => object>(
  target: T
): CommandMetadata | undefined {
  return (target as any)[COMMAND_METADATA];
}

/**
 * Create a factory function for a command class
 *
 * @example
 * ```typescript
 * @command({ name: 'increment', category: 'data' })
 * @meta({ ... })
 * class IncrementCommand { ... }
 *
 * export const createIncrementCommand = createFactory(IncrementCommand);
 * ```
 */
export function createFactory<T extends new () => object>(CommandClass: T): () => InstanceType<T> {
  return () => new CommandClass() as InstanceType<T>;
}

// Re-export types for convenience
export type { CommandMetadata, CommandCategory, CommandSideEffect };
