/**
 * Parser Type Definitions
 *
 * Type definitions for the modular parser system, including the ParserContext
 * interface that command parsers use to access parser state and utilities.
 *
 * @module parser/parser-types
 */

import type { Token, ASTNode, CommandNode } from '../types/core';
import { TokenType } from './tokenizer';

/**
 * Position information for AST nodes
 */
export interface Position {
  start: number;
  end: number;
  line: number;
  column: number;
}

/**
 * AST Node Type Definitions
 * These are parser-internal types used during parsing
 */

/**
 * IdentifierNode - AST node representing an identifier
 */
export interface IdentifierNode extends ASTNode {
  type: 'identifier';
  name: string;
  scope?: 'local' | 'global'; // For :local and ::global variables
}

/**
 * LiteralNode - AST node representing a literal value
 */
export interface LiteralNode extends ASTNode {
  type: 'literal';
  value: unknown;
  raw: string;
}

/**
 * BinaryExpressionNode - AST node representing a binary operation
 */
export interface BinaryExpressionNode extends ASTNode {
  type: 'binaryExpression';
  operator: string;
  left: ASTNode;
  right: ASTNode;
}

/**
 * UnaryExpressionNode - AST node representing a unary operation
 */
export interface UnaryExpressionNode extends ASTNode {
  type: 'unaryExpression';
  operator: string;
  argument: ASTNode;
  prefix: boolean;
}

/**
 * CallExpressionNode - AST node representing a function call
 */
export interface CallExpressionNode extends ASTNode {
  type: 'callExpression';
  callee: ASTNode;
  arguments: ASTNode[];
}

/**
 * MemberExpressionNode - AST node representing member access
 */
export interface MemberExpressionNode extends ASTNode {
  type: 'memberExpression';
  object: ASTNode;
  property: ASTNode;
  computed: boolean;
}

/**
 * SelectorNode - AST node representing a CSS selector
 */
export interface SelectorNode extends ASTNode {
  type: 'selector';
  value: string;
}

/**
 * PossessiveExpressionNode - AST node representing possessive syntax (e.g., "element's className")
 */
export interface PossessiveExpressionNode extends ASTNode {
  type: 'possessiveExpression';
  object: ASTNode;
  property: ASTNode;
}

/**
 * MultiWordPattern - Defines structure for multi-word commands
 *
 * Example: "fetch URL as json" has keywords ["as"]
 */
export interface MultiWordPattern {
  /** Command name (e.g., "fetch") */
  command: string;

  /** Keywords that can appear as modifiers (e.g., ["as", "with"]) */
  keywords: string[];

  /** Optional: Minimum number of arguments required */
  minArgs?: number;

  /** Optional: Maximum number of arguments allowed */
  maxArgs?: number;
}

/**
 * ParserContext - Shared context for command parsers
 *
 * This interface provides command parsers with controlled access to parser
 * state and utilities without exposing Parser class internals.
 *
 * Command parsers receive this context and use it to:
 * - Navigate the token stream
 * - Create AST nodes
 * - Parse expressions
 * - Track positions
 * - Report errors
 */
export interface ParserContext {
  // ==========================================
  // Token Stream Access (Read-Only)
  // ==========================================

  /** Array of tokens being parsed */
  readonly tokens: Token[];

  /** Current position in token stream (synced with parser via getter/setter) */
  current: number;

  // ==========================================
  // Token Navigation Methods
  // ==========================================

  /** Consume and return current token, advancing position */
  advance(): Token;

  /** Look at current token without consuming */
  peek(): Token;

  /** Get previously consumed token */
  previous(): Token;

  /** Consume expected token or add error */
  consume(expected: string | TokenType, message: string): Token;

  /** Check if current token value matches */
  check(value: string): boolean;

  /** Check if current token type matches */
  checkTokenType(type: TokenType): boolean;

  // ==========================================
  // Predicate-Based Token Checking (Phase 4)
  // These methods use token predicates for semantic classification,
  // enabling migration from TokenType enum checks to predicate functions.
  // ==========================================

  /** Check if current token is identifier-like (IDENTIFIER, CONTEXT_VAR, KEYWORD, COMMAND, EVENT) */
  checkIdentifierLike(): boolean;

  /** Check if current token is a basic CSS selector (ID, class, or CSS selector, excluding query reference) */
  checkSelector(): boolean;

  /** Check if current token is any selector including query reference */
  checkAnySelector(): boolean;

  /** Check if current token is a literal (STRING, NUMBER, BOOLEAN, TEMPLATE_LITERAL) */
  checkLiteral(): boolean;

  /** Check if current token is a reference (CONTEXT_VAR, GLOBAL_VAR, IDENTIFIER) */
  checkReference(): boolean;

  /** Check if current token is a time expression */
  checkTimeExpression(): boolean;

  /** Check if current token is a DOM event */
  checkEvent(): boolean;

  /** Check if current token is a command token or command identifier */
  checkIsCommand(): boolean;

  /** Check if current token is a context variable */
  checkContextVar(): boolean;

  /** Match and consume if current token matches any given types */
  match(...types: Array<string | TokenType>): boolean;

  /** Match and consume if current token matches given type */
  matchTokenType(type: TokenType): boolean;

  /** Match and consume if current token is operator with given value */
  matchOperator(operator: string): boolean;

  /** Check if at end of token stream */
  isAtEnd(): boolean;

  // ==========================================
  // AST Node Creation
  // ==========================================

  /** Create identifier AST node */
  createIdentifier(name: string): IdentifierNode;

  /** Create literal AST node */
  createLiteral(value: unknown, raw: string): ASTNode;

  /** Create selector AST node */
  createSelector(value: string): ASTNode;

