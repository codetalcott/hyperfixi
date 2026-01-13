/**
 * Runtime Hooks System
 *
 * Provides extension points for command execution lifecycle:
 * - beforeExecute: Run logic before command execution
 * - afterExecute: Run logic after successful execution
 * - onError: Handle or transform errors
 * - interceptCommand: Conditionally skip command execution
 *
 * Integrated from plugin-system package for core consolidation.
 */

import type { ExecutionContext } from './base-types';

/**
 * Context provided to hook functions
 * Contains information about the command being executed
 */
export interface HookContext {
  /** Name of the command being executed */
  commandName: string;
  /** Element the command is operating on (if any) */
  element: Element | null;
  /** Arguments passed to the command */
  args: unknown[];
  /** Modifiers from command parsing (e.g., { with: 'fade' }) */
  modifiers: Record<string, unknown>;
  /** The event that triggered this command (if any) */
  event?: Event;
  /** Full execution context */
  executionContext: ExecutionContext;
}

/**
 * Hook function signatures
 */
export type BeforeExecuteHook = (ctx: HookContext) => void | Promise<void>;
export type AfterExecuteHook = (ctx: HookContext, result: unknown) => void | Promise<void>;
export type OnErrorHook = (ctx: HookContext, error: Error) => void | Error | Promise<void | Error>;
export type InterceptCommandHook = (commandName: string, ctx: HookContext) => boolean;

/**
 * Runtime hooks configuration
 *
 * All hooks are optional. Multiple hooks of the same type can be registered
 * and will be executed in registration order.
 */
export interface RuntimeHooks {
  /**
   * Called before command execution.
   * Use for logging, timing, or pre-execution setup.
   */
  beforeExecute?: BeforeExecuteHook;

  /**
   * Called after successful command execution.
   * Use for logging, cleanup, or post-execution processing.
   * @param result - The value returned by the command
   */
  afterExecute?: AfterExecuteHook;

  /**
   * Called when command execution throws an error.
   * Can transform the error or handle it.
   * @returns void to rethrow original, or Error to throw different error
   */
  onError?: OnErrorHook;

  /**
   * Called before command execution to optionally skip it.
   * @returns true to intercept (skip execution), false to proceed
   */
  interceptCommand?: InterceptCommandHook;
}

/**
 * Registry for managing multiple hook handlers
 * Allows registering named hook sets and combining them
 */
export class HookRegistry {
  private hooks: Map<string, RuntimeHooks> = new Map();
  private beforeExecuteHooks: BeforeExecuteHook[] = [];
  private afterExecuteHooks: AfterExecuteHook[] = [];
  private onErrorHooks: OnErrorHook[] = [];
  private interceptCommandHooks: InterceptCommandHook[] = [];

  /**
   * Register a named set of hooks
   * @param name Unique identifier for this hook set
   * @param hooks The hooks to register
   */
  register(name: string, hooks: RuntimeHooks): void {
    // Remove existing hooks with this name first
    this.unregister(name);

    this.hooks.set(name, hooks);

    if (hooks.beforeExecute) {
      this.beforeExecuteHooks.push(hooks.beforeExecute);
    }
    if (hooks.afterExecute) {
      this.afterExecuteHooks.push(hooks.afterExecute);
    }
    if (hooks.onError) {
      this.onErrorHooks.push(hooks.onError);
    }
    if (hooks.interceptCommand) {
      this.interceptCommandHooks.push(hooks.interceptCommand);
    }
  }

