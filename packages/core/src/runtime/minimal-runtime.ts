/**
 * Minimal Runtime System - No Enhanced Features
 *
 * This is a stripped-down runtime that excludes all commands and features
 * that require zod validation. It provides basic hyperscript execution
 * for demonstrations and basic usage.
 */

import type {
  ASTNode,
  ExecutionContext,
  CommandNode,
  ExpressionNode,
  EventHandlerNode,
} from '../types/base-types';

export interface MinimalRuntimeOptions {
  debug?: boolean;
}

/**
 * Minimal Runtime Implementation
 */
export class MinimalRuntime {
  private debug: boolean;

  constructor(options: MinimalRuntimeOptions = {}) {
    this.debug = options.debug || false;
  }

  /**
   * Execute an AST node
   */
  async execute(ast: ASTNode, context: ExecutionContext): Promise<unknown> {
    try {
      if (this.debug) {
        console.log('MinimalRuntime executing:', ast);
      }

      switch (ast.type) {
        case 'command':
          return this.executeCommand(ast as CommandNode, context);

        case 'expression':
          return this.executeExpression(ast as ExpressionNode, context);

        case 'event-handler':
          return this.executeEventHandler(ast as EventHandlerNode, context);

        default:
          throw new Error(`Unsupported AST node type: ${ast.type}`);
      }
    } catch (error) {
      if (this.debug) {
        console.error('MinimalRuntime execution error:', error);
      }
      throw error;
    }
  }

  /**
   * Execute a command node with basic commands only
   */
  private async executeCommand(node: CommandNode, context: ExecutionContext): Promise<unknown> {
    const { name, args = [] } = node;

    // Basic toggle command implementation
    if (name === 'toggle') {
      return this.executeToggleCommand(args, context);
    }

    // Basic set command implementation
    if (name === 'set') {
      return this.executeSetCommand(args, context);
    }

    // Basic add command implementation
    if (name === 'add') {
      return this.executeAddCommand(args, context);
    }

    // Basic remove command implementation
    if (name === 'remove') {
      return this.executeRemoveCommand(args, context);
    }

    throw new Error(`Command '${name}' is not supported in minimal runtime`);
  }

  /**
   * Basic toggle implementation
   */
  private async executeToggleCommand(args: ASTNode[], context: ExecutionContext): Promise<unknown> {
    if (args.length < 1) {
      throw new Error('Toggle command requires at least 1 argument');
    }

    const classArg = args[0];
    if (classArg.type === 'literal' && typeof classArg.value === 'string') {
      const className = classArg.value.startsWith('.') ? classArg.value.slice(1) : classArg.value;
      const element = context.me;

      if (element instanceof HTMLElement) {
        element.classList.toggle(className);
        return element;
      }
    }

    throw new Error('Toggle command requires a CSS class name');
  }

  /**
   * Basic set implementation
   */
  private async executeSetCommand(args: ASTNode[], context: ExecutionContext): Promise<unknown> {
    if (args.length < 3) {
      throw new Error('Set command requires at least 3 arguments: set <target> to <value>');
    }

    // Simple property setting
    const target = await this.executeExpression(args[0] as ExpressionNode, context);
    // Skip the 'to' keyword
    const value = await this.executeExpression(args[2] as ExpressionNode, context);

    if (target && typeof target === 'object' && 'value' in target) {
      (target as any).value = value;
      return target;
    }

    return value;
  }

  /**
   * Basic add implementation
   */
  private async executeAddCommand(args: ASTNode[], context: ExecutionContext): Promise<unknown> {
    if (args.length < 1) {
      throw new Error('Add command requires at least 1 argument');
    }

    const classArg = args[0];
    if (classArg.type === 'literal' && typeof classArg.value === 'string') {
      const className = classArg.value.startsWith('.') ? classArg.value.slice(1) : classArg.value;
      const element = context.me;

      if (element instanceof HTMLElement) {
        element.classList.add(className);
        return element;
      }
    }

    throw new Error('Add command requires a CSS class name');
  }

  /**
   * Basic remove implementation
   */
  private async executeRemoveCommand(args: ASTNode[], context: ExecutionContext): Promise<unknown> {
    if (args.length === 0) {
      // Remove the element itself
      const element = context.me;
      if (element instanceof HTMLElement) {
        element.remove();
        return null;
      }
    } else {
      // Remove a class
      const classArg = args[0];
      if (classArg.type === 'literal' && typeof classArg.value === 'string') {
        const className = classArg.value.startsWith('.') ? classArg.value.slice(1) : classArg.value;
        const element = context.me;

        if (element instanceof HTMLElement) {
          element.classList.remove(className);
          return element;
        }
      }
    }

    throw new Error('Remove command failed');
  }

  /**
   * Execute an expression (minimal implementation)
   */
  private async executeExpression(
    node: ExpressionNode,
    context: ExecutionContext
  ): Promise<unknown> {
    switch (node.subtype || node.type) {
      case 'literal':
        return (node as any).value;

      case 'reference':
        return this.resolveReference((node as any).name, context);

      case 'property-access':
        const obj = await this.executeExpression((node as any).object, context);
        const prop = (node as any).property;
        return obj && typeof obj === 'object' ? (obj as any)[prop] : undefined;

      default:
        throw new Error(
          `Expression type '${node.subtype || node.type}' not supported in minimal runtime`
        );
    }
  }

  /**
   * Execute an event handler
   */
  private async executeEventHandler(
    node: EventHandlerNode,
    context: ExecutionContext
  ): Promise<unknown> {
    const { event, commands } = node;

    // Set up event listener
    if (context.me instanceof HTMLElement) {
      context.me.addEventListener(event, async () => {
        for (const command of commands) {
          await this.executeCommand(command as CommandNode, context);
        }
      });
    }

    return context.me;
  }

  /**
   * Resolve context references
   */
  private resolveReference(name: string, context: ExecutionContext): unknown {
    switch (name) {
      case 'me':
        return context.me;
      case 'you':
        return context.you;
      case 'it':
        return context.it;
      default:
        return undefined;
    }
  }
}

/**
 * Default minimal runtime instance
 */
export const minimalRuntime = new MinimalRuntime();
