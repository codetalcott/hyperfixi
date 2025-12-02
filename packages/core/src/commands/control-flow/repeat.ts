/**
 * RepeatCommand - Standalone V2 Implementation
 *
 * Provides iteration in the hyperscript language
 *
 * This is a standalone implementation with NO V1 dependencies,
 * enabling true tree-shaking by inlining essential utilities.
 *
 * Features:
 * - For-in loops (iterate over collections)
 * - Counted loops (repeat N times)
 * - Conditional loops (while/until)
 * - Event-driven loops (until event fires)
 * - Forever loops (with safety limits)
 * - Index variable support
 * - Break/continue control flow
 *
 * Syntax:
 *   repeat for <var> in <collection> [index <indexVar>] { <commands> }
 *   repeat <count> times [index <indexVar>] { <commands> }
 *   repeat while <condition> [index <indexVar>] { <commands> }
 *   repeat until <condition> [index <indexVar>] { <commands> }
 *   repeat until <event> [from <target>] [index <indexVar>] { <commands> }
 *   repeat forever [index <indexVar>] { <commands> }
 *
 * @example
 *   repeat for item in items { log item }
 *   repeat 5 times { log "hello" }
 *   repeat while count < 10 { increment count }
 *   repeat until done { checkStatus }
 *   repeat until click from #button { animate }
 *   repeat forever { monitor }
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import { evaluateCondition } from '../helpers/condition-helpers';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';

/**
 * Typed input for RepeatCommand
 * Represents parsed loop configuration ready for execution
 */
export interface RepeatCommandInput {
  /** Type of loop */
  type: 'for' | 'times' | 'while' | 'until' | 'until-event' | 'forever';
  /** Variable name for iteration (for-in loops) */
  variable?: string;
  /** Collection to iterate over (for-in loops) */
  collection?: any;
  /** Condition for while/until loops */
  condition?: any;
  /** Number of times for counted loops */
  count?: number;
  /** Index variable name (optional, all loop types) */
  indexVariable?: string;
  /** Commands to execute in loop (AST nodes) */
  commands?: any;
  /** Event name for event-driven loops */
  eventName?: string;
  /** Event target for event-driven loops */
  eventTarget?: any;
}

/**
 * Output from Repeat command execution
 */
export interface RepeatCommandOutput {
  /** Loop type that was executed */
  type: string;
  /** Number of iterations completed */
  iterations: number;
  /** Whether loop completed normally */
  completed: boolean;
  /** Result from last iteration */
  lastResult?: any;
  /** Whether loop was interrupted by break */
  interrupted?: boolean;
}

/**
 * RepeatCommand - Standalone V2 Implementation
 *
 * Self-contained implementation with no V1 dependencies.
 * Achieves tree-shaking by inlining all required utilities.
 *
 * V1 Size: 641 lines (with debug logging, validation, all loop types)
 * V2 Target: ~550 lines (14% reduction, all features preserved)
 */
export class RepeatCommand {
  /**
   * Command name as registered in runtime
   */
  readonly name = 'repeat';

  /**
   * Command metadata for documentation and tooling
   */
  static readonly metadata = {
    description: 'Iteration in hyperscript - for-in, counted, conditional, event-driven, and infinite loops',
    syntax: [
      'repeat for <var> in <collection> [index <indexVar>] { <commands> }',
      'repeat <count> times [index <indexVar>] { <commands> }',
      'repeat while <condition> [index <indexVar>] { <commands> }',
      'repeat until <condition> [index <indexVar>] { <commands> }',
      'repeat until <event> [from <target>] [index <indexVar>] { <commands> }',
      'repeat forever [index <indexVar>] { <commands> }',
    ],
    examples: [
      'repeat for item in items { log item }',
      'repeat 5 times { log "hello" }',
      'repeat while count < 10 { increment count }',
      'repeat until done { checkStatus }',
      'repeat until click from #button { animate }',
      'repeat forever { monitor }',
    ],
    category: 'control-flow',
    sideEffects: ['iteration', 'conditional-execution'],
  };

