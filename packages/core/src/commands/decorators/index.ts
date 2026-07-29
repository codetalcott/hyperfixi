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
  /** @see CommandMetadata.compatibility */
  compatibility?: 'standard' | 'lokascript-extension' | 'experimental';
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

/**
 * Type for class constructors with symbol properties
 */
type ClassWithSymbols = {
  [COMMAND_NAME]?: string;
  [COMMAND_CATEGORY]?: CommandCategory;
  [COMMAND_METADATA]?: CommandMetadata;
};

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
  return function <T extends new (...args: unknown[]) => object>(
    target: T,
    context: ClassDecoratorContext
  ): T | void {
    // Store config on class for later use
    const targetWithSymbols = target as T & ClassWithSymbols;
    targetWithSymbols[COMMAND_NAME] = config.name;
    targetWithSymbols[COMMAND_CATEGORY] = config.category;

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
  return function <T extends new (...args: unknown[]) => object>(
    target: T,
    context: ClassDecoratorContext
  ): T | void {
    // Build full metadata (category comes from @command decorator)
    const targetWithSymbols = target as T & ClassWithSymbols;
    const category = targetWithSymbols[COMMAND_CATEGORY];

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
      compatibility: config.compatibility,
    };

    // Store on class
    targetWithSymbols[COMMAND_METADATA] = fullMetadata;

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
// commandMeta — type-visible metadata (Arc B)
// ============================================================================

/**
 * Input accepted by {@link commandMeta}: `CommandMetadata` with `version`
 * optional, since it is a published constant rather than something an author
 * chooses per command.
 */
export type CommandMetaInput = Omit<CommandMetadata, 'version'> & {
  readonly version?: string;
};

/**
 * Declare a command's metadata as a **type-visible** static.
 *
 * ```ts
 * export class InstallCommand {
 *   readonly name = 'install';
 *   static readonly metadata = commandMeta({ … });
 *   get metadata() { return InstallCommand.metadata; }
 * }
 * ```
 *
 * ## Why this exists, precisely
 *
 * `@meta` installs `metadata` with `Object.defineProperty`, and a class
 * decorator that returns the original class cannot widen its type — so
 * TypeScript never sees the static. That invisibility (not a lack of
 * validation) is the defect: `meta(config: MetaConfig)` already type-checks
 * the literal passed to it, but `SomeCommand.metadata` is `TS2339` at every
 * read, which is why `scripts/generate-command-docs.ts` needs a runtime
 * `metadataOf()` assertion and why script typechecking stayed off for months.
 *
 * The classes this replaces used a bare `as const`, which has the mirror-image
 * problem: the static is visible but validated by **nothing**. Measured before
 * this helper existed — an invalid `category` and a nonsense `sideEffects`
 * entry both compiled clean.
 *
 * ## Why the `const` type parameter is load-bearing
 *
 * `<const T>` preserves the literal types `as const` gave (so
 * `metadata.syntax[0]` stays a literal, not `string`), while
 * `extends CommandMetaInput` supplies the contextual type that makes
 * excess-property and enum checking fire. Drop `const` and the arc trades
 * inference for checking instead of getting both.
 *
 * ## The defaults, and why they are here
 *
 * Fills `isBlocking`/`hasBody`/`version` exactly as `@meta` did, so the 52
 * classes step 3 migrated keep byte-identical metadata. Step 1 shipped this as a
 * pure identity function and said the choice had to be made deliberately in step
 * 3 rather than by omission; this is that decision. The cost is that the three
 * `commandMeta` classes migrated in step 1 (`install`, `pseudo-command`,
 * `render`) now GAIN the three fields — a change their tests assert explicitly,
 * so it shows up as a moved row rather than as drift.
 *
 * Spread order is load-bearing: the defaults come first, so a literal that
 * states `isBlocking: true` wins and still narrows to `true`.
 *
 * **These three fields are unauthored and unread.** No command literal sets
 * them, nothing in production reads them, and every one of the 40 rows in the
 * shipped `docs/commands/commands.json` therefore says `isBlocking: false`,
 * `hasBody: false`, `version: '1.0.0'` — which is FALSE for `wait`, `fetch`,
 * `settle`, `transition` (they block) and for `if`, `repeat`, `tell` (they take
 * bodies). Preserving them here is deliberately a refactor-preserving choice,
 * not an endorsement; authoring them truthfully is filed as its own item in
 * `docs-internal/COMMAND_ARCHITECTURE_NEXT_STEPS.md`.
 */
export function commandMeta<const T extends CommandMetaInput>(metadata: T) {
  return { isBlocking: false, hasBody: false, version: '1.0.0', ...metadata };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get command name from a decorated class
 */
export function getCommandName<T extends new (...args: unknown[]) => object>(
  target: T
): string | undefined {
  const targetWithSymbols = target as T & ClassWithSymbols;
  return targetWithSymbols[COMMAND_NAME];
}

/**
 * Get command category from a decorated class
 */
export function getCommandCategory<T extends new (...args: unknown[]) => object>(
  target: T
): CommandCategory | undefined {
  const targetWithSymbols = target as T & ClassWithSymbols;
  return targetWithSymbols[COMMAND_CATEGORY];
}

/**
 * Get command metadata from a decorated class
 */
export function getCommandMetadata<T extends new (...args: unknown[]) => object>(
  target: T
): CommandMetadata | undefined {
  const targetWithSymbols = target as T & ClassWithSymbols;
  return targetWithSymbols[COMMAND_METADATA];
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