  /**
   * Unregister a named set of hooks
   */
  unregister(name: string): boolean {
    const existing = this.hooks.get(name);
    if (!existing) return false;

    if (existing.beforeExecute) {
      const idx = this.beforeExecuteHooks.indexOf(existing.beforeExecute);
      if (idx > -1) this.beforeExecuteHooks.splice(idx, 1);
    }
    if (existing.afterExecute) {
      const idx = this.afterExecuteHooks.indexOf(existing.afterExecute);
      if (idx > -1) this.afterExecuteHooks.splice(idx, 1);
    }
    if (existing.onError) {
      const idx = this.onErrorHooks.indexOf(existing.onError);
      if (idx > -1) this.onErrorHooks.splice(idx, 1);
    }
    if (existing.interceptCommand) {
      const idx = this.interceptCommandHooks.indexOf(existing.interceptCommand);
      if (idx > -1) this.interceptCommandHooks.splice(idx, 1);
    }

    return this.hooks.delete(name);
  }

  /**
   * Check if a named hook set is registered
   */
  has(name: string): boolean {
    return this.hooks.has(name);
  }

  /**
   * Run all beforeExecute hooks
   */
  async runBeforeExecute(ctx: HookContext): Promise<void> {
    for (const hook of this.beforeExecuteHooks) {
      await hook(ctx);
    }
  }

  /**
   * Run all afterExecute hooks
   */
  async runAfterExecute(ctx: HookContext, result: unknown): Promise<void> {
    for (const hook of this.afterExecuteHooks) {
      await hook(ctx, result);
    }
  }

  /**
   * Run all onError hooks
   * @returns The potentially transformed error
   */
  async runOnError(ctx: HookContext, error: Error): Promise<Error> {
    let currentError = error;

    for (const hook of this.onErrorHooks) {
      const result = await hook(ctx, currentError);
      if (result instanceof Error) {
        currentError = result;
      }
    }

    return currentError;
  }

  /**
   * Check if any interceptCommand hook wants to skip execution
   * @returns true if command should be intercepted (skipped)
   */
  shouldIntercept(commandName: string, ctx: HookContext): boolean {
    for (const hook of this.interceptCommandHooks) {
      if (hook(commandName, ctx)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get all registered hook names
   */
  getRegisteredNames(): string[] {
    return Array.from(this.hooks.keys());
  }

  /**
   * Clear all registered hooks
   */
  clear(): void {
    this.hooks.clear();
    this.beforeExecuteHooks = [];
    this.afterExecuteHooks = [];
    this.onErrorHooks = [];
    this.interceptCommandHooks = [];
  }
}

/**
 * Create a simple hook set for common use cases
 */
export function createHooks(config: {
  name?: string;
  beforeExecute?: BeforeExecuteHook;
  afterExecute?: AfterExecuteHook;
  onError?: OnErrorHook;
  interceptCommand?: InterceptCommandHook;
}): RuntimeHooks {
  const hooks: RuntimeHooks = {};

  if (config.beforeExecute) hooks.beforeExecute = config.beforeExecute;
  if (config.afterExecute) hooks.afterExecute = config.afterExecute;
  if (config.onError) hooks.onError = config.onError;
  if (config.interceptCommand) hooks.interceptCommand = config.interceptCommand;

  return hooks;
}

/**
 * Logging hooks for debugging
 */
export const loggingHooks: RuntimeHooks = {
  beforeExecute: ctx => {
    console.log(`[HyperFixi] Executing: ${ctx.commandName}`, {
      element: ctx.element,
      args: ctx.args,
    });
  },
  afterExecute: (ctx, result) => {
    console.log(`[HyperFixi] Completed: ${ctx.commandName}`, { result });
  },
  onError: (ctx, error) => {
    console.error(`[HyperFixi] Error in ${ctx.commandName}:`, error);
    return error;
  },
};

/**
 * Performance timing hooks
 */
export function createTimingHooks(
  onTiming: (commandName: string, durationMs: number) => void
): RuntimeHooks {
  const startTimes = new WeakMap<object, number>();

  return {
    beforeExecute: ctx => {
      startTimes.set(ctx, performance.now());
    },
    afterExecute: ctx => {
      const start = startTimes.get(ctx);
      if (start !== undefined) {
        const duration = performance.now() - start;
        onTiming(ctx.commandName, duration);
        startTimes.delete(ctx);
      }
    },
  };
}