  /**
   * Parse raw AST nodes into typed command input
   *
   * Determines loop type and extracts parameters.
   * Loop type is detected from raw.modifiers or first argument.
   *
   * Note: The parser should structure the AST with:
   * - Loop type detection from keywords (for, times, while, until, forever)
   * - Variable and collection for for-in loops
   * - Count for counted loops
   * - Condition for while/until loops
   * - Event name and target for event-driven loops
   * - Commands block in raw.modifiers or separate field
   *
   * @param raw - Raw command node with args and modifiers from AST
   * @param evaluator - Expression evaluator for evaluating AST nodes
   * @param context - Execution context with me, you, it, etc.
   * @returns Typed input object for execute()
   */
  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<RepeatCommandInput> {
    // Detect loop type from raw structure
    let type: RepeatCommandInput['type'];
    let variable: string | undefined;
    let collection: any;
    let condition: any;
    let count: number | undefined;
    let indexVariable: string | undefined;
    let commands: any;
    let eventName: string | undefined;
    let eventTarget: any;

    // Extract index variable if present
    if (raw.modifiers?.index) {
      const indexValue = await evaluator.evaluate(raw.modifiers.index, context);
      if (typeof indexValue === 'string') {
        indexVariable = indexValue;
      }
    }

    // Extract commands (usually in a block or modifier)
    commands = raw.modifiers?.block || raw.modifiers?.commands;

    // CRITICAL FIX: Check args[0] for loop type identifier from parser
    // Parser puts loop type as first arg: { type: 'identifier', name: 'for'|'times'|'while'|'until'|'until-event'|'forever' }
    const firstArg = raw.args[0] as any;
    const loopTypeFromArg = firstArg?.type === 'identifier' ? firstArg.name : null;

    // Find the commands block in args (last arg is usually the block)
    if (!commands) {
      for (let i = raw.args.length - 1; i >= 0; i--) {
        const arg = raw.args[i] as any;
        if (arg?.type === 'block' && arg.commands) {
          commands = arg;
          break;
        }
      }
    }

    // Detect loop type based on args[0] identifier, modifiers, or loopType property
    if (loopTypeFromArg === 'for' || raw.modifiers?.for || (raw as any).loopType === 'for') {
      // For-in loop: repeat for <var> in <collection>
      type = 'for';
      // Variable is in args[1] (string node with value)
      const varArg = raw.args[1] as any;
      variable = varArg?.value || varArg?.name || (raw as any).variable;
      // Collection is in args[2]
      collection = raw.args[2] ? await evaluator.evaluate(raw.args[2], context) : (raw as any).collection;
    } else if (loopTypeFromArg === 'times' || raw.modifiers?.times || (raw as any).loopType === 'times') {
      // Counted loop: repeat <count> times
      type = 'times';
      // Count is in args[1]
      const countArg = raw.args[1] as any;
      const countValue = countArg ? await evaluator.evaluate(countArg, context) : (raw as any).count;
      count = typeof countValue === 'number' ? countValue : parseInt(String(countValue), 10);
    } else if (loopTypeFromArg === 'while' || raw.modifiers?.while || (raw as any).loopType === 'while') {
      // While loop: repeat while <condition>
      type = 'while';
      // Condition is in args[1]
      condition = raw.args[1] || (raw as any).condition || raw.modifiers?.while;
    } else if (loopTypeFromArg === 'until-event' || (loopTypeFromArg === 'until' && raw.modifiers?.from) || (raw as any).loopType === 'until-event') {
      // Event-driven loop: repeat until event <eventName> from <target>
      type = 'until-event';
      // Event name is in args[1] (string node)
      const eventArg = raw.args[1] as any;
      eventName = eventArg?.value || eventArg?.name;
      // Event target is in args[2]
      if (raw.args[2]) {
        eventTarget = await evaluator.evaluate(raw.args[2], context);
      }
      // Check for index variable in args[3]
      const indexArg = raw.args[3] as any;
      if (indexArg?.type === 'string' && indexArg.value) {
        indexVariable = indexArg.value;
      }
    } else if (loopTypeFromArg === 'until' || raw.modifiers?.until || (raw as any).loopType === 'until') {
      // Until loop: repeat until <condition>
      type = 'until';
      // Condition is in args[1]
      condition = raw.args[1] || (raw as any).condition || raw.modifiers?.until;
    } else if (loopTypeFromArg === 'forever' || raw.modifiers?.forever || (raw as any).loopType === 'forever') {
      // Forever loop: repeat forever
      type = 'forever';
    } else {
      throw new Error('repeat command requires a loop type (for/times/while/until/forever)');
    }

    // Validate type-specific requirements
    if (type === 'for' && (!variable || collection === undefined)) {
      throw new Error('for loops require variable and collection');
    }
    if (type === 'times' && (count === undefined || isNaN(count))) {
      throw new Error('times loops require a count number');
    }
    if (type === 'while' && condition === undefined) {
      throw new Error('while loops require a condition');
    }
    if (type === 'until' && condition === undefined) {
      throw new Error('until loops require a condition');
    }
    if (type === 'until-event' && !eventName) {
      throw new Error('until-event loops require an event name');
    }

    return {
      type,
      variable,
      collection,
      condition,
      count,
      indexVariable,
      commands,
      eventName,
      eventTarget,
    };
  }

