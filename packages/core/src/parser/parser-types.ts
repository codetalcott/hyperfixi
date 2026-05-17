/**
 * Parser Type Definitions
 *
 * Type definitions for the modular parser system, including the ParserContext
 * interface that command parsers use to access parser state and utilities.
 *
 * @module parser/parser-types
 */

import type { Token, ASTNode, CommandNode } from '../types/core';

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
 * BlockNode - AST node representing a block of commands (then/else bodies, loop bodies)
 */
export interface BlockNode extends ASTNode {
  type: 'block';
  commands: ASTNode[];
}

/**
 * StringLiteralNode - AST node representing a raw string value (loop variables, event names)
 * Distinct from LiteralNode which has type: 'literal' and a raw field.
 */
export interface StringLiteralNode extends ASTNode {
  type: 'string';
  value: string;
}

/**
 * ObjectLiteralNode - AST node representing an object literal
 */
export interface ObjectLiteralNode extends ASTNode {
  type: 'objectLiteral';
  properties: Array<{
    key: ASTNode;
    value: ASTNode;
  }>;
}

/**
 * ArrayLiteralNode - AST node representing an array literal
 */
export interface ArrayLiteralNode extends ASTNode {
  type: 'arrayLiteral';
  elements: ASTNode[];
}

/**
 * PropertyOfExpressionNode - AST node for "the X of Y" syntax
 */
export interface PropertyOfExpressionNode extends ASTNode {
  type: 'propertyOfExpression';
  property: ASTNode;
  target: ASTNode;
}

/**
 * CommandSequenceNode - AST node wrapping multiple chained commands
 */
export interface CommandSequenceNode extends ASTNode {
  type: 'CommandSequence';
  commands: ASTNode[];
}

/**
 * ProgramNode - AST node containing multiple top-level statements
 */
export interface ProgramNode extends ASTNode {
  type: 'Program';
  statements: ASTNode[];
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

// ============================================================================
// Focused Sub-Interfaces
//
// ParserContext is composed of focused sub-interfaces. Command parsers can
// import the specific sub-interface they need for better dependency
// visibility and simpler test mocks. ParserContext extends all of them.
// ============================================================================

/**
 * TokenStream — core token navigation.
 * Used by virtually every command parser.
 */
export interface TokenStream {
  /** Array of tokens being parsed */
  readonly tokens: Token[];

  /** Current position in token stream (synced with parser via getter/setter) */
  current: number;

  /** Consume and return current token, advancing position */
  advance(): Token;

  /** Look at current token without consuming */
  peek(): Token;

  /** Get previously consumed token */
  previous(): Token;

  /** Consume expected token or add error */
  consume(expected: string, message: string): Token;

  /** Check if current token value matches */
  check(value: string): boolean;

  /** Match and consume if current token matches any given values */
  match(...types: string[]): boolean;

  /** Match and consume if current token is operator with given value */
  matchOperator(operator: string): boolean;

  /** Check if at end of token stream */
  isAtEnd(): boolean;

  /** Peek at token relative to current position (0 = current, 1 = next) */
  peekAt(offset: number): Token | null;
}

/**
 * TokenPredicates — semantic token classification.
 * Higher-level checks based on token kind.
 */
export interface TokenPredicates {
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
}

/**
 * ASTFactory — AST node creation exposed to command parsers.
 *
 * Only methods called externally via `ParserContext` are declared here.
 * Other node-builder helpers (literal, binary/unary, member, possessive,
 * call, error, program, selector, commandFromIdentifier) remain `private`
 * on the `Parser` class because they're only called by `Parser` itself.
 */
export interface ASTFactory {
  /** Create identifier AST node */
  createIdentifier(name: string): IdentifierNode;
}

/**
 * ExpressionParser — expression parsing methods exposed to command parsers.
 *
 * `parseExpression` is the primary entry point (Pratt-based). `parsePrimary`
 * is exposed for parsers that need to consume a single atom. `parseLogicalAnd`
 * is exposed for `parseIfCommand`'s condition-token loop, which collects
 * atoms one-by-one and must stop at `or`. `parseCSSObjectLiteral` is exposed
 * for the one place that opens a `{` after a CSS property.
 *
 * All other internal parsing methods (parseCall, the legacy precedence chain,
 * parseEventHandler, parseBehaviorDefinition, etc.) remain `private` on the
 * `Parser` class.
 */
export interface ExpressionParser {
  /** Parse a complete expression */
  parseExpression(): ASTNode;

