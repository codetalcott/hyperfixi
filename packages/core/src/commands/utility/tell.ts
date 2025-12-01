/**
 * TellCommand - Standalone V2 Implementation
 *
 * Executes commands in the context of target elements
 *
 * This is a standalone implementation with NO V1 dependencies,
 * enabling true tree-shaking by inlining essential utilities.
 *
 * Features:
 * - Execute commands in target element context
 * - you/your/yourself context references
 * - Multiple target support
 * - Result aggregation
 * - Command chaining
 *
 * Syntax:
 *   tell <target> <command> [<command> ...]
 *
 * @example
 *   tell #sidebar hide
 *   tell .buttons add .disabled
 *   tell closest <form/> submit
 *   tell children <input/> set value to ""
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement } from '../../utils/element-check';

/**
 * Typed input for TellCommand
 */
export interface TellCommandInput {
  /** Target element(s) or selector */
  target: HTMLElement | HTMLElement[] | string;
  /** Commands to execute in target context */
  commands: any[];
}

/**
 * Output from tell command execution
 */
export interface TellCommandOutput {
  targetElements: HTMLElement[];
  commandResults: any[];
  executionCount: number;
}

/**
 * TellCommand - Standalone V2 Implementation
 *
 * Self-contained implementation with no V1 dependencies.
 * Achieves tree-shaking by inlining all required utilities.
 *
 * V1 Size: 289 lines
 * V2 Target: ~270 lines (inline utilities, standalone)
 */
export class TellCommand {
  /**
   * Command name as registered in runtime
   */
  readonly name = 'tell';

  /**
   * Command metadata for documentation and tooling
   */
  static readonly metadata = {
    description: 'Execute commands in the context of target elements',
    syntax: ['tell <target> <command> [<command> ...]'],
    examples: [
      'tell #sidebar hide',
      'tell .buttons add .disabled',
      'tell closest <form/> submit',
      'tell children <input/> set value to ""',
    ],
    category: 'utility',
    sideEffects: ['context-switching', 'command-execution'],
  };

  /**
   * Parse raw AST nodes into typed command input
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
  ): Promise<TellCommandInput> {
    if (raw.args.length < 2) {
      throw new Error('tell command requires a target and at least one command');
    }

    // First arg is the target
    const target = await evaluator.evaluate(raw.args[0], context);

    // Remaining args are commands
    const commands = raw.args.slice(1);

    return {
      target,
      commands,
    };
  }

  /**
   * Execute the tell command
   *
   * Executes commands in the context of target elements.
   *
   * @param input - Typed command input from parseInput()
   * @param context - Typed execution context
   * @returns Tell operation result
   */
  async execute(
    input: TellCommandInput,
    context: TypedExecutionContext
  ): Promise<TellCommandOutput> {
    const { target, commands } = input;

    // Resolve target to HTMLElement array
    const targetElements = this.resolveTargets(target, context);

    if (targetElements.length === 0) {
      throw new Error('tell command found no target elements');
    }

    const commandResults: any[] = [];

    // Execute commands for each target element
    for (const targetElement of targetElements) {
      // Create new context with target as "you"
      const tellContext: TypedExecutionContext = {
        ...context,
        you: targetElement,
        // In tell context, "you" is the target, "me" is original me
      };

      // Execute each command in the tell context
      for (const command of commands) {
        try {
          const result = await this.executeCommand(command, tellContext);
          commandResults.push(result);

          // Update context for next command
          Object.assign(tellContext, { it: result });
        } catch (error) {
          throw new Error(
            `Command execution failed in tell block: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );
        }
      }
    }

    return {
      targetElements,
      commandResults,
      executionCount: targetElements.length * commands.length,
    };
  }

  // ========== Private Utility Methods ==========

  /**
   * Resolve target to array of HTMLElements
   *
   * @param target - Target element(s) or selector
   * @param context - Execution context
   * @returns Array of HTMLElements
   */
  private resolveTargets(
    target: HTMLElement | HTMLElement[] | string,
    context: TypedExecutionContext
  ): HTMLElement[] {
    // Handle array of elements
    if (Array.isArray(target)) {
      return target.filter((el): el is HTMLElement => isHTMLElement(el));
    }

    // Handle single element
    if (isHTMLElement(target)) {
      return [target as HTMLElement];
    }

    // Handle CSS selector string
    if (typeof target === 'string') {
      if (typeof document === 'undefined') {
        return [];
      }

      const elements = document.querySelectorAll(target);
      return Array.from(elements).filter((el): el is HTMLElement => isHTMLElement(el));
    }

    // Handle NodeList
    if (target && typeof target === 'object' && 'length' in target) {
      return Array.from(target as any).filter((el): el is HTMLElement => isHTMLElement(el));
    }

    return [];
  }

  /**
   * Execute a command
   *
   * @param command - Command to execute
   * @param context - Execution context
   * @returns Command result
   */
  private async executeCommand(command: any, context: TypedExecutionContext): Promise<any> {
    if (typeof command === 'function') {
      return await command(context);
    }

    if (command && typeof command === 'object' && typeof command.execute === 'function') {
      return await command.execute(context);
    }

    throw new Error('Invalid command: must be a function or object with execute method');
  }
}

/**
 * Factory function to create TellCommand instance
 */
export function createTellCommand(): TellCommand {
  return new TellCommand();
}
