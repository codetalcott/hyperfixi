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
 * @command({ name: 'increment' })
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
}

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
 * @command({ name: 'increment' })
 * class IncrementCommand { ... }
 * ```
 */
export function command(config: CommandConfig) {
  return function <T extends new (...args: unknown[]) => object>(
    target: T,
    context: ClassDecoratorContext
  ): T | void {
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
// commandMeta — type-visible metadata (Arc B)
// ============================================================================

/**
 * Input accepted by {@link commandMeta} — the canonical `CommandMetadata`.
 *
 * This used to re-declare `version` as optional, which was already true on
 * `CommandMetadata`; the `Omit` had no effect once `commandMeta` stopped
 * defaulting it. Kept as a named alias because it is the published name of
 * `commandMeta`'s parameter type.
 */
export type CommandMetaInput = CommandMetadata;

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
 * validation) was the defect: the now-deleted `@meta` decorator DID type-check
 * the literal passed to it, but `SomeCommand.metadata` was `TS2339` at every
 * read — which is why `scripts/generate-command-docs.ts` needed a runtime
 * `metadataOf()` assertion and why script typechecking stayed off for months.
 * Both are gone as of Arc B step 4.
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
 * ## Why there are no longer any defaults
 *
 * This filled `isBlocking`/`hasBody`/`version` exactly as `@meta` did, so that
 * Arc B's migration stayed byte-identical. That was a refactor-preserving
 * choice, explicitly not an endorsement — and it published a falsehood: since
 * NO command literal ever set them, every row of the generated
 * `docs/commands/commands.json` carried `isBlocking: false`, `hasBody: false`,
 * `version: '1.0.0'` with zero variance across all **59** commands. That says
 * `wait`, `fetch`, `settle` and `transition` do not block, and that `if`,
 * `repeat` and `tell` take no body. All false, and it got worse as the command
 * set grew (it was 40/43 when the defect was filed).
 *
 * The queue framed the fix as authoring ~59 truthful booleans. Measured, that
 * is the wrong end: the fields are **unauthored, unread, and unrendered** —
 * nothing in production or in `REFERENCE.md` consumes them, and no gate pins
 * them. Emitting them at all is the only thing that creates the false claim, so
 * they are simply gone. `version` was meaningless per-command regardless (the
 * JSON's document-level `version` is a separate, real field).
 *
 * They remain OPTIONAL on {@link CommandMetadata}: a command that genuinely
 * needs to declare `isBlocking: true` still can, and now that declaration means
 * something because absence no longer reads as a claim of `false`. If a
 * consumer ever appears, prefer deriving over hand-authoring — `COMPOUND_COMMANDS`
 * and the parser's `CommandNode.isBlocking` already encode much of it.
 */
export function commandMeta<const T extends CommandMetaInput>(metadata: T) {
  return { ...metadata };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a factory function for a command class
 *
 * @example
 * ```typescript
 * @command({ name: 'increment' })
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
