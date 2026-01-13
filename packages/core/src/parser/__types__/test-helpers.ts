/**
 * Type-safe test helpers for parser testing
 * Provides properly typed interfaces for test assertions on AST nodes
 */

import type { CommandNode, ASTNode, Token } from '../types';
import type { ParserContext } from '../parser-types';

/**
 * Result from parsing a statement in tests
 */
export interface ParsedStatementResult {
  node: CommandNode;
  tokens: Token[];
  context?: ParserContext;
  metadata?: ParsingMetadata;
}

/**
 * Metadata about the parsing process
 */
export interface ParsingMetadata {
  duration?: number;
  warnings?: string[];
  [key: string]: unknown;
}

/**
 * Assertable AST node with guaranteed properties for testing
 */
export interface ASTNodeAssertable extends CommandNode {
  name: string;
  type: 'Command';
  children?: CommandNode[];
  arguments: ASTNode[];
  target?: ASTNode;
}

/**
 * Type guard to check if a node is a CommandNode
 */
export function isCommandNode(node: unknown): node is CommandNode {
  return (
    typeof node === 'object' &&
    node !== null &&
    'type' in node &&
    node.type === 'Command' &&
    'name' in node &&
    typeof (node as CommandNode).name === 'string'
  );
}

/**
 * Type guard to assert node is a CommandNode
 */
export function assertCommandNode(node: unknown): asserts node is CommandNode {
  if (!isCommandNode(node)) {
    throw new Error(`Expected CommandNode, got ${typeof node}`);
  }
}

/**
 * Type-safe property accessor for AST nodes in tests
 */
export function getNodeProperty<T = unknown>(node: unknown, property: string): T | undefined {
  if (typeof node === 'object' && node !== null && property in node) {
    return (node as Record<string, unknown>)[property] as T;
  }
  return undefined;
}

/**
 * Assert that a property exists on a node
 */
export function assertNodeHasProperty<T = unknown>(
  node: unknown,
  property: string
): asserts node is Record<string, T> {
  if (typeof node !== 'object' || node === null || !(property in node)) {
    throw new Error(`Expected node to have property '${property}'`);
  }
}
