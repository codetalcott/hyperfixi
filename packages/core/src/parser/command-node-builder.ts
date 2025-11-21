/**
 * CommandNodeBuilder - Fluent API for building CommandNode objects
 * Eliminates duplication across 29+ command parsing methods
 */

import type { Token, CommandNode, ExpressionNode, ASTNode } from '../types/core';

/**
 * Position information for AST nodes
 */
interface Position {
  start: number;
  end: number;
  line: number;
  column: number;
}

/**
 * Fluent builder for constructing CommandNode objects with consistent structure
 *
 * @example
 * // Simple command
 * const cmd = CommandNodeBuilder.from(token)
 *   .withArgs(targetExpr)
 *   .build();
 *
 * @example
 * // Blocking command with multiple args
 * const cmd = CommandNodeBuilder.from(token)
 *   .withArgs(condition, thenBlock, elseBlock)
 *   .blocking()
 *   .endingAt(parser.getPosition())
 *   .build();
 *
 * @example
 * // Command with implicit target
 * const cmd = CommandNodeBuilder.named('add')
 *   .withArgs(classExpr)
 *   .withImplicitTarget(targetExpr)
 *   .startingAt(startToken)
 *   .endingAt(parser.getPosition())
 *   .build();
 */
export class CommandNodeBuilder {
  private name: string;
  private args: ExpressionNode[] = [];
  private body?: ASTNode[];
  private implicitTarget?: ExpressionNode;
  private isBlocking = false;
  private modifiers?: Record<string, ExpressionNode>;
  private startPos?: Position;
  private endPos?: Position;

  private constructor(name: string) {
    this.name = name;
  }

  /**
   * Create a builder from a token
   * @param token Token containing command name and position info
   */
  static from(token: Token): CommandNodeBuilder {
    const builder = new CommandNodeBuilder(token.value);
    builder.startPos = {
      start: token.start ?? 0,
      end: token.end ?? 0,
      line: token.line ?? 1,
      column: token.column ?? 1,
    };
    return builder;
  }

  /**
   * Create a builder from an identifier node
   * @param node Identifier node with name and position info
   */
  static fromIdentifier(node: { name: string; start?: number; end?: number; line?: number; column?: number }): CommandNodeBuilder {
    const builder = new CommandNodeBuilder(node.name);
    if (node.start !== undefined) {
      builder.startPos = {
        start: node.start,
        end: node.end ?? 0,
        line: node.line ?? 1,
        column: node.column ?? 1,
      };
    }
    return builder;
  }

  /**
   * Create a builder with a command name (position must be set separately)
   * @param name Command name
   */
  static named(name: string): CommandNodeBuilder {
    return new CommandNodeBuilder(name);
  }

  /**
   * Add arguments to the command
   * @param args Expression nodes to add as arguments
   */
  withArgs(...args: ASTNode[]): this {
    this.args.push(...(args as ExpressionNode[]));
    return this;
  }

  /**
   * Set the command body (for block commands)
   * @param body Array of statement nodes
   */
  withBody(body: ASTNode[]): this {
    this.body = body;
    return this;
  }

  /**
   * Set the implicit target for the command
   * @param target Expression node representing the implicit target
   */
  withImplicitTarget(target: ExpressionNode): this {
    this.implicitTarget = target;
    return this;
  }

  /**
   * Add a modifier to the command (e.g., "to", "from", "with")
   * @param key Modifier keyword
   * @param value Expression node for the modifier value
   */
  withModifier(key: string, value: ExpressionNode): this {
    if (!this.modifiers) {
      this.modifiers = {};
    }
    this.modifiers[key] = value;
    return this;
  }

  /**
   * Add multiple modifiers at once
   * @param modifiers Record of modifier key-value pairs
   */
  withModifiers(modifiers: Record<string, ExpressionNode>): this {
    this.modifiers = { ...this.modifiers, ...modifiers };
    return this;
  }

  /**
   * Mark this command as blocking (default: false)
   * @param value Whether the command should block (default: true)
   */
  blocking(value = true): this {
    this.isBlocking = value;
    return this;
  }

  /**
   * Set the start position from a token or node
   * @param source Token or node with position information
   */
  startingAt(source: Token | { start?: number; end?: number; line?: number; column?: number }): this {
    this.startPos = {
      start: source.start ?? 0,
      end: source.end ?? 0,
      line: source.line ?? 1,
      column: source.column ?? 1,
    };
    return this;
  }

  /**
   * Set the end position from position information
   * @param position Position object with end location
   */
  endingAt(position: { start?: number; end: number; line?: number; column?: number }): this {
    this.endPos = {
      start: position.start ?? this.startPos?.start ?? 0,
      end: position.end,
      line: position.line ?? this.startPos?.line ?? 1,
      column: position.column ?? this.startPos?.column ?? 1,
    };
    return this;
  }

  /**
   * Build the final CommandNode
   * @returns Complete CommandNode with all specified properties
   */
  build(): CommandNode {
    const start = this.startPos?.start ?? 0;
    const end = this.endPos?.end ?? this.startPos?.end ?? 0;
    const line = this.startPos?.line ?? 1;
    const column = this.startPos?.column ?? 1;

    const node: CommandNode = {
      type: 'command',
      name: this.name,
      args: this.args,
      isBlocking: this.isBlocking,
      start,
      end,
      line,
      column,
    };

    // Add optional properties only if they exist
    if (this.body) {
      node.body = this.body;
    }
    if (this.implicitTarget) {
      node.implicitTarget = this.implicitTarget;
    }
    if (this.modifiers) {
      node.modifiers = this.modifiers;
    }

    return node;
  }

  /**
   * Clone this builder to create variations
   * @returns New builder with same properties
   */
  clone(): CommandNodeBuilder {
    const cloned = new CommandNodeBuilder(this.name);
    cloned.args = [...this.args];
    cloned.body = this.body ? [...this.body] : undefined;
    cloned.implicitTarget = this.implicitTarget;
    cloned.isBlocking = this.isBlocking;
    cloned.modifiers = this.modifiers ? { ...this.modifiers } : undefined;
    cloned.startPos = this.startPos ? { ...this.startPos } : undefined;
    cloned.endPos = this.endPos ? { ...this.endPos } : undefined;
    return cloned;
  }
}
