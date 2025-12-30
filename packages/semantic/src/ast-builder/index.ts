/**
 * Semantic to AST Builder
 *
 * Converts SemanticNodes directly to AST nodes, bypassing the English text
 * generation and re-parsing step.
 *
 * Flow:
 *   Japanese → Semantic Parser → SemanticNode → AST Builder → AST
 *
 * Instead of:
 *   Japanese → Semantic Parser → SemanticNode → English Text → Parser → AST
 */

import type {
  SemanticNode,
  CommandSemanticNode,
  EventHandlerSemanticNode,
  ConditionalSemanticNode,
  CompoundSemanticNode,
  LoopSemanticNode,
} from '../types';

import type { SemanticRole } from '@hyperfixi/i18n/src/grammar/types';

import { convertValue } from './value-converters';
import { getCommandMapper, type CommandMapperResult } from './command-mappers';
import type { ExpressionNode } from './expression-parser';

// =============================================================================
// AST Types (compatible with @hyperfixi/core)
// =============================================================================

/**
 * Base AST node interface
 */
export interface ASTNode {
  readonly type: string;
  readonly start?: number;
  readonly end?: number;
  readonly line?: number;
  readonly column?: number;
  [key: string]: unknown;
}

/**
 * Command AST node
 */
export interface CommandNode extends ASTNode {
  readonly type: 'command';
  readonly name: string;
  readonly args: ExpressionNode[];
  readonly modifiers?: Record<string, ExpressionNode>;
  readonly isBlocking?: boolean;
  readonly implicitTarget?: ExpressionNode;
}

/**
 * Event handler AST node (compatible with @hyperfixi/core)
 */
export interface EventHandlerNode extends ASTNode {
  readonly type: 'eventHandler';
  /** Primary event name */
  readonly event: string;
  /** All event names when using "on event1 or event2" syntax */
  readonly events?: string[];
  /** CSS selector for event delegation ("from" keyword) */
  readonly selector?: string;
  /** Target for "from" clause (as string or expression) */
  readonly target?: string;
  /** Optional event condition ("[condition]" syntax) */
  readonly condition?: ASTNode;
  /** Attribute name for mutation events ("of @attribute" syntax) */
  readonly attributeName?: string;
  /** Target element to watch for changes ("in <target>" syntax) */
  readonly watchTarget?: ExpressionNode;
  /** Event parameter names to destructure (e.g., ['clientX', 'clientY']) */
  readonly args?: string[];
  /** Event parameters (alias for args) */
  readonly params?: string[];
  /** Handler commands */
  readonly commands: ASTNode[];
}

/**
 * Conditional AST node (if/else)
 *
 * Note: For runtime compatibility, buildConditional() now produces a CommandNode
 * with condition and branches as args, matching what IfCommand expects.
 * This interface is retained for reference but not used as output.
 */
export interface ConditionalNode extends ASTNode {
  readonly type: 'if';
  readonly condition: ExpressionNode;
  readonly thenBranch: ASTNode[];
  readonly elseBranch?: ASTNode[];
}

/**
 * Command sequence node (runtime-compatible format for chained commands)
 */
export interface CommandSequenceNode extends ASTNode {
  readonly type: 'CommandSequence';
  /** Commands in the sequence */
  readonly commands: ASTNode[];
}

/**
 * Block node (for grouping commands)
 */
export interface BlockNode extends ASTNode {
  readonly type: 'block';
  readonly commands: ASTNode[];
}

// =============================================================================
// AST Builder
// =============================================================================

export interface ASTBuilderOptions {
  /**
   * Fallback function to parse complex expressions that can't be handled
   * directly by the AST builder. Uses the expression-parser by default.
   */
  parseExpression?: (input: string) => ExpressionNode | null;
}

/**
 * Builds AST nodes directly from SemanticNodes.
 */
export class ASTBuilder {
  /**
   * Warnings collected during AST building (e.g., type inference issues).
   */
  public warnings: string[] = [];

  constructor(_options: ASTBuilderOptions = {}) {
    // Options reserved for future use (e.g., custom expression parser)
  }

  /**
   * Build an AST from a SemanticNode.
   *
   * @param node - The semantic node to convert
   * @returns The corresponding AST node
   */
  build(node: SemanticNode): ASTNode {
    switch (node.kind) {
      case 'command':
        return this.buildCommand(node as CommandSemanticNode);
      case 'event-handler':
        return this.buildEventHandler(node as EventHandlerSemanticNode);
      case 'conditional':
        return this.buildConditional(node as ConditionalSemanticNode);
      case 'compound':
        return this.buildCompound(node as CompoundSemanticNode);
      case 'loop':
        return this.buildLoop(node as LoopSemanticNode);
      default:
        throw new Error(`Unknown semantic node kind: ${(node as SemanticNode).kind}`);
    }
  }