  /**
   * Execute the repeat command
   *
   * Delegates to appropriate loop handler based on type.
   *
   * @param input - Typed command input from parseInput()
   * @param context - Typed execution context
   * @returns Result with iteration count and status
   */
  async execute(
    input: RepeatCommandInput,
    context: TypedExecutionContext
  ): Promise<RepeatCommandOutput> {
    const { type, variable, collection, condition, count, indexVariable, commands, eventName, eventTarget } = input;

    let iterations = 0;
    let completed = false;
    let lastResult: any = undefined;
    let interrupted = false;

    try {
      switch (type) {
        case 'for':
          ({ iterations, lastResult, interrupted } = await this.handleForLoop(
            context,
            variable!,
            collection,
            indexVariable,
            commands
          ));
          break;

        case 'times':
          ({ iterations, lastResult, interrupted } = await this.handleTimesLoop(
            context,
            count!,
            indexVariable,
            commands
          ));
          break;

        case 'while':
          ({ iterations, lastResult, interrupted } = await this.handleWhileLoop(
            context,
            condition,
            indexVariable,
            commands
          ));
          break;

        case 'until':
          ({ iterations, lastResult, interrupted } = await this.handleUntilLoop(
            context,
            condition,
            indexVariable,
            commands
          ));
          break;

        case 'until-event':
          ({ iterations, lastResult, interrupted } = await this.handleUntilEventLoop(
            context,
            eventName!,
            eventTarget,
            indexVariable,
            commands
          ));
          break;

        case 'forever':
          ({ iterations, lastResult, interrupted } = await this.handleForeverLoop(
            context,
            indexVariable,
            commands
          ));
          break;

        default:
          throw new Error(`Unknown repeat type: ${type}`);
      }

      completed = !interrupted;

      // Update context.it to last result
      Object.assign(context, { it: lastResult });

      return {
        type,
        iterations,
        completed,
        lastResult,
        interrupted,
      };
    } catch (error) {
      // Handle control flow errors (break, continue)
      if (error instanceof Error) {
        if (error.message.includes('BREAK')) {
          return {
            type,
            iterations,
            completed: true,
            lastResult,
            interrupted: true,
          };
        }
        if (error.message.includes('CONTINUE')) {
          // CONTINUE at top level means loop completed normally
          return {
            type,
            iterations,
            completed: true,
            lastResult,
          };
        }
      }

      throw error;
    }
  }

  // ========== Loop Handlers ==========

