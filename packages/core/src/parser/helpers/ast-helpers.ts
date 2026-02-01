/**
 * AST Helper Utilities
 *
 * This module provides utility functions for creating AST nodes.
 * All functions are pure - they take a Position object and node-specific
 * parameters, and return a complete AST node without side effects.
 *
 * @module parser/helpers/ast-helpers
 */

import type { ASTNode } from '../../types/core';
import type {
  Position,
  IdentifierNode,
  LiteralNode,
  BinaryExpressionNode,
  UnaryExpressionNode,
  CallExpressionNode,
  MemberExpressionNode,
  SelectorNode,
  PossessiveExpressionNode,
  BlockNode,
  StringLiteralNode,
  ObjectLiteralNode,
  ArrayLiteralNode,
  PropertyOfExpressionNode,
  CommandSequenceNode,
  ProgramNode,
} from '../parser-types';
import { debug } from '../../utils/debug';

/**
 * AST Node Creation Functions
 */

/**
 * Create a literal node
 *
 * @param value - The literal value
 * @param raw - The raw source text
 * @param pos - Position information
 * @returns LiteralNode
 */
export function createLiteral(value: unknown, raw: string, pos: Position): LiteralNode {
  return {
    type: 'literal',
    value,
    raw,
    start: pos.start,
    end: pos.end,
    line: pos.line,
    column: pos.column,
  };
}

/**
 * Create an identifier node
 *
 * @param name - The identifier name
 * @param pos - Position information
 * @returns IdentifierNode
 */
export function createIdentifier(name: string, pos: Position): IdentifierNode {
  return {
    type: 'identifier',
    name,
    start: pos.start,
    end: pos.end,
    line: pos.line,
    column: pos.column,
  };
}

/**
 * Create a binary expression node
 *
 * @param operator - The operator (e.g., '+', '-', '==', 'and')
 * @param left - Left operand
 * @param right - Right operand
 * @param pos - Position information
 * @returns BinaryExpressionNode
 */
export function createBinaryExpression(
  operator: string,
  left: ASTNode,
  right: ASTNode,
  pos: Position
): BinaryExpressionNode {
  return {
    type: 'binaryExpression',
    operator,
    left,
    right,
    start: pos.start,
    end: pos.end,
    line: pos.line,
    column: pos.column,
  };
}

/**
 * Create a unary expression node
 *
 * @param operator - The operator (e.g., '-', 'not')
 * @param argument - The operand
 * @param prefix - Whether operator is prefix (true) or postfix (false)
 * @param pos - Position information
 * @returns UnaryExpressionNode
 */
export function createUnaryExpression(
  operator: string,
  argument: ASTNode,
  prefix: boolean,
  pos: Position
): UnaryExpressionNode {
  return {
    type: 'unaryExpression',
    operator,
    argument,
    prefix,
    start: pos.start,
    end: pos.end,
    line: pos.line,
    column: pos.column,
  };
}

/**
 * Create a call expression node
 *
 * @param callee - The function being called
 * @param args - Array of argument nodes
 * @param pos - Position information
 * @returns CallExpressionNode
 */
export function createCallExpression(
  callee: ASTNode,
  args: ASTNode[],
  pos: Position
): CallExpressionNode {
  return {
    type: 'callExpression',
    callee,
    arguments: args,
    start: pos.start,
    end: pos.end,
    line: pos.line,
    column: pos.column,
  };
}

/**
 * Create a member expression node
 *
 * @param object - The object being accessed
 * @param property - The property being accessed
 * @param computed - Whether access is computed (bracket notation)
 * @param pos - Position information
 * @returns MemberExpressionNode
 */
export function createMemberExpression(
  object: ASTNode,
  property: ASTNode,
  computed: boolean,
  pos: Position
): MemberExpressionNode {
  return {
    type: 'memberExpression',
    object,
    property,
    computed,
    start: pos.start,
    end: pos.end,
    line: pos.line,
    column: pos.column,
  };
}

/**
 * Create a selector node (CSS selector)
 *
 * @param value - The selector string
 * @param pos - Position information
 * @returns SelectorNode
 */
export function createSelector(value: string, pos: Position): SelectorNode {
  return {
    type: 'selector',
    value,
    start: pos.start,
    end: pos.end,
    line: pos.line,
    column: pos.column,
  };
}

/**
 * Create a possessive expression node
 *
 * @param object - The object (e.g., 'element')
 * @param property - The property (e.g., 'className')
 * @param pos - Position information
 * @returns PossessiveExpressionNode
 */