  /**
   * Build a CommandNode from a CommandSemanticNode.
   */
  private buildCommand(node: CommandSemanticNode): CommandNode {
    const mapper = getCommandMapper(node.action);

    if (mapper) {
      // Use command-specific mapper
      const result = mapper.toAST(node, this);

      // Handle both new CommandMapperResult format and legacy CommandNode format
      if ('ast' in result && 'warnings' in result) {
        // New format with warnings
        const mapperResult = result as CommandMapperResult;
        this.warnings.push(...mapperResult.warnings);
        return mapperResult.ast;
      } else {
        // Legacy format (just CommandNode)
        return result as CommandNode;
      }
    }

    // Fallback: generic command mapping
    return this.buildGenericCommand(node);
  }

  /**
   * Generic command builder when no specific mapper is available.
   * Maps roles to args in a predictable order.
   */
  private buildGenericCommand(node: CommandSemanticNode): CommandNode {
    const args: ExpressionNode[] = [];
    const modifiers: Record<string, ExpressionNode> = {};

    // Standard role-to-position mapping
    // Note: Using only valid SemanticRoles from the type definition
    const argRoles: SemanticRole[] = ['patient', 'source', 'quantity'];
    const modifierRoles: SemanticRole[] = ['destination', 'duration', 'method', 'style'];

    // Convert argument roles
    for (const role of argRoles) {
      const value = node.roles.get(role);
      if (value) {
        args.push(convertValue(value));
      }
    }

    // Convert modifier roles
    for (const role of modifierRoles) {
      const value = node.roles.get(role);
      if (value) {
        // Map semantic roles to hyperscript modifier keywords
        const modifierKey = this.roleToModifierKey(role);
        modifiers[modifierKey] = convertValue(value);
      }
    }

    const result: CommandNode = {
      type: 'command',
      name: node.action,
      args,
    };

    // Only add modifiers if there are any (avoid exactOptionalPropertyTypes issue)
    if (Object.keys(modifiers).length > 0) {
      return { ...result, modifiers };
    }

    return result;
  }

  /**
   * Map semantic roles to hyperscript modifier keywords.
   */
  private roleToModifierKey(role: SemanticRole): string {
    const mapping: Partial<Record<SemanticRole, string>> = {
      destination: 'on',
      duration: 'for',
      source: 'from',
      condition: 'if',
      method: 'via',
      style: 'with',
    };
    return mapping[role] ?? role;
  }

  /**
   * Build an EventHandlerNode from an EventHandlerSemanticNode.
   */
  private buildEventHandler(node: EventHandlerSemanticNode): EventHandlerNode {
    // Extract event name(s)
    const eventValue = node.roles.get('event');
    let event: string;
    let events: string[] | undefined;

    if (eventValue?.type === 'literal') {
      const eventStr = String(eventValue.value);
      // Handle "click or keydown" syntax
      if (eventStr.includes('|') || eventStr.includes(' or ')) {
        events = eventStr.split(/\s+or\s+|\|/).map(e => e.trim());
        event = events[0];
      } else {
        event = eventStr;
      }
    } else if (eventValue?.type === 'reference') {
      event = eventValue.value;
    } else {
      event = 'click'; // Default event
    }

    // Build body commands recursively
    const commands = node.body.map(child => this.build(child));

    // Get selector/target from 'source' role if present
    const fromValue = node.roles.get('source');
    let selector: string | undefined;
    let target: string | undefined;

    if (fromValue?.type === 'selector') {
      selector = fromValue.value;
      target = fromValue.value;
    } else if (fromValue?.type === 'reference') {
      target = fromValue.value;
    } else if (fromValue?.type === 'literal') {
      target = String(fromValue.value);
    }

    // Get condition from 'condition' role if present
    const conditionValue = node.roles.get('condition');
    const condition = conditionValue ? convertValue(conditionValue) : undefined;

    // Get destination (watchTarget) if present
    const destinationValue = node.roles.get('destination');
    const watchTarget = destinationValue ? convertValue(destinationValue) : undefined;

    // Extract event modifiers
    const modifiers = node.eventModifiers;

    // Handle queue modifier (debounce, throttle, etc. are runtime concerns)
    let finalSelector = selector;
    if (modifiers?.from) {
      const fromMod = modifiers.from;
      if (fromMod.type === 'selector' && !selector) {
        finalSelector = fromMod.value;
      }
    }

    // Extract event parameter names for destructuring (e.g., on click(clientX, clientY))
    const args = node.parameterNames ? [...node.parameterNames] : undefined;

    // Build result with spread for optional properties (exactOptionalPropertyTypes compliant)
    return {
      type: 'eventHandler' as const,
      event,
      commands,
      ...(events && events.length > 1 ? { events } : {}),
      ...(finalSelector ? { selector: finalSelector } : {}),
      ...(target ? { target } : {}),
      ...(condition ? { condition: condition as ASTNode } : {}),
      ...(watchTarget ? { watchTarget } : {}),
      ...(args && args.length > 0 ? { args, params: args } : {}),
    };
  }

