/**
 * Unified Loop Executor
 *
 * Single implementation for all loop types: for, times, while, until, until-event, forever.
 * Reduces code duplication in repeat command from 302 lines to ~50 lines.
 */

import type { TypedExecutionContext } from '../../types/core';

/**
 * Loop configuration - defines how the loop behaves
 */
export interface LoopConfig {
  /** Type of loop for context */
  type: 'for' | 'times' | 'while' | 'until' | 'until-event' | 'forever';

  /** Maximum iterations (safety limit, default 10000) */
  maxIterations?: number;

  /**
   * Called before each iteration to check if loop should continue.
   * Return true to continue, false to stop.
   */
  shouldContinue: (ctx: LoopIterationContext) => boolean | Promise<boolean>;

  /**
   * Called before each iteration to set up loop variables.
   * Use this to set the iteration variable, index variable, etc.
   */
  beforeIteration?: (
    ctx: LoopIterationContext,
    context: TypedExecutionContext
  ) => void | Promise<void>;

  /**
   * For event-driven loops: setup and cleanup
   */
  eventSetup?: {
    eventName: string;
    target: EventTarget;
    onEvent: () => void;
  };
}

/**
 * Context passed to loop callbacks
 */
export interface LoopIterationContext {
  /** Current iteration index (0-based) */
  index: number;

  /** For for-in loops: current item */
  item?: unknown;

  /** For for-in loops: collection being iterated */
  collection?: unknown[];

  /** For times loops: total count */
  count?: number;

  /** For while/until: condition expression */
  conditionExpr?: unknown;

  /** Index variable name (optional) */
  indexVariable?: string;

  /** Item variable name (for-in loops) */
  itemVariable?: string;

  /** Whether a stop event has fired (event-driven loops) */
  eventFired?: boolean;
}

/**
 * Result of loop execution
 */
export interface LoopResult {
  /** Number of iterations completed */
  iterations: number;

  /** Result from last iteration */
  lastResult: unknown;

  /** Whether loop was interrupted by break */
  interrupted: boolean;
}

/**
 * Execute a loop with unified error handling for break/continue.
 *
 * @param config - Loop configuration
 * @param commands - Commands to execute each iteration
 * @param context - Execution context
 * @param iterCtx - Initial iteration context
 * @param executeCommands - Function to execute commands block
 * @returns Loop result with iterations, lastResult, interrupted
 */
export async function executeLoop(
  config: LoopConfig,
  commands: unknown,
  context: TypedExecutionContext,
  iterCtx: LoopIterationContext,
  executeCommands: (cmds: unknown, ctx: TypedExecutionContext) => Promise<unknown>
): Promise<LoopResult> {
  const maxIterations = config.maxIterations ?? 10000;
  let iterations = 0;
  let lastResult: unknown = undefined;
  let interrupted = false;

  // Setup event listener if event-driven loop
  if (config.eventSetup) {
    config.eventSetup.target.addEventListener(
      config.eventSetup.eventName,
      config.eventSetup.onEvent,
      { once: true }
    );
  }

  try {
    while (iterations < maxIterations) {
      // Check loop condition
      const shouldContinue = await config.shouldContinue(iterCtx);
      if (!shouldContinue) break;

      // Setup iteration (set variables, etc.)
      if (config.beforeIteration) {
        await config.beforeIteration(iterCtx, context);
      }

      // Set index variable if specified
      if (iterCtx.indexVariable && context.locals) {
        context.locals.set(iterCtx.indexVariable, iterations);
      }

      // Execute commands with break/continue handling
      try {
        lastResult = await executeCommands(commands, context);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('BREAK')) {
            interrupted = true;
            break;
          }
          if (error.message.includes('CONTINUE')) {
            iterations++;
            iterCtx.index = iterations;
            // For event loops, yield to allow events to fire
            if (config.type === 'until-event') {
              await new Promise(resolve => setTimeout(resolve, 0));
            }
            continue;
          }
        }
        throw error;
      }

      iterations++;
      iterCtx.index = iterations;

      // For event loops, yield to allow events to fire
      if (config.type === 'until-event') {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
  } finally {
    // Cleanup event listener if it hasn't fired
    if (config.eventSetup && !iterCtx.eventFired) {
      config.eventSetup.target.removeEventListener(
        config.eventSetup.eventName,
        config.eventSetup.onEvent
      );
    }
  }

  return { iterations, lastResult, interrupted };
}

