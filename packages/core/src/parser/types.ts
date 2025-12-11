/**
 * Type definitions for hyperscript parser
 * Defines tokens, AST nodes, and parser interfaces
 */

// ============================================================================
// Token Types
// ============================================================================

export type TokenType =
  // Literals
  | 'STRING'
  | 'NUMBER'
  | 'BOOLEAN'
  | 'NULL'

  // Identifiers and Keywords
  | 'IDENTIFIER'
  | 'KEYWORD'

  // Operators
  | 'OPERATOR'
  | 'COMPARISON'
  | 'LOGICAL'
  | 'ASSIGNMENT'

  // Punctuation
  | 'LPAREN' // (
  | 'RPAREN' // )
  | 'LBRACKET' // [
  | 'RBRACKET' // ]
  | 'LBRACE' // {
  | 'RBRACE' // }
  | 'COMMA' // ,
  | 'DOT' // .
  | 'COLON' // :
  | 'SEMICOLON' // ;
  | 'APOSTROPHE' // '

  // Special
  | 'WHITESPACE'
  | 'NEWLINE'
  | 'EOF'
  | 'UNKNOWN';

export interface Token {
  type: TokenType;
  value: string;
  position: number;
  line: number;
  column: number;
}

// ============================================================================
// AST Node Types
// ============================================================================

export type ASTNodeType =
  // Expressions
  | 'Literal'
  | 'Identifier'
  | 'BinaryExpression'
  | 'UnaryExpression'
  | 'CallExpression'
  | 'MemberExpression'
  | 'ConditionalExpression'

  // Statements
  | 'ExpressionStatement'
  | 'BlockStatement'
  | 'EventStatement'
  | 'CommandStatement'

  // Hyperscript specific
  | 'EventHandler'
  | 'Command'
  | 'Selector'
  | 'PropertyAccess'
  | 'PossessiveExpression';

export interface BaseASTNode {
  type: ASTNodeType;
  position: {
    start: number;
    end: number;
    line: number;
    column: number;
  };
}

export interface LiteralNode extends BaseASTNode {
  type: 'Literal';
  value: string | number | boolean | null;
  raw: string;
}

export interface IdentifierNode extends BaseASTNode {
  type: 'Identifier';
  name: string;
}

export interface BinaryExpressionNode extends BaseASTNode {
  type: 'BinaryExpression';
  operator: string;
  left: ASTNode;
  right: ASTNode;
}

export interface UnaryExpressionNode extends BaseASTNode {
  type: 'UnaryExpression';
  operator: string;
  argument: ASTNode;
  prefix: boolean;
}

export interface CallExpressionNode extends BaseASTNode {
  type: 'CallExpression';
  callee: ASTNode;
  arguments: ASTNode[];
}

export interface MemberExpressionNode extends BaseASTNode {
  type: 'MemberExpression';
  object: ASTNode;
  property: ASTNode;
  computed: boolean;
}

export interface EventHandlerNode extends BaseASTNode {
  type: 'EventHandler';
  event: string;
  selector?: string;
  commands: CommandNode[];
}

export interface CommandNode extends BaseASTNode {
  type: 'Command';
  name: string;
  arguments: ASTNode[];
  target?: ASTNode;
}

export interface SelectorNode extends BaseASTNode {
  type: 'Selector';
  value: string;
}

export interface PossessiveExpressionNode extends BaseASTNode {
  type: 'PossessiveExpression';
  object: ASTNode;
  property: ASTNode;
}

export type ASTNode =
  | LiteralNode
  | IdentifierNode
  | BinaryExpressionNode
  | UnaryExpressionNode
  | CallExpressionNode
  | MemberExpressionNode
  | EventHandlerNode
  | CommandNode
  | SelectorNode
  | PossessiveExpressionNode;

// ============================================================================
// Parser Interface
// ============================================================================

export interface ParseResult {
  ast: ASTNode;
  tokens: Token[];
  errors: ParseError[];
}

export interface ParseError {
  name?: string;
  message: string;
  position: number;
  line: number;
  column: number;
  token?: Token;
}

/**
 * Minimal interface for keyword resolution.
 *
 * This interface allows the parser to accept locale-aware keyword providers
 * from @hyperfixi/i18n without creating a direct dependency.
 *
 * The i18n package's `KeywordProvider` implements this interface.
 *
 * @example
 * ```typescript
 * import { esKeywords } from '@hyperfixi/i18n/parser/es';
 * import { parse } from '@hyperfixi/core';
 *
 * parse('en clic alternar .active', { keywords: esKeywords });
 * ```
 */
export interface KeywordResolver {
  /**
   * Resolve a token to its canonical (English) keyword.
   * Returns undefined if the token is not a recognized keyword.
   */
  resolve(token: string): string | undefined;

  /**
   * Check if the token is a command in this locale.
   */
  isCommand(token: string): boolean;