export function createPossessiveExpression(
  object: ASTNode,
  property: ASTNode,
  pos: Position
): PossessiveExpressionNode {
  return {
    type: 'possessiveExpression',
    object,
    property,
    start: pos.start,
    end: pos.end,
    line: pos.line,
    column: pos.column,
  };
}

/**
 * Create a block node containing a list of commands
 *
 * Used by control flow (if/else, repeat, for) to wrap command bodies.
 *
 * @param commands - Array of command nodes
 * @param pos - Position information
 * @returns BlockNode
 */
export function createBlock(commands: ASTNode[], pos: Position): BlockNode {
  return {
    type: 'block',
    commands,
    start: pos.start,
    end: pos.end,
    line: pos.line,
    column: pos.column,
  };
}

/**
 * Create a string literal node (raw string value for loop variables, event names)
 *
 * Distinct from createLiteral which produces type: 'literal' with a raw field.
 * This produces type: 'string' used by repeat/for loop variables and event names.
 *
 * @param value - The string value
 * @param pos - Position information
 * @returns StringLiteralNode
 */
export function createStringLiteral(value: string, pos: Position): StringLiteralNode {
  return {
    type: 'string',
    value,
    start: pos.start,
    end: pos.end,
    line: pos.line,
    column: pos.column,
  };
}

/**
 * Create an object literal node
 *
 * @param properties - Array of key-value pairs
 * @param pos - Position information
 * @returns ObjectLiteralNode
 */
export function createObjectLiteral(
  properties: Array<{ key: ASTNode; value: ASTNode }>,
  pos: Position
): ObjectLiteralNode {
  return {
    type: 'objectLiteral',
    properties,
    start: pos.start,
    end: pos.end,
    line: pos.line,
    column: pos.column,
  };
}

/**
 * Create an array literal node
 *
 * @param elements - Array of element nodes
 * @param pos - Position information
 * @returns ArrayLiteralNode
 */
export function createArrayLiteral(elements: ASTNode[], pos: Position): ArrayLiteralNode {
  return {
    type: 'arrayLiteral',
    elements,
    start: pos.start,
    end: pos.end,
    line: pos.line,
    column: pos.column,
  };
}

/**
 * Create a "the X of Y" property-of-expression node
 *
 * @param property - The property being accessed
 * @param target - The target element
 * @param pos - Position information
 * @returns PropertyOfExpressionNode
 */
export function createPropertyOfExpression(
  property: ASTNode,
  target: ASTNode,
  pos: Position
): PropertyOfExpressionNode {
  return {
    type: 'propertyOfExpression',
    property,
    target,
    start: pos.start,
    end: pos.end,
    line: pos.line,
    column: pos.column,
  };
}

/**
 * Create a command sequence node wrapping multiple chained commands
 *
 * @param commands - Array of command nodes
 * @returns CommandSequenceNode
 */
export function createCommandSequence(commands: ASTNode[]): CommandSequenceNode {
  return {
    type: 'CommandSequence',
    commands,
    start: commands[0]?.start || 0,
    end: commands[commands.length - 1]?.end || 0,
    line: commands[0]?.line || 1,
    column: commands[0]?.column || 1,
  };
}

/**
 * Create an error node
 *
 * This is a special identifier node used to represent parse errors
 * without stopping the parse process.
 *
 * @param pos - Position information
 * @returns IdentifierNode with special __ERROR__ name
 */
export function createErrorNode(pos: Position): IdentifierNode {
  return {
    type: 'identifier',
    name: '__ERROR__',
    start: pos.start,
    end: pos.end,
    line: pos.line,
    column: pos.column,
  };
}

/**
 * Create a Program node that contains multiple top-level statements
 *
 * @param statements - Array of statement nodes
 * @returns Program node or single statement if only one, error node if none
 */
export function createProgramNode(statements: ASTNode[]): ASTNode {
  debug.parse(`✅ createProgramNode: Called with ${statements.length} statements`);

  if (statements.length === 0) {
    debug.parse(`✅ createProgramNode: Returning error node (0 statements)`);
    return {
      type: 'identifier',
      name: '__ERROR__',
      start: 0,
      end: 0,
      line: 1,
      column: 1,
    };
  }

  if (statements.length === 1) {
    debug.parse(`✅ createProgramNode: Returning single statement (type=${statements[0].type})`);
    return statements[0];
  }

  const programNode: ProgramNode = {
    type: 'Program',
    statements,
    start: statements[0]?.start || 0,
    end: statements[statements.length - 1]?.end || 0,
    line: statements[0]?.line || 1,
    column: statements[0]?.column || 1,
  };

  debug.parse(
    `✅ createProgramNode: Returning Program node with ${statements.length} statements, type=${programNode.type}`
  );
  return programNode;
}
