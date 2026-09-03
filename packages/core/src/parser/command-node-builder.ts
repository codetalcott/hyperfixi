/**
 * CommandNodeBuilder - Fluent API for building CommandNode objects
 * Eliminates duplication across 29+ command parsing methods
 */

import type { Token, CommandNode, ExpressionNode, ASTNode, StatementNode } from '../types/core';
import type { SlotKey, SlotMap, SlottedCommandName } from '../ast/command-slots';

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
/**
 * `K` is the command whose row types the slot keys this builder accepts:
 * `CommandNodeBuilder.fromIdentifier<'toggle'>(id).withModifier('on', …)`
 * compiles and `.withModifier('onto', …)` does not. The default is every
 * command's keys, so a builder that names no `K` is checked only against
 * the union — the emit-side twin of `CommandRaw<K>` (Arc 3 step 2).
 */
export class CommandNodeBuilder<K extends SlottedCommandName = SlottedCommandName> {
  private name: string;
  private args: ExpressionNode[] = [];
  private body?: StatementNode[];
  private implicitTarget?: ExpressionNode;
  private isBlocking = false;
  private modifiers?: SlotMap<K>;
  private originalCmd?: string;
  private startPos?: Position;
  private endPos?: Position;

  private constructor(name: string) {
    this.name = name;
  }

  /**
   * Create a builder from a token
   * @param token Token containing command name and position info
   */
  static from<K extends SlottedCommandName = SlottedCommandName>(
    token: Token
  ): CommandNodeBuilder<K> {
    const builder = new CommandNodeBuilder<K>(token.value);
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
  static fromIdentifier<K extends SlottedCommandName = SlottedCommandName>(node: {
    name: string;
    start?: number;
    end?: number;
    line?: number;
    column?: number;
  }): CommandNodeBuilder<K> {
    const builder = new CommandNodeBuilder<K>(node.name);
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
  static named<K extends SlottedCommandName = SlottedCommandName>(
    name: string
  ): CommandNodeBuilder<K> {
    return new CommandNodeBuilder<K>(name);
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
  withBody(body: StatementNode[]): this {
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
  withModifier(key: SlotKey<K>, value: ExpressionNode): this {
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
  withModifiers(modifiers: SlotMap<K>): this {
    this.modifiers = { ...this.modifiers, ...modifiers };
    return this;
  }

  /**
   * Override the command name (e.g., to emit 'set' from an 'increment' parser)
   * @param name New command name
   */
  withName(name: string): this {
    this.name = name;
    return this;
  }

  /**
   * Store the original command name before transformation
   * (e.g., "increment" when emitting a "set" command)
   * @param name Original command name for debugging/compatibility
   */
  withOriginalCommand(name: string): this {
    this.originalCmd = name;
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
  startingAt(
    source: Token | { start?: number; end?: number; line?: number; column?: number }
  ): this {
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
      // `SlotMap<K>` narrows the keys; the node's public shape stays the wide record.
      node.modifiers = this.modifiers as Record<string, ExpressionNode>;
    }
    if (this.originalCmd) {
      node.originalCommand = this.originalCmd;
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
    cloned.originalCmd = this.originalCmd;
    cloned.startPos = this.startPos ? { ...this.startPos } : undefined;
    cloned.endPos = this.endPos ? { ...this.endPos } : undefined;
    return cloned;
  }
}