  /** Create binary expression AST node */
  createBinaryExpression(left: ASTNode, operator: string, right: ASTNode): ASTNode;

  /** Create unary expression AST node */
  createUnaryExpression(operator: string, operand: ASTNode, prefix?: boolean): ASTNode;

  /** Create member expression AST node */
  createMemberExpression(object: ASTNode, property: ASTNode, computed: boolean): ASTNode;

  /** Create possessive expression AST node */
  createPossessiveExpression(object: ASTNode, property: ASTNode): ASTNode;

  /** Create call expression AST node */
  createCallExpression(callee: ASTNode, args: ASTNode[]): ASTNode;

  /** Create error node for recovery */
  createErrorNode(): ASTNode;

  /** Create program node */
  createProgramNode(statements: ASTNode[]): ASTNode;

  /** Create command node from identifier */
  createCommandFromIdentifier(identifierNode: IdentifierNode): CommandNode;

  // ==========================================
  // Expression Parsing
  // ==========================================

  /** Parse a complete expression */
  parseExpression(): ASTNode;

  /** Parse a primary expression */
  parsePrimary(): ASTNode;

  /** Parse a call expression */
  parseCall(): ASTNode;

  /** Parse an assignment expression */
  parseAssignment(): ASTNode;

  /** Parse a logical OR expression */
  parseLogicalOr(): ASTNode;

  /** Parse a logical AND expression */
  parseLogicalAnd(): ASTNode;

  /** Parse an equality expression */
  parseEquality(): ASTNode;

  /** Parse a comparison expression */
  parseComparison(): ASTNode;

  /** Parse an addition/subtraction expression */
  parseAddition(): ASTNode;

  /** Parse a multiplication/division expression */
  parseMultiplication(): ASTNode;

  /** Parse an implicit binary expression */
  parseImplicitBinary(): ASTNode;

  /** Parse a conditional expression */
  parseConditional(): ASTNode;

  /** Parse a conditional branch */
  parseConditionalBranch(): ASTNode;

  /** Parse an event handler */
  parseEventHandler(): ASTNode;

  /** Parse a behavior definition */
  parseBehaviorDefinition(): ASTNode;

  /** Parse a navigation function */
  parseNavigationFunction(): ASTNode;

  /** Parse "my" property access */
  parseMyPropertyAccess(): ASTNode;

  /** Parse $ dollar expression */
  parseDollarExpression(): ASTNode;

  /** Parse hyperscript selector */
  parseHyperscriptSelector(): ASTNode;

  /** Parse attribute or array literal */
  parseAttributeOrArrayLiteral(): ASTNode;

  /** Parse object literal */
  parseObjectLiteral(): ASTNode;

  /** Parse CSS object literal */
  parseCSSObjectLiteral(): ASTNode;

  // ==========================================
  // Command Sequence Parsing
  // ==========================================

  /** Parse a single command */
  parseCommand(): CommandNode;

  /** Parse a command sequence */
  parseCommandSequence(): ASTNode;

  /** Parse command list until 'end' keyword */
  parseCommandListUntilEnd(): ASTNode[];

  // ==========================================
  // Position Tracking
  // ==========================================

  /** Get current position for AST node */
  getPosition(): Position;

  // ==========================================
  // Error Handling
  // ==========================================

  /** Add parse error */
  addError(message: string): void;

  /** Add parse warning */
  addWarning(warning: string): void;

  // ==========================================
  // Utility Functions
  // ==========================================

  /** Check if identifier is a command */
  isCommand(name: string): boolean;

  /** Check if command is a compound command */
  isCompoundCommand(name: string): boolean;

  /** Check if identifier is a keyword */
  isKeyword(name: string): boolean;

  /** Get multi-word pattern for command */
  getMultiWordPattern(commandName: string): MultiWordPattern | null;

  /**
   * Resolve a keyword to its canonical English form.
   *
   * This enables multilingual parsing by resolving locale-specific
   * keywords to their English equivalents:
   * - Spanish 'alternar' → 'toggle'
   * - Japanese '切り替え' → 'toggle'
   *
   * If no keyword resolver is configured, returns the original value.
   */
  resolveKeyword(value: string): string;
}

/**
 * CommandParserFunction - Standard signature for command parsers
 *
 * @param token - The command token that triggered this parser
 * @param context - Shared parser context with state and utilities
 * @returns Parsed command AST node
 */
export type CommandParserFunction = (token: Token, context: ParserContext) => CommandNode;

/**
 * CompoundCommandParserFunction - Signature for compound command parsers
 *
 * Compound commands have already been identified and converted to IdentifierNode
 *
 * @param identifierNode - The identifier node for this command
 * @param context - Shared parser context
 * @returns Parsed command node, or null if parsing failed
 */
export type CompoundCommandParserFunction = (
  identifierNode: IdentifierNode,
  context: ParserContext
) => CommandNode | null;

/**
 * TokenNavigationFunction - Helper function signature for token navigation
 */
export type TokenNavigationFunction = (context: ParserContext) => Token | boolean;

/**
 * ASTNodeCreatorFunction - Helper function signature for AST node creation
 */
export type ASTNodeCreatorFunction = (...args: any[]) => ASTNode;

/**
 * ExpressionParserFunction - Helper function signature for expression parsing
 */
export type ExpressionParserFunction = (context: ParserContext) => ASTNode;

/**
 * ParseResult - Result of parsing operation
 */
export interface ParseResult {
  /** Whether parsing succeeded */
  success: boolean;

  /** Parsed AST node (if successful) */
  node?: ASTNode;

  /** Parse error (if failed) */
  error?: {
    name: string;
    message: string;
    line?: number;
    column?: number;
    position?: number;
  };

  /** Parse warnings (non-fatal) */
  warnings?: string[];
}