  /**
   * Build a CommandNode from a ConditionalSemanticNode.
   *
   * Produces a command node with:
   * - args[0]: condition expression
   * - args[1]: then block (wrapped in { type: 'block', commands: [...] })
   * - args[2]: else block (optional, same format)
   *
   * This format matches what IfCommand.parseInput() expects.
   */
  private buildConditional(node: ConditionalSemanticNode): CommandNode {
    const conditionValue = node.roles.get('condition');
    if (!conditionValue) {
      throw new Error('Conditional node missing condition');
    }

    const condition = convertValue(conditionValue);
    const thenBranch = node.thenBranch.map(child => this.build(child));
    const elseBranch = node.elseBranch?.map(child => this.build(child));

    // Build args array matching IfCommand expected format
    const args: ExpressionNode[] = [
      condition,
      // args[1]: then block wrapped as block node
      {
        type: 'block',
        commands: thenBranch,
      } as unknown as ExpressionNode,
    ];

    // args[2]: else block (if present)
    if (elseBranch && elseBranch.length > 0) {
      args.push({
        type: 'block',
        commands: elseBranch,
      } as unknown as ExpressionNode);
    }

    return {
      type: 'command',
      name: 'if',
      args,
    };
  }

  /**
   * Build AST nodes from a CompoundSemanticNode.
   *
   * Converts to CommandSequence for runtime compatibility.
   * The runtime recognizes 'CommandSequence' type and executes commands in order.
   */
  private buildCompound(node: CompoundSemanticNode): ASTNode {
    // Build all statements recursively
    const statements = node.statements.map(child => this.build(child));

    // Single statement: unwrap and return directly
    if (statements.length === 1) {
      return statements[0];
    }

    // Empty: return a no-op block
    if (statements.length === 0) {
      return {
        type: 'block',
        commands: [],
      };
    }

    // Convert to CommandSequence for runtime compatibility
    // Runtime handles 'CommandSequence' type in executeCommandSequence()
    const result: CommandSequenceNode = {
      type: 'CommandSequence',
      commands: statements,
    };

    return result;
  }

  /**
   * Build a CommandNode from a LoopSemanticNode.
   *
   * Produces a 'repeat' command with:
   * - args[0]: loop type identifier (forever, times, for, while, until)
   * - args[1]: count/condition/variable depending on loop type
   * - args[2]: collection (for 'for' loops)
   * - args[last]: body block
   *
   * This format matches what the repeat command parser produces.
   */
  private buildLoop(node: LoopSemanticNode): CommandNode {
    // Build body commands recursively
    const bodyCommands = node.body.map(child => this.build(child));

    const args: ExpressionNode[] = [
      // args[0]: loop type identifier
      {
        type: 'identifier',
        name: node.loopVariant,
      } as unknown as ExpressionNode,
    ];

    // Add loop-specific arguments based on variant
    switch (node.loopVariant) {
      case 'times': {
        // args[1]: count expression
        const quantity = node.roles.get('quantity');
        if (quantity) {
          args.push(convertValue(quantity));
        }
        break;
      }
      case 'for': {
        // args[1]: loop variable name
        if (node.loopVariable) {
          args.push({
            type: 'string',
            value: node.loopVariable,
          } as unknown as ExpressionNode);
        }
        // args[2]: collection/source
        const source = node.roles.get('source');
        if (source) {
          args.push(convertValue(source));
        }
        break;
      }
      case 'while':
      case 'until': {
        // args[1]: condition expression
        const condition = node.roles.get('condition');
        if (condition) {
          args.push(convertValue(condition));
        }
        break;
      }
      case 'forever':
        // No additional args needed for forever loops
        break;
    }

    // args[last]: body block
    args.push({
      type: 'block',
      commands: bodyCommands,
    } as unknown as ExpressionNode);

    return {
      type: 'command',
      name: 'repeat',
      args,
    };
  }

  /**
   * Build a BlockNode from an array of semantic nodes.
   * Useful for grouping commands in if/else branches.
   */
  buildBlock(nodes: SemanticNode[]): BlockNode {
    const commands = nodes.map(child => this.build(child));
    return {
      type: 'block',
      commands,
    };
  }
}

// =============================================================================
// Convenience Function
// =============================================================================

/**
 * Result from building an AST, including any warnings.
 */
export interface BuildASTResult {
  ast: ASTNode;
  warnings: string[];
}

/**
 * Build an AST from a SemanticNode using default options.
 *
 * @param node - The semantic node to convert
 * @returns The corresponding AST node and any warnings
 */
export function buildAST(node: SemanticNode): BuildASTResult {
  const builder = new ASTBuilder();
  const ast = builder.build(node);
  return {
    ast,
    warnings: builder.warnings,
  };
}

// Re-exports from value-converters
export {
  convertValue,
  convertLiteral,
  convertSelector,
  convertReference,
  convertPropertyPath,
  convertExpression,
} from './value-converters';

// Re-exports from command-mappers
export {
  getCommandMapper,
  registerCommandMapper,
  getRegisteredMappers,
  type CommandMapper,
  type CommandMapperResult,
} from './command-mappers';