  /**
   * Handle for-in loop: repeat for <var> in <collection>
   */
  private async handleForLoop(
    context: TypedExecutionContext,
    variable: string,
    collection: any,
    indexVariable?: string,
    commands: any = []
  ): Promise<{ iterations: number; lastResult: any; interrupted: boolean }> {
    let iterations = 0;
    let lastResult: any = undefined;
    let interrupted = false;

    // Ensure collection is iterable
    const items = Array.isArray(collection) ? collection : [collection];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Set loop variables
      if (context.locals) {
        context.locals.set(variable, item);
        if (indexVariable) {
          context.locals.set(indexVariable, i);
        }
      }

      // Execute commands
      try {
        lastResult = await this.executeCommands(commands, context);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('BREAK')) {
            interrupted = true;
            break;
          }
          if (error.message.includes('CONTINUE')) {
            // Continue to next iteration
            iterations++;
            continue;
          }
        }
        throw error;
      }

      iterations++;
    }

    return { iterations, lastResult, interrupted };
  }

  /**
   * Handle counted loop: repeat <count> times
   */
  private async handleTimesLoop(
    context: TypedExecutionContext,
    count: number,
    indexVariable?: string,
    commands: any = []
  ): Promise<{ iterations: number; lastResult: any; interrupted: boolean }> {
    let iterations = 0;
    let lastResult: any = undefined;
    let interrupted = false;

    for (let i = 0; i < count; i++) {
      // Set index variable
      if (indexVariable && context.locals) {
        context.locals.set(indexVariable, i);
      }

      // Set context.it to current iteration index (1-indexed for _hyperscript compatibility)
      Object.assign(context, { it: i + 1 });

      // Execute commands
      try {
        lastResult = await this.executeCommands(commands, context);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('BREAK')) {
            interrupted = true;
            break;
          }
          if (error.message.includes('CONTINUE')) {
            iterations++;
            continue;
          }
        }
        throw error;
      }

      iterations++;
    }

    return { iterations, lastResult, interrupted };
  }

  /**
   * Handle while loop: repeat while <condition>
   */
  private async handleWhileLoop(
    context: TypedExecutionContext,
    condition: any,
    indexVariable?: string,
    commands: any = []
  ): Promise<{ iterations: number; lastResult: any; interrupted: boolean }> {
    let iterations = 0;
    let lastResult: any = undefined;
    let interrupted = false;
    const maxIterations = 10000; // Safety limit

    while (evaluateCondition(condition, context) && iterations < maxIterations) {
      // Set index variable
      if (indexVariable && context.locals) {
        context.locals.set(indexVariable, iterations);
      }

      // Execute commands
      try {
        lastResult = await this.executeCommands(commands, context);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('BREAK')) {
            interrupted = true;
            break;
          }
          if (error.message.includes('CONTINUE')) {
            iterations++;
            continue;
          }
        }
        throw error;
      }

      iterations++;
    }

    return { iterations, lastResult, interrupted };
  }

  /**
   * Handle until loop: repeat until <condition>
   */
  private async handleUntilLoop(
    context: TypedExecutionContext,
    condition: any,
    indexVariable?: string,
    commands: any = []
  ): Promise<{ iterations: number; lastResult: any; interrupted: boolean }> {
    let iterations = 0;
    let lastResult: any = undefined;
    let interrupted = false;
    const maxIterations = 10000; // Safety limit

    while (!evaluateCondition(condition, context) && iterations < maxIterations) {
      // Set index variable
      if (indexVariable && context.locals) {
        context.locals.set(indexVariable, iterations);
      }

      // Execute commands
      try {
        lastResult = await this.executeCommands(commands, context);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('BREAK')) {
            interrupted = true;
            break;
          }
          if (error.message.includes('CONTINUE')) {
            iterations++;
            continue;
          }
        }
        throw error;
      }

      iterations++;
    }

    return { iterations, lastResult, interrupted };
  }

  /**
   * Handle event-driven loop: repeat until <event> from <target>
   */
  private async handleUntilEventLoop(
    context: TypedExecutionContext,
    eventName: string,
    eventTarget: any,
    indexVariable?: string,
    commands: any = []
  ): Promise<{ iterations: number; lastResult: any; interrupted: boolean }> {
    let iterations = 0;
    let lastResult: any = undefined;
    let interrupted = false;
    let eventFired = false;

    // Resolve event target (defaults to context.me)
    let target: EventTarget = context.me as EventTarget;
    if (eventTarget) {
      if (eventTarget instanceof EventTarget) {
        target = eventTarget;
      } else if (typeof eventTarget === 'string' && eventTarget === 'document') {
        target = document;
      } else if (typeof eventTarget === 'function') {
        target = await eventTarget(context);
      } else {
        target = eventTarget;
      }
    }

    // Setup event listener to stop the loop
    const eventHandler = () => {
      eventFired = true;
    };

    target.addEventListener(eventName, eventHandler, { once: true });

    try {
      // Keep looping until event fires
      const maxIterations = 10000; // Safety limit
      while (!eventFired && iterations < maxIterations) {
        // Set index variable
        if (indexVariable && context.locals) {
          context.locals.set(indexVariable, iterations);
        }

        // Execute commands
        try {
          lastResult = await this.executeCommands(commands, context);
        } catch (error) {
          if (error instanceof Error) {
            if (error.message.includes('BREAK')) {
              interrupted = true;
              break;
            }
            if (error.message.includes('CONTINUE')) {
              iterations++;
              // Wait a tick before continuing
              await new Promise(resolve => setTimeout(resolve, 0));
              continue;
            }
          }
          throw error;
        }

        iterations++;

        // Wait a tick to allow events to trigger
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    } finally {
      // Cleanup: remove event listener if it hasn't fired
      if (!eventFired) {
        target.removeEventListener(eventName, eventHandler);
      }
    }

    return { iterations, lastResult, interrupted };
  }

  /**
   * Handle forever loop: repeat forever
   */
  private async handleForeverLoop(
    context: TypedExecutionContext,
    indexVariable?: string,
    commands: any = []
  ): Promise<{ iterations: number; lastResult: any; interrupted: boolean }> {
    let iterations = 0;
    let lastResult: any = undefined;
    let interrupted = false;
    const maxIterations = 10000; // Safety limit to prevent infinite loops

    while (iterations < maxIterations) {
      // Set index variable
      if (indexVariable && context.locals) {
        context.locals.set(indexVariable, iterations);
      }

      // Execute commands
      try {
        lastResult = await this.executeCommands(commands, context);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('BREAK')) {
            interrupted = true;
            break;
          }
          if (error.message.includes('CONTINUE')) {
            iterations++;
            continue;
          }
        }
        throw error;
      }

      iterations++;
    }

    return { iterations, lastResult, interrupted };
  }

  // ========== Private Utility Methods ==========

  /**
   * Execute commands block or array
   *
   * Handles different command formats:
   * - Block node (type: 'block', commands: [...])
   * - Array of commands
   * - Single command or function
   *
   * @param commands - Commands to execute
   * @param context - Execution context
   * @returns Result of last command
   */
  private async executeCommands(commands: any, context: TypedExecutionContext): Promise<any> {
    // Handle block nodes from parser
    if (commands && typeof commands === 'object' && commands.type === 'block') {
      return this.executeBlock(commands, context);
    }

    // Handle array of commands
    if (Array.isArray(commands)) {
      let lastResult: any = undefined;
      for (const command of commands) {
        if (typeof command === 'function') {
          lastResult = await command(context);
        } else if (command && typeof command.execute === 'function') {
          lastResult = await command.execute(context);
        } else {
          lastResult = command;
        }
      }
      return lastResult;
    }

    // Single command or function
    if (typeof commands === 'function') {
      return await commands(context);
    }

    return commands;
  }

  /**
   * Execute a block node using runtime
   *
   * @param block - Block node from parser
   * @param context - Execution context
   * @returns Result of last command in block
   */
  private async executeBlock(block: any, context: TypedExecutionContext): Promise<any> {
    // Get the runtime execute function from context
    const runtimeExecute = context.locals.get('_runtimeExecute') as any;
    if (!runtimeExecute) {
      throw new Error('Runtime execute function not available in context');
    }

    let lastResult: any = undefined;

    // Execute each command in the block
    if (block.commands && Array.isArray(block.commands)) {
      for (const command of block.commands) {
        lastResult = await runtimeExecute(command, context);
      }
    }

    return lastResult;
  }
}

/**
 * Factory function to create RepeatCommand instance
 */
export function createRepeatCommand(): RepeatCommand {
  return new RepeatCommand();
}