/**
 * Helper to create a for-in loop config
 */
export function createForLoopConfig(
  collection: unknown[],
  itemVariable: string,
  indexVariable?: string
): { config: LoopConfig; iterCtx: LoopIterationContext } {
  const iterCtx: LoopIterationContext = {
    index: 0,
    collection,
    itemVariable,
    indexVariable,
  };

  const config: LoopConfig = {
    type: 'for',
    shouldContinue: ctx => ctx.index < (ctx.collection?.length ?? 0),
    beforeIteration: (ctx, context) => {
      ctx.item = ctx.collection?.[ctx.index];
      if (ctx.itemVariable && context.locals) {
        context.locals.set(ctx.itemVariable, ctx.item);
      }
    },
  };

  return { config, iterCtx };
}

/**
 * Helper to create a times loop config
 */
export function createTimesLoopConfig(
  count: number,
  indexVariable?: string
): { config: LoopConfig; iterCtx: LoopIterationContext } {
  const iterCtx: LoopIterationContext = {
    index: 0,
    count,
    indexVariable,
  };

  const config: LoopConfig = {
    type: 'times',
    shouldContinue: ctx => ctx.index < (ctx.count ?? 0),
    beforeIteration: (_ctx, context) => {
      // Set context.it to 1-indexed for _hyperscript compatibility
      Object.assign(context, { it: _ctx.index + 1 });
    },
  };

  return { config, iterCtx };
}

/**
 * Helper to create a while loop config
 */
export function createWhileLoopConfig(
  conditionExpr: unknown,
  evaluateCondition: (expr: unknown, ctx: TypedExecutionContext) => boolean,
  context: TypedExecutionContext,
  indexVariable?: string
): { config: LoopConfig; iterCtx: LoopIterationContext } {
  const iterCtx: LoopIterationContext = {
    index: 0,
    conditionExpr,
    indexVariable,
  };

  const config: LoopConfig = {
    type: 'while',
    shouldContinue: () => evaluateCondition(conditionExpr, context),
  };

  return { config, iterCtx };
}

/**
 * Helper to create an until loop config
 */
export function createUntilLoopConfig(
  conditionExpr: unknown,
  evaluateCondition: (expr: unknown, ctx: TypedExecutionContext) => boolean,
  context: TypedExecutionContext,
  indexVariable?: string
): { config: LoopConfig; iterCtx: LoopIterationContext } {
  const iterCtx: LoopIterationContext = {
    index: 0,
    conditionExpr,
    indexVariable,
  };

  const config: LoopConfig = {
    type: 'until',
    shouldContinue: () => !evaluateCondition(conditionExpr, context),
  };

  return { config, iterCtx };
}

/**
 * Helper to create an until-event loop config
 */
export function createUntilEventLoopConfig(
  eventName: string,
  eventTarget: EventTarget,
  indexVariable?: string
): { config: LoopConfig; iterCtx: LoopIterationContext } {
  const iterCtx: LoopIterationContext = {
    index: 0,
    eventFired: false,
    indexVariable,
  };

  const config: LoopConfig = {
    type: 'until-event',
    shouldContinue: ctx => !ctx.eventFired,
    eventSetup: {
      eventName,
      target: eventTarget,
      onEvent: () => {
        iterCtx.eventFired = true;
      },
    },
  };

  return { config, iterCtx };
}

/**
 * Helper to create a forever loop config
 */
export function createForeverLoopConfig(
  indexVariable?: string,
  maxIterations = 10000
): { config: LoopConfig; iterCtx: LoopIterationContext } {
  const iterCtx: LoopIterationContext = {
    index: 0,
    indexVariable,
  };

  const config: LoopConfig = {
    type: 'forever',
    maxIterations,
    shouldContinue: () => true,
  };

  return { config, iterCtx };
}