  /**
   * Check if the token is a keyword (non-command) in this locale.
   */
  isKeyword(token: string): boolean;
}

/**
 * Interface for semantic analysis integration.
 * Mirrors the SemanticAnalyzer from @hyperfixi/semantic.
 */
export interface SemanticAnalyzerInterface {
  /**
   * Analyze input in the specified language.
   * @param input The input string to analyze
   * @param language ISO 639-1 language code
   * @returns Analysis result with confidence score
   */
  analyze(
    input: string,
    language: string
  ): {
    confidence: number;
    command?: {
      name: string;
      roles: ReadonlyMap<string, { type: string; value: string }>;
    };
    errors?: string[];
    tokensConsumed?: number;
  };

  /** Check if semantic parsing is available for a language */
  supportsLanguage(language: string): boolean;

  /** Get the list of supported languages */
  supportedLanguages(): string[];
}

export interface ParserOptions {
  includeWhitespace?: boolean;
  includeComments?: boolean;
  strict?: boolean;

  /**
   * Optional keyword resolver for multilingual parsing.
   *
   * When provided, the parser will resolve non-English keywords
   * to their canonical English equivalents before parsing.
   *
   * Use locale packs from @hyperfixi/i18n:
   * - `esKeywords` for Spanish
   * - `jaKeywords` for Japanese
   * - etc.
   *
   * @example
   * ```typescript
   * import { esKeywords } from '@hyperfixi/i18n/parser/es';
   * parse('en clic alternar .active', { keywords: esKeywords });
   * ```
   */
  keywords?: KeywordResolver;

  /**
   * Optional semantic analyzer for multilingual parsing.
   *
   * When provided, the parser can use semantic-first parsing with
   * confidence-based fallback to traditional keyword parsing.
   *
   * Use the semantic analyzer from @hyperfixi/semantic:
   *
   * @example
   * ```typescript
   * import { createSemanticAnalyzer } from '@hyperfixi/semantic';
   * parse('#button の .active を 切り替え', {
   *   semanticAnalyzer: createSemanticAnalyzer(),
   *   language: 'ja',
   * });
   * ```
   */
  semanticAnalyzer?: SemanticAnalyzerInterface;

  /**
   * Language code for semantic parsing (ISO 639-1).
   * Required when using semanticAnalyzer.
   * @example 'en', 'es', 'ja', 'ar'
   */
  language?: string;

  /**
   * Confidence threshold for semantic parsing (0-1).
   * If semantic analysis confidence is below this, fall back to traditional parsing.
   * @default 0.5
   */
  semanticConfidenceThreshold?: number;
}

// ============================================================================
// Hyperscript Keywords
// ============================================================================

export const HYPERSCRIPT_KEYWORDS = new Set([
  // Event keywords
  'on',
  'when',
  'trigger',
  'send',

  // Action keywords
  'put',
  'add',
  'remove',
  'toggle',
  'set',
  'get',
  'show',
  'hide',
  'take',
  'make',
  'call',
  'go',
  'fetch',
  'post',
  'delete',

  // Control flow
  'if',
  'else',
  'unless',
  'then',
  'wait',
  'repeat',
  'for',
  'while',
  'until',
  'continue',
  'break',

  // Logical operators
  'and',
  'or',
  'not',
  'is',
  'as',
  'in',
  'of',
  'match',
  'matches',
  'contains',
  'exists',
  'empty',

  // Positional
  'first',
  'last',
  'next',
  'previous',
  'closest',
  'from',
  'to',
  'into',
  'with',
  'within',

  // References
  'me',
  'my',
  'you',
  'your',
  'it',
  'its',
  'result',
  'window',
  'document',
  'event',
  'target',

  // Special
  'class',
  'classes',
  'attribute',
  'attributes',
  'style',
  'styles',
  'property',
  'properties',
  'value',
  'values',
  'text',
  'html',
  'data',

  // Time/Animation
  'over',
  'during',
  'with',
  'easing',
  'step',

  // Literals
  'true',
  'false',
  'null',
  'undefined',
]);

// ============================================================================
// Operator Precedence
// ============================================================================

export const OPERATOR_PRECEDENCE: Record<string, number> = {
  // Logical operators (lowest precedence)
  or: 1,
  and: 2,

  // Equality and comparison
  '==': 3,
  '!=': 3,
  '===': 3,
  '!==': 3,
  is: 3,
  matches: 3,
  contains: 3,
  in: 3,

  // Relational
  '<': 4,
  '>': 4,
  '<=': 4,
  '>=': 4,

  // Additive
  '+': 5,
  '-': 5,

  // Multiplicative
  '*': 6,
  '/': 6,
  mod: 6,
  '%': 6,

  // Exponentiation
  '^': 7,
  '**': 7,

  // Unary (highest precedence)
  not: 8,
  'unary-': 9,
  'unary+': 9,
};

export const RIGHT_ASSOCIATIVE = new Set(['^', '**', 'not', 'unary-', 'unary+']);