  /** Parse a primary expression */
  parsePrimary(): ASTNode;

  /** Parse a logical AND expression (stops at `or`) */
  parseLogicalAnd(): ASTNode;

  /** Parse CSS object literal */
  parseCSSObjectLiteral(): ASTNode;
}

/**
 * CommandParser — command and command sequence parsing.
 */
export interface CommandParser {
  /** Parse a single command */
  parseCommand(): CommandNode;

  /** Parse a command sequence */
  parseCommandSequence(): ASTNode;

  /** Parse command list until 'end' keyword */
  parseCommandListUntilEnd(): ASTNode[];

  /**
   * Parse command list until 'end' OR 'else' keyword. Consumes `end` if
   * there is no else branch; leaves `else` for the caller to consume.
   * Returns the parsed commands and a flag indicating whether `else` was
   * hit (so callers can decide whether to parse an else branch).
   * Used by `repeat ... else ... end`.
   */
  parseCommandListUntilEndOrElse(): { commands: ASTNode[]; hasElse: boolean };

  /**
   * Parse a `repeat` body that may terminate on any of `end`, `else`,
   * `until`, or `while`. Consumes `end` itself; for other terminators, the
   * caller advances past the keyword and handles the trailing piece.
   * Used by `parseRepeatCommand` to support bottom-tested loops
   * (`repeat <body> until/while <expr> end`) alongside the regular and
   * else-branch forms.
   *
   * @returns commands + terminator: `'end'`, `'else'`, `'until'`, or `'while'`
   */
  parseRepeatBody(): { commands: ASTNode[]; terminator: string };
}

/**
 * PositionCheckpoint — position save/restore for lookahead and backtracking.
 */
export interface PositionCheckpoint {
  /** Save current position for later restoration (returns opaque position handle) */
  savePosition(): number;

  /** Restore to a previously saved position */
  restorePosition(pos: number): void;

  /** Get current position for AST node */
  getPosition(): Position;
}

/**
 * ParserErrorHandler — error and warning reporting.
 */
export interface ParserErrorHandler {
  /** Add parse error */
  addError(message: string): void;

  /** Add parse warning */
  addWarning(warning: string): void;
}

/**
 * ParserUtilities — lookup and resolution functions.
 */
export interface ParserUtilities {
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

  /**
   * Get a slice of the original input string by character position.
   * Useful for extracting raw code that shouldn't be tokenized (e.g., JavaScript in js...end blocks).
   *
   * @param start - Start character position (inclusive)
   * @param end - End character position (exclusive), or undefined for rest of input
   * @returns The raw input substring, or empty string if positions are invalid
   */
  getInputSlice(start: number, end?: number): string;
}

/**
 * ParserContext - Shared context for command parsers
 *
 * Composition of all focused sub-interfaces. Command parsers can use the full
 * ParserContext (backward-compatible) or import specific sub-interfaces for
 * better dependency visibility and simpler test mocks.
 *
 * Sub-interfaces: TokenStream, TokenPredicates, ASTFactory, ExpressionParser,
 * CommandParser, PositionCheckpoint, ParserErrorHandler, ParserUtilities
 */
export interface ParserContext
  extends
    TokenStream,
    TokenPredicates,
    ASTFactory,
    ExpressionParser,
    CommandParser,
    PositionCheckpoint,
    ParserErrorHandler,
    ParserUtilities {}

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
