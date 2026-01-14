/**
 * Hyperscript Parser
 * Converts tokens into Abstract Syntax Tree (AST)
 * Handles hyperscript's unique natural language syntax
 */

// Phase 8: TokenType removed - parser now uses predicates exclusively
import { tokenize } from './tokenizer';
import type {
  Token,
  ASTNode,
  CommandNode,
  ExpressionNode,
  ParseResult as CoreParseResult,
  ParseWarning,
  EventHandlerNode,
  BehaviorNode,
  DefNode,
} from '../types/core';
import type { ParseError as LocalParseError, KeywordResolver, ParserOptions } from './types';
import type { SemanticAnalyzer } from './semantic-integration';
import { debug } from '../utils/debug';
// Note: isDebugEnabled is used in semantic-integration.ts for debug event emission
import { SemanticIntegrationAdapter, DEFAULT_CONFIDENCE_THRESHOLD } from './semantic-integration';

// Phase 1 Refactoring: Import new helper modules
import {
  COMMANDS,
  COMPOUND_COMMANDS,
  HYPERSCRIPT_KEYWORDS,
  CommandClassification,
  PUT_OPERATIONS,
  PUT_OPERATION_KEYWORDS,
  KEYWORDS,
} from './parser-constants';

// Phase 4: Import token predicates for decoupled classification
import {
  isCommand as isCommandPredicate,
  isKeyword as isKeywordPredicate,
  isSelector,
  isBasicSelector,
  isLiteral,
  isIdentifierLike,
  isOperator,
  isReference,
  isContextVar,
  isEvent,
  isCommandTerminator,
  hasValue,
  hasValueIn,
  // Phase 7: Specific type predicates for full TokenType removal
  isIdentifier,
  isString,
  isNumber,
  isBoolean,
  isTemplateLiteral,
  isQueryReference,
  isIdSelector,
  isClassSelector,
  isCssSelector,
  isTimeExpression,
  isComment,
  isSymbol,
  isGlobalVar,
  isBasicOperator,
  isComparisonOperator,
} from './token-predicates';
import { CommandNodeBuilder } from './command-node-builder';
import { TokenConsumer } from './token-consumer';

// Phase 9-2: Import helper modules and types
import type {
  // ParserContext, Position - Will be used in Phase 9-3 for command extraction
  IdentifierNode,
  LiteralNode,
  BinaryExpressionNode,
  UnaryExpressionNode,
  CallExpressionNode,
  MemberExpressionNode,
  SelectorNode,
  PossessiveExpressionNode,
} from './parser-types';
// import * as tokenHelpers from './helpers/token-helpers'; // Will be used in Phase 9-3
import * as astHelpers from './helpers/ast-helpers';
import * as parsingHelpers from './helpers/parsing-helpers';

// Phase 9-3a: Import command parser modules
import * as eventCommands from './command-parsers/event-commands';
import * as controlFlowCommands from './command-parsers/control-flow-commands';
import * as animationCommands from './command-parsers/animation-commands';
import * as domCommands from './command-parsers/dom-commands';
import * as asyncCommands from './command-parsers/async-commands';
import * as utilityCommands from './command-parsers/utility-commands';
import * as variableCommands from './command-parsers/variable-commands';

// Use core types for consistency
export type ParseResult = CoreParseResult;
// Re-export ParseError from ./types
export type { ParseError } from './types';

// AST node types are now imported from parser-types.ts (Phase 9-2)
// Multi-word patterns are now imported from parsing-helpers.ts (Phase 9-2 Day 6)

export class Parser {
  private tokens: Token[];
  private current: number = 0;
  private error: LocalParseError | undefined;
  private warnings: ParseWarning[] = [];
  private keywordResolver?: KeywordResolver;
  private semanticAdapter?: SemanticIntegrationAdapter;
  private originalInput?: string;

  // Postfix unary operators that do NOT take a right operand
  private static readonly POSTFIX_UNARY_OPERATORS = new Set([
    'exists',
    'does not exist',
    'is empty',
    'is not empty',
  ]);

  constructor(tokens: Token[], options?: ParserOptions, originalInput?: string) {
    this.tokens = tokens;
    this.keywordResolver = options?.keywords;

    // Initialize semantic integration if analyzer provided
    if (options?.semanticAnalyzer && options?.language) {
      this.semanticAdapter = new SemanticIntegrationAdapter({
        analyzer: options.semanticAnalyzer as SemanticAnalyzer,
        language: options.language,
        confidenceThreshold: options.semanticConfidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD,
      });
    }

    // Store original input for commands that need raw code (js...end, etc.)
    // Also used for semantic analysis if adapter is present
    // Fallback to reconstructing from tokens if not provided
    this.originalInput = originalInput || tokens.map(t => t.value).join(' ');
  }

  /**
   * Resolve a token value to its canonical English keyword.
   * If no keyword resolver is set, returns the original value.
   *
   * This enables multilingual parsing:
   * - Spanish 'en' → 'on'
   * - Spanish 'alternar' → 'toggle'
   * - Japanese 'クリック' → 'click'
   */
  private resolveKeyword(value: string): string {
    if (!this.keywordResolver) {
      return value;
    }
    return this.keywordResolver.resolve(value) ?? value;
  }

  /**
   * Add a warning to the parser output
   */
  private addWarning(warning: ParseWarning): void {
    this.warnings.push(warning);
  }

  parse(): ParseResult {
    try {
      // Handle empty input
      if (this.tokens.length === 0) {
        this.addError('Cannot parse empty input');
        return {
          success: false,
          node: this.createErrorNode(),
          tokens: this.tokens,
          error: this.error!,
          warnings: this.warnings,
        };
      }

      // Check if this is a behavior definition (may have multiple)
      if (this.check('behavior')) {
        const behaviors: ASTNode[] = [];

        while (this.check('behavior')) {
          this.advance(); // consume 'behavior' keyword
          const behaviorNode = this.parseBehaviorDefinition();
          if (behaviorNode) {
            behaviors.push(behaviorNode);
          }
          if (this.error) {
            break;
          }
        }

        if (this.error) {
          return {
            success: false,
            node: behaviors.length === 1 ? behaviors[0] : this.createProgramNode(behaviors),
            tokens: this.tokens,
            error: this.error,
            warnings: this.warnings,
          };
        }

        // Return single behavior directly, or program node for multiple
        return {
          success: true,
          node: behaviors.length === 1 ? behaviors[0] : this.createProgramNode(behaviors),
          tokens: this.tokens,
          warnings: this.warnings,
        };
      }

      // Check if this starts with init, on, def, or a comment (top-level features)
      if (this.check('init') || this.check('on') || this.check('def') || this.checkComment()) {
        const statements: ASTNode[] = [];

        // Parse all top-level features (init blocks, event handlers, function defs), skipping comments
        while (!this.isAtEnd()) {
          // Skip any top-level comments
          if (this.checkComment()) {
            this.advance();
            continue;
          }

          // Check for init, on, or def
          if (this.check('init')) {
            this.advance(); // consume 'init'
            const initBlock = this.parseTopLevelInitBlock();
            if (initBlock) {
              statements.push(initBlock);
            }
          } else if (this.check('on')) {
            this.advance(); // consume 'on'
            const eventHandler = this.parseEventHandler();
            if (eventHandler) {
              statements.push(eventHandler);
            }
          } else if (this.check('def')) {
            this.advance(); // consume 'def'
            const defFeature = this.parseDefFeature();
            if (defFeature) {
              statements.push(defFeature);
            }
          } else {
            // Not a feature we recognize, break out
            break;
          }
        }

        // Check for unexpected tokens
        if (!this.isAtEnd()) {
          this.addError(`Unexpected token: ${this.peek().value}`);
          return {
            success: false,
            node: this.createProgramNode(statements),
            tokens: this.tokens,
            error: this.error!,
            warnings: this.warnings,
          };
        }

        if (this.error) {
          return {
            success: false,
            node: this.createProgramNode(statements),
            tokens: this.tokens,
            error: this.error,
            warnings: this.warnings,
          };
        }

        return {
          success: true,
          node: this.createProgramNode(statements),
          tokens: this.tokens,
          warnings: this.warnings,
        };
      }

      // Check if this looks like a command sequence (starts with command)
      if (
        this.checkIsCommand() ||
        (this.isCommand(this.peek().value) && !this.isKeyword(this.peek().value))
      ) {
        const commandSequence = this.parseCommandSequence();
        if (commandSequence) {
          // Check if there are event handlers after the command sequence
          if (!this.isAtEnd() && this.check('on')) {
            debug.parse(
              '✅ PARSER: Found event handlers after command sequence, parsing as program'
            );
            const statements: ASTNode[] = [commandSequence];
            debug.parse(
              `✅ PARSER: Starting with ${statements.length} statement(s) from command sequence`
            );

            // Parse all event handlers
            let eventHandlerCount = 0;
            while (!this.isAtEnd() && this.check('on')) {
              debug.parse(
                `✅ PARSER: Parsing event handler #${eventHandlerCount + 1}, current token: ${this.peek().value}`
              );
              this.advance(); // consume 'on'
              const eventHandler = this.parseEventHandler();
              debug.parse(
                `✅ PARSER: parseEventHandler returned:`,
                eventHandler
                  ? `type=${eventHandler.type}, event=${(eventHandler as any).event}`
                  : 'null'
              );
              if (eventHandler) {
                statements.push(eventHandler);
                eventHandlerCount++;
                debug.parse(
                  `✅ PARSER: Added event handler, now have ${statements.length} statements total`
                );
              }

              debug.parse(
                `✅ PARSER: After parsing event handler, current token: ${this.isAtEnd() ? 'END' : this.peek().value}, isAtEnd=${this.isAtEnd()}, check('on')=${this.check('on')}`
              );

              // Check if there's another event handler
              if (!this.isAtEnd() && !this.check('on')) {
                // No more event handlers, check if we're at the end
                if (!this.isAtEnd()) {
                  debug.parse(
                    `⚠️ PARSER: Unexpected token after event handlers: ${this.peek().value}`
                  );
                  this.addError(`Unexpected token after event handlers: ${this.peek().value}`);
                  return {
                    success: false,
                    node: this.createProgramNode(statements),
                    tokens: this.tokens,
                    error: this.error!,
                  };
                }
                debug.parse(`✅ PARSER: No more event handlers, at end of input`);
                break;
              }
            }

            debug.parse(
              `✅ PARSER: Finished parsing, creating Program node with ${statements.length} statements`
            );

            // Check if any errors were accumulated during parsing
            if (this.error) {
              return {
                success: false,
                node: this.createProgramNode(statements),
                tokens: this.tokens,
                error: this.error,
                warnings: this.warnings,
              };
            }

            // Return a program node containing both commands and event handlers
            return {
              success: true,
              node: this.createProgramNode(statements),
              tokens: this.tokens,
              warnings: this.warnings,
            };
          }

          // No event handlers, check for unexpected tokens after parsing
          if (!this.isAtEnd()) {
            this.addError(`Unexpected token: ${this.peek().value}`);
            return {
              success: false,
              node: commandSequence || this.createErrorNode(),
              tokens: this.tokens,
              error: this.error!,
            };
          }

          // Check if any errors were accumulated during parsing (e.g., unclosed parentheses)
          if (this.error) {
            return {
              success: false,
              node: commandSequence,
              tokens: this.tokens,
              error: this.error,
              warnings: this.warnings,
            };
          }

          return {
            success: true,
            node: commandSequence,
            tokens: this.tokens,
            warnings: this.warnings,
          };
        }
      }

      // Fall back to expression parsing
      const ast = this.parseExpression();

      // Check if we have an error or unexpected remaining tokens
      if (this.error) {
        return {
          success: false,
          node: ast || this.createErrorNode(), // Include partial AST if available
          tokens: this.tokens,
          error: this.error,
        };
      }

      // Check for unexpected tokens after parsing
      if (!this.isAtEnd()) {
        this.addError(`Unexpected token: ${this.peek().value}`);
        return {
          success: false,
          node: ast || this.createErrorNode(),
          tokens: this.tokens,
          error: this.error!,
          warnings: this.warnings,
        };
      }

      return {
        success: true,
        node: ast,
        tokens: this.tokens,
        warnings: this.warnings,
      };
    } catch (error) {
      this.addError(error instanceof Error ? error.message : 'Unknown parsing error');
      return {
        success: false,
        node: this.createErrorNode(),
        tokens: this.tokens,
        error: this.error!,
        warnings: this.warnings,
      };
    }
  }

  private parseExpression(): ASTNode {
    return this.parseAssignment();
  }

  private parseAssignment(): ASTNode {
    let expr = this.parseLogicalOr();

    // Right associative - assignment operators associate right-to-left
    if (this.match('=')) {
      const operator = this.previous().value;
      const right = this.parseAssignment(); // Recursive call for right associativity
      expr = this.createBinaryExpression(operator, expr, right);
    }

    return expr;
  }

  private parseLogicalOr(): ASTNode {
    let expr = this.parseLogicalAnd();

    while (this.match('or')) {
      const operator = this.previous().value;
      const right = this.parseLogicalAnd();
      expr = this.createBinaryExpression(operator, expr, right);
    }

    return expr;
  }

  private parseLogicalAnd(): ASTNode {
    let expr = this.parseEquality();

    while (this.match('and')) {
      const operator = this.previous().value;
      const right = this.parseEquality();
      expr = this.createBinaryExpression(operator, expr, right);
    }

    return expr;
  }

  private parseEquality(): ASTNode {
    let expr = this.parseComparison();

    while (
      this.matchComparisonOperator() ||
      this.match(
        'is',
        'match',
        'matches',
        'contains',
        'include',
        'includes',
        'in',
        'of',
        'as',
        'really'
      )
    ) {
      const operator = this.previous().value;

      // Handle postfix unary operators (no right operand)
      if (Parser.POSTFIX_UNARY_OPERATORS.has(operator)) {
        expr = this.createUnaryExpression(operator, expr, false); // false = postfix
        continue;
      }

      const right = this.parseComparison();
      expr = this.createBinaryExpression(operator, expr, right);
    }

    return expr;
  }

  private parseComparison(): ASTNode {
    let expr = this.parseAddition();

    while (this.matchComparisonOperator()) {
      const operator = this.previous().value;

      // Handle postfix unary operators (no right operand)
      if (Parser.POSTFIX_UNARY_OPERATORS.has(operator)) {
        expr = this.createUnaryExpression(operator, expr, false); // false = postfix
        continue;
      }

      const right = this.parseAddition();
      expr = this.createBinaryExpression(operator, expr, right);
    }

    return expr;
  }

  private parseAddition(): ASTNode {
    let expr = this.parseMultiplication();

    while (this.match('+', '-') || this.matchOperator('+') || this.matchOperator('-')) {
      const operator = this.previous().value;

      // Check for double operators like '++' or '+-'
      if (this.check('+') || this.check('-')) {
        this.addError(`Invalid operator combination: ${operator}${this.peek().value}`);
        return expr;
      }

      // Check if we're at the end or have invalid token for right operand
      if (this.isAtEnd()) {
        this.addError(`Expected expression after '${operator}' operator`);
        return expr;
      }

      const right = this.parseMultiplication();
      expr = this.createBinaryExpression(operator, expr, right);
    }

    return expr;
  }

  private parseMultiplication(): ASTNode {
    let expr = this.parseUnary();

    while (this.match('*', '/', '%', 'mod')) {
      const operator = this.previous().value;

      // Check for double operators
      if (
        this.check('*') ||
        this.check('/') ||
        this.check('%') ||
        this.check('+') ||
        this.check('-')
      ) {
        const nextOp = this.peek().value;
        // Special handling for ** which should be "Unexpected token"
        if (operator === '*' && nextOp === '*') {
          this.addError(`Unexpected token: ${nextOp}`);
        } else {
          this.addError(`Invalid operator combination: ${operator}${nextOp}`);
        }
        return expr;
      }

      // Check if we're at the end or have invalid token for right operand
      if (this.isAtEnd()) {
        this.addError(`Expected expression after '${operator}' operator`);
        return expr;
      }

      const right = this.parseUnary();
      expr = this.createBinaryExpression(operator, expr, right);
    }

    return expr;
  }

  private parseUnary(): ASTNode {
    // Handle single-word unary operators
    if (this.match('not', 'no', 'exists', 'some', '-', '+')) {
      const operator = this.previous().value;

      // Only flag as missing operand if this starts a complex expression and lacks proper context
      // Valid unary: "-5", "not true", "no value", "+number", "exists value", "some array"
      // Invalid: "5 + + 3" (handled elsewhere), standalone "+" (handled below)
      if (this.isAtEnd()) {
        this.addError(`Expected expression after '${operator}' operator`);
        return this.createErrorNode();
      }

      const expr = this.parseUnary();
      return this.createUnaryExpression(operator, expr, true);
    }

    // Handle multi-word unary operator: "does not exist"
    if (
      this.check('does') &&
      this.current + 1 < this.tokens.length &&
      this.tokens[this.current + 1].value === 'not' &&
      this.current + 2 < this.tokens.length &&
      this.tokens[this.current + 2].value === 'exist'
    ) {
      this.advance(); // consume 'does'
      this.advance(); // consume 'not'
      this.advance(); // consume 'exist'

      if (this.isAtEnd()) {
        this.addError(`Expected expression after 'does not exist' operator`);
        return this.createErrorNode();
      }

      const expr = this.parseUnary();
      return this.createUnaryExpression('does not exist', expr, true);
    }

    return this.parseImplicitBinary();
  }

  private parseImplicitBinary(): ASTNode {
    let expr = this.parseCall();

    // Handle implicit binary expressions like "command selector" OR commands with arguments
    while (
      !this.isAtEnd() &&
      !this.checkBasicOperator() &&
      !this.check('then') &&
      !this.check('and') &&
      !this.check('else') &&
      !this.check(')') &&
      !this.check(']') &&
      !this.check(',')
    ) {
      // Check if current expression is an identifier from a command token
      if (expr.type === 'identifier') {
        // First check if this identifier is a command
        if (this.isCommand((expr as IdentifierNode).name)) {
          // Check if this is a compound command (has keywords like from, to, into)
          if (this.isCompoundCommand((expr as IdentifierNode).name.toLowerCase())) {
            // For compound commands, convert to command node if followed by arguments
            if (
              this.checkCssSelector() ||
              this.checkIdSelector() ||
              this.checkClassSelector() ||
              this.checkTimeExpression() ||
              this.checkString() ||
              this.checkNumber() ||
              this.checkContextVar() ||
              this.checkIdentifier() ||
              this.checkKeyword()
            ) {
              const command = this.createCommandFromIdentifier(expr as IdentifierNode);
              if (command) {
                expr = command;
              }
            } else {
              break;
            }
          } else {
            // For simple commands, check if it takes non-selector arguments (like wait with time)
            const commandName = (expr as IdentifierNode).name.toLowerCase();
            if (commandName === 'wait' && this.checkTimeExpression()) {
              // wait with time expression should be a command
              const command = this.createCommandFromIdentifier(expr as IdentifierNode);
              if (command) {
                expr = command;
              }
            } else if (this.checkSelector()) {
              // Other simple commands with selectors become binary expressions
              const right = this.parseCall();
              expr = this.createBinaryExpression(' ', expr, right);
            } else {
              break;
            }
          }
        } else {
          // Not a command - handle as regular identifier followed by selector
          if (this.checkSelector()) {
            const right = this.parseCall();
            expr = this.createBinaryExpression(' ', expr, right);
          } else {
            break;
          }
        }
      } else if (expr.type === 'literal' && (this.checkNumber() || this.checkIdentifier())) {
        // Detect missing operator between literals/numbers like "5 3" or "123abc"
        const nextToken = this.peek();
        this.addError(
          `Missing operator between '${expr.raw || expr.value}' and '${nextToken.value}'`
        );
        return expr;
      } else {
        break;
      }
    }

    return expr;
  }

  private isCommand(name: string): boolean {
    // If we have a keyword resolver, use it to check if the token is a command
    if (this.keywordResolver) {
      return this.keywordResolver.isCommand(name);
    }
    // Phase 1 Refactoring: Use centralized command list
    return CommandClassification.isCommand(name);
  }

  private isKeyword(name: string): boolean {
    // If we have a keyword resolver, use it to check if the token is a keyword
    if (this.keywordResolver) {
      return this.keywordResolver.isKeyword(name);
    }
    // Phase 1 Refactoring: Use centralized keyword list
    return CommandClassification.isKeyword(name);
  }

  private createCommandFromIdentifier(identifierNode: IdentifierNode): CommandNode | null {
    const args: ASTNode[] = [];
    // Resolve to English canonical form for AST normalization
    const commandName = this.resolveKeyword(identifierNode.name.toLowerCase());

    if (this.isCompoundCommand(commandName)) {
      return this.parseCompoundCommand(identifierNode);
    }

    // Parse command arguments (space-separated, not comma-separated)
    while (
      !this.isAtEnd() &&
      !this.check('then') &&
      !this.check('and') &&
      !this.check('else') &&
      !this.checkIsCommand()
    ) {
      // Include EVENT tokens to allow DOM event names as arguments (e.g., 'send reset to #element')
      if (
        this.checkContextVar() ||
        this.checkIdentifier() ||
        this.checkKeyword() || // Add KEYWORD support for words like "into"
        this.checkEvent() ||
        this.checkCssSelector() ||
        this.checkIdSelector() ||
        this.checkClassSelector() ||
        this.checkString() ||
        this.checkNumber() ||
        this.checkTimeExpression() ||
        this.match('<')
      ) {
        args.push(this.parsePrimary());
      } else {
        // Stop parsing if we encounter an unrecognized token
        break;
      }
    }

    return {
      type: 'command',
      name: identifierNode.name,
      args: args as ExpressionNode[],
      isBlocking: false,
      ...(identifierNode.start !== undefined && { start: identifierNode.start }),
      end: this.getPosition().end,
      ...(identifierNode.line !== undefined && { line: identifierNode.line }),
      ...(identifierNode.column !== undefined && { column: identifierNode.column }),
    };
  }

  private isCompoundCommand(commandName: string): boolean {
    // Phase 1 Refactoring: Use centralized command list
    return CommandClassification.isCompoundCommand(commandName);
  }

  private parseCompoundCommand(identifierNode: IdentifierNode): CommandNode | null {
    return utilityCommands.parseCompoundCommand(this.getContext(), identifierNode);
  }

  private parsePutCommand(identifierNode: IdentifierNode): CommandNode | null {
    // Phase 9-3b: Delegate to extracted DOM command parser
    return domCommands.parsePutCommand(this.getContext(), identifierNode);
  }

  private parseSetCommand(identifierNode: IdentifierNode): CommandNode | null {
    // Phase 9-3b: Delegate to extracted variable command parser
    return variableCommands.parseSetCommand(this.getContext(), identifierNode);
  }

  /**
   * Parse halt command
   *
   * Phase 9-3b: Delegated to extracted command parser
   */
  private parseHaltCommand(identifierNode: IdentifierNode): CommandNode | null {
    return controlFlowCommands.parseHaltCommand(this.getContext(), identifierNode);
  }

  /**
   * Parse measure command
   *
   * Phase 9-3b: Delegated to extracted command parser
   */
  private parseMeasureCommand(identifierNode: IdentifierNode): CommandNode | null {
    return animationCommands.parseMeasureCommand(this.getContext(), identifierNode);
  }

  /**
   * Parse trigger command
   *
   * Phase 9-3a: Delegated to extracted command parser
   */
  private parseTriggerCommand(identifierNode: IdentifierNode): CommandNode | null {
    return eventCommands.parseTriggerCommand(this.getContext(), identifierNode);
  }

  /**
   * Parse repeat command with support for event-driven loops
   * Based on original _hyperscript implementation
   *
   * Syntax:
   *   repeat for <var> in <collection> ... end
   *   repeat <n> times ... end
   *   repeat while <condition> ... end
   *   repeat until <condition> ... end
   *   repeat until event <eventName> from <target> ... end
   *   repeat forever ... end
   */
  /**
   * Parse a list of commands until we hit 'end' keyword
   * This is used by repeat blocks and other control flow structures
   */
  private parseCommandListUntilEnd(): ASTNode[] {
    const commands: ASTNode[] = [];
    debug.parse('🔄 parseCommandListUntilEnd: Starting to parse command list');

    while (!this.isAtEnd() && !this.check('end')) {
      debug.parse(
        '📍 Loop iteration, current token:',
        this.peek().value,
        'kind:',
        this.peek().kind
      );
      // Try to parse a command
      let parsedCommand = false;

      if (this.checkIsCommand()) {
        debug.parse('✅ Found COMMAND token:', this.peek().value);
        this.advance(); // consume the command token
        // Save error state before parsing command
        const savedError = this.error;
        try {
          const cmd = this.parseCommand();
          // Check if an error was added during parsing (even if no exception was thrown)
          if (this.error && this.error !== savedError) {
            debug.parse(
              '⚠️  parseCommandListUntilEnd: Command parsing added error, restoring error state. Error was:',
              this.error.message
            );
            this.error = savedError;
          }
          if (cmd) {
            debug.parse('✅ Parsed command:', cmd.name);
            commands.push(cmd);
            parsedCommand = true;
          }
        } catch (error) {
          debug.parse(
            '⚠️  parseCommandListUntilEnd: Command parsing threw exception, restoring error state:',
            error instanceof Error ? error.message : String(error)
          );
          this.error = savedError;
        }
      } else if (this.checkIdentifier()) {
        const token = this.peek();
        if (this.isCommand(token.value)) {
          debug.parse('✅ Found IDENTIFIER that is a command:', token.value);
          this.advance(); // consume the command token
          // Save error state before parsing command
          const savedError = this.error;
          try {
            const cmd = this.parseCommand();
            // Check if an error was added during parsing (even if no exception was thrown)
            if (this.error && this.error !== savedError) {
              debug.parse(
                '⚠️  parseCommandListUntilEnd: Command parsing added error, restoring error state. Error was:',
                this.error.message
              );
              this.error = savedError;
            }
            if (cmd) {
              debug.parse('✅ Parsed command:', cmd.name);
              commands.push(cmd);
              parsedCommand = true;
            }
          } catch (error) {
            debug.parse(
              '⚠️  parseCommandListUntilEnd: Command parsing threw exception, restoring error state:',
              error instanceof Error ? error.message : String(error)
            );
            this.error = savedError;
          }
        } else {
          debug.parse('❌ IDENTIFIER is not a command:', token.value);
        }
      }

      // If we didn't parse a command, we might be at 'end' or hit an error
      if (!parsedCommand) {
        debug.parse('❌ No command parsed, breaking. Current token:', this.peek().value);
        break;
      }

      debug.parse('📍 After parsing command, current token:', this.peek().value);

      // Skip any unexpected tokens until we find 'end', a command, or a separator
      // This handles cases where command parsing doesn't consume all its arguments (like HSL colors)
      while (
        !this.isAtEnd() &&
        !this.check('end') &&
        !this.checkIsCommand() &&
        !this.isCommand(this.peek().value) &&
        !this.check('then') &&
        !this.check('and') &&
        !this.check(',')
      ) {
        debug.parse('⚠️  Skipping unexpected token:', this.peek().value);
        this.advance(); // skip the unexpected token
      }

      // Handle optional separators between commands
      if (this.match('then', 'and', ',')) {
        debug.parse('✅ Found separator, continuing');
        continue; // explicit separator, continue to next command
      } else if (this.checkIsCommand() || this.isCommand(this.peek().value)) {
        debug.parse('✅ Next token is a command, continuing without separator');
        continue; // next token is a command, continue without separator
      } else {
        debug.parse('📍 No separator and no command, breaking. Current token:', this.peek().value);
        // No separator and no command follows, we should be at 'end'
        break;
      }
    }

    debug.parse('🔍 After loop, checking for "end". Current token:', this.peek().value);
    // Expect and consume 'end'
    if (this.check('end')) {
      debug.parse('✅ Found "end", consuming it');
      this.advance();
    } else {
      debug.parse(
        '❌ ERROR: Expected "end" but got:',
        this.peek().value,
        'at position:',
        this.peek().start
      );
      throw new Error('Expected "end" to close repeat block');
    }

    debug.parse('✅ parseCommandListUntilEnd: Successfully parsed', commands.length, 'commands');
    return commands;
  }

  private parseRepeatCommand(commandToken: Token): CommandNode {
    return controlFlowCommands.parseRepeatCommand(this.getContext(), commandToken);
  }

  private parseForCommand(commandToken: Token): CommandNode {
    return controlFlowCommands.parseForCommand(this.getContext(), commandToken);
  }

  /**
   * Parse wait command with support for events and time expressions
   *
   * Syntax:
   *   wait <time>                                    (wait for duration)
   *   wait for <event>                              (wait for event)
   *   wait for <event>(params)                      (wait for event with parameters)
   *   wait for <event> or <event>                   (wait for multiple events)
   *   wait for <event>(params) or <event>(params)   (events with parameters)
   *   wait for <event> from <target>                (wait for event from target)
   *   wait for <event> or <event> from <target>     (multiple events from target)
   */
  /**
   * Parse wait command
   *
   * Phase 9-3b: Delegated to extracted command parser
   */
  private parseWaitCommand(commandToken: Token): CommandNode {
    return asyncCommands.parseWaitCommand(this.getContext(), commandToken) as CommandNode;
  }

  /**
   * Parse install command
   *
   * Phase 9-3b: Delegated to extracted command parser
   */
  private parseInstallCommand(commandToken: Token): CommandNode {
    return asyncCommands.parseInstallCommand(this.getContext(), commandToken);
  }

  /**
   * Parse transition command with support for multiline syntax
   *
   * Syntax:
   *   transition <property> to <value>
   *   transition <property> to <value> over <duration>
   *   transition <property> to <value> over <duration> with <timing-function>
   *   transition <target> <property> to <value>
   *
   * Multiline form:
   *   transition
   *     *background-color
   *     to `hsl(${rand} 100% 90%)`
   *     over 250ms
   */
  /**
   * Parse transition command
   *
   * Phase 9-3b: Delegated to extracted command parser
   */
  private parseTransitionCommand(commandToken: Token): CommandNode {
    return animationCommands.parseTransitionCommand(this.getContext(), commandToken);
  }

  /**
   * Parse add command: add <classes/object-literal> [to <target>]
   * Supports:
   * - add .class to me
   * - add { left: 10px, top: 20px } to me
   * - add { background: 'red' }
   */
  /**
   * Parse add command
   *
   * Phase 9-3b: Delegated to extracted command parser
   */
  private parseAddCommand(commandToken: Token): CommandNode {
    return domCommands.parseAddCommand(this.getContext(), commandToken);
  }

  /**
   * Parse if/unless command with support for single-line and multi-line forms
   *
   * Syntax:
   *   if <condition> <command>              (single-line, no 'then', no 'end')
   *   if <condition> then ... end           (multi-line with 'then' and 'end')
   *   if <condition> then ... else ... end  (with else clause)
   *   unless <condition> <command>          (single-line, equivalent to if not condition)
   *   unless <condition> then ... end       (multi-line)
   */
  private parseIfCommand(commandToken: Token): CommandNode {
    return controlFlowCommands.parseIfCommand(this.getContext(), commandToken);
  }

  /**
   * Parse remove command
   *
   * Phase 9-3b: Delegated to extracted command parser
   */
  private parseRemoveCommand(identifierNode: IdentifierNode): CommandNode | null {
    return domCommands.parseRemoveCommand(this.getContext(), identifierNode);
  }

  /**
   * Parse toggle command
   *
   * Phase 9-3b: Delegated to extracted command parser
   */
  private parseToggleCommand(identifierNode: IdentifierNode): CommandNode | null {
    return domCommands.parseToggleCommand(this.getContext(), identifierNode);
  }

  /**
   * Parse regular command
   *
   * Phase 9-3b: Delegated to extracted command parser
   */
  private parseRegularCommand(identifierNode: IdentifierNode): CommandNode | null {
    return utilityCommands.parseRegularCommand(this.getContext(), identifierNode);
  }

  private parseCall(): ASTNode {
    let expr = this.parsePrimary();

    while (true) {
      if (this.match('(')) {
        expr = this.finishCall(expr);
      } else if (this.match('.')) {
        // Phase 8: Use predicate-based consume
        const name = this.consumeIdentifier(
          "Expected property name after '.' - malformed member access"
        );
        expr = this.createMemberExpression(expr, this.createIdentifier(name.value), false);
      } else if (this.match('[')) {
        const index = this.parseExpression();
        this.consume(']', "Expected ']' after array index");
        expr = this.createMemberExpression(expr, index, true);
      } else if (this.check("'s")) {
        // Handle possessive syntax: element's property (tokenized as single 's operator)
        this.advance(); // consume 's'

        // Check for CSS property syntax: *property (e.g., element's *opacity)
        let propertyName: string;
        if (this.check('*')) {
          // Consume the * operator
          this.advance();
          // Get the property name after * - Phase 8: Use predicate-based consume
          const propertyToken = this.consumeIdentifier(
            'Expected property name after * in CSS property syntax'
          );
          // Combine * with property name
          propertyName = '*' + propertyToken.value;
        } else {
          // Normal property access - Phase 8: Use predicate-based consume
          const property = this.consumeIdentifier('Expected property name after possessive');
          propertyName = property.value;
        }

        expr = this.createPossessiveExpression(expr, this.createIdentifier(propertyName));
      } else {
        break;
      }
    }

    return expr;
  }

  private parsePrimary(): ASTNode {
    // Handle CSS property syntax: *display, *opacity, *visibility
    // Must check before binary operator error case
    if (this.check('*')) {
      const savedPos = this.current;
      this.advance(); // consume '*'
      // If * is followed by an identifier, it's a CSS property
      if (!this.isAtEnd() && isIdentifierLike(this.peek())) {
        const propertyName = this.advance().value; // consume property name
        // Return a selector node with *property syntax
        // This will be recognized by toggle command's detectExpressionType
        return this.createSelector('*' + propertyName);
      }
      // Not a CSS property, restore position and fall through to error case
      this.current = savedPos;
    }

    // Check for binary operators that cannot start an expression
    if (this.check('*') || this.check('/') || this.check('%') || this.check('mod')) {
      const token = this.peek();
      this.addError(`Binary operator '${token.value}' requires a left operand`);
      return this.createErrorNode();
    }

    // Handle literals
    if (this.matchNumber()) {
      const value = parseFloat(this.previous().value);
      return this.createLiteral(value, this.previous().value);
    }

    if (this.matchString()) {
      const raw = this.previous().value;

      // Check for unclosed string (if it doesn't end with matching quote)
      if (
        raw.length < 2 ||
        (raw.startsWith('"') && !raw.endsWith('"')) ||
        (raw.startsWith("'") && !raw.endsWith("'"))
      ) {
        this.addError('Unclosed string literal - string not properly closed');
        return this.createErrorNode();
      }

      const rawValue = raw.slice(1, -1); // Remove quotes
      // Process escape sequences (like \n, \t, etc.)
      const value = this.processEscapeSequences(rawValue);
      return this.createLiteral(value, raw);
    }

    if (this.matchTemplateLiteral()) {
      const token = this.previous();
      const raw = token.value;
      // Template literals need special handling for ${} interpolation
      // Return a templateLiteral node so the expression evaluator can interpolate variables
      return {
        type: 'templateLiteral',
        value: raw,
        start: token.start || 0,
        end: token.end || 0,
        line: token.line,
        column: token.column,
      };
    }

    if (this.matchBoolean()) {
      const tokenValue = this.previous().value;
      let value: unknown;

      switch (tokenValue) {
        case 'true':
          value = true;
          break;
        case 'false':
          value = false;
          break;
        case 'null':
          value = null;
          break;
        case 'undefined':
          value = undefined;
          break;
        default:
          value = tokenValue === 'true'; // fallback to original logic
      }

      return this.createLiteral(value, tokenValue);
    }

    // Handle time expressions
    if (this.matchTimeExpression()) {
      const raw = this.previous().value;
      return this.createLiteral(raw, raw); // Keep time expressions as string literals
    }

    // Handle query reference selectors (<button/>, <.class/>, <#id/>)
    // IMPORTANT: Check this BEFORE matchSelector() since query references are also selectors
    if (this.matchQueryReference()) {
      const queryValue = this.previous().value;
      // Extract the selector from <.../>
      const selector = queryValue.slice(1, -2).trim(); // Remove < and /> and whitespace
      return this.createSelector(selector);
    }

    // Handle CSS selectors (#id, .class)
    if (this.matchSelector()) {
      return this.createSelector(this.previous().value);
    }

    // Handle hyperscript selector syntax: <button/>
    if (this.match('<')) {
      return this.parseHyperscriptSelector();
    }

    // Handle parenthesized expressions
    if (this.match('(')) {
      // Check if this is an empty parentheses case like just '('
      if (this.isAtEnd()) {
        this.addError('Expected expression inside parentheses');
        return this.createErrorNode();
      }

      const expr = this.parseExpression();
      this.consume(')', "Expected closing parenthesis ')' after expression - unclosed parentheses");
      return expr;
    }

    // Handle object literals
    if (this.match('{')) {
      return this.parseObjectLiteral();
    }

    // Handle attribute literals: [@attr="value"] or array literals: [1, 2, 3]
    if (this.match('[')) {
      return this.parseAttributeOrArrayLiteral();
    }

    // Handle global `::` or local `:` variable prefix for expressions
    // IMPORTANT: Check for ::variable and :variable BEFORE general operator handling
    if (this.check(':')) {
      this.advance(); // consume first `:`

      // Check if this is `::variable` (global) or `:variable` (local)
      if (this.check(':')) {
        // This is `::variable` (explicit global scope)
        this.advance(); // consume second `:`
        const varToken = this.advance(); // get variable name
        return {
          type: 'identifier',
          name: varToken.value,
          scope: 'global', // Mark as explicit global variable
          start: varToken.start - 2, // Include both `::` in the start position
          end: varToken.end,
          line: varToken.line,
          column: varToken.column,
        } as any;
      } else {
        // This is `:variable` (local scope)
        const varToken = this.advance(); // get variable name
        return {
          type: 'identifier',
          name: varToken.value,
          scope: 'local', // Mark as local variable
          start: varToken.start - 1, // Include the `:` in the start position
          end: varToken.end,
          line: varToken.line,
          column: varToken.column,
        } as any;
      }
    }

    // Handle operators as literal tokens
    if (this.matchBasicOperator()) {
      const token = this.previous();
      return this.createIdentifier(token.value);
    }

    // Handle identifiers, keywords, and commands
    // BUT: Don't consume structural keywords like 'end', 'else', 'then' as identifiers
    const currentToken = this.peek();
    const isStructuralKeyword =
      currentToken &&
      (currentToken.value === 'end' ||
        currentToken.value === 'else' ||
        currentToken.value === 'then');

    // Handle identifiers, keywords, events, and commands
    // EVENT tokens (like 'reset', 'submit', 'click') should be treated as identifiers
    // when used as arguments to commands like 'send reset to #element'
    if (
      !isStructuralKeyword &&
      (this.matchPredicate(isIdentifier) ||
        this.matchPredicate(isKeywordPredicate) ||
        this.matchPredicate(isContextVar) ||
        this.matchPredicate(isCommandPredicate) ||
        this.matchPredicate(isEvent))
    ) {
      const token = this.previous();

      // Handle constructor calls with 'new' keyword
      if (token.value === 'new') {
        return this.parseConstructorCall();
      }

      // Handle special hyperscript constructs
      if (token.value === 'on') {
        return this.parseEventHandler();
      }

      if (token.value === 'if') {
        return this.parseConditional();
      }

      // Handle hyperscript navigation functions
      if (
        token.value === 'closest' ||
        token.value === 'first' ||
        token.value === 'last' ||
        token.value === 'previous' ||
        token.value === 'next'
      ) {
        // Check if followed by function call syntax or expression
        if (
          this.check('(') ||
          this.checkCssSelector() ||
          this.checkClassSelector() ||
          this.checkIdSelector() ||
          this.check('<') ||
          this.checkQueryReference()
        ) {
          return this.parseNavigationFunction(token.value);
        }
        // Special case: handle `.className` that was tokenized as '.' + 'identifier'
        // This happens because the tokenizer doesn't recognize class selectors after identifiers
        if (this.check('.')) {
          const dotPos = this.current;
          this.advance(); // consume '.'
          if (this.checkIdentifier()) {
            // It's a class selector like `.sortable-item`
            const className = this.advance().value;
            const selector = '.' + className;
            const selectorNode = this.createSelector(selector);
            return this.createCallExpression(this.createIdentifier(token.value), [selectorNode]);
          }
          // Not a class selector, backtrack
          this.current = dotPos;
        }
        // Also handle `#id` that was tokenized as '#' + 'identifier'
        if (this.check('#')) {
          const hashPos = this.current;
          this.advance(); // consume '#'
          if (this.checkIdentifier()) {
            // It's an ID selector like `#my-element`
            const idName = this.advance().value;
            const selector = '#' + idName;
            const selectorNode = this.createSelector(selector);
            return this.createCallExpression(this.createIdentifier(token.value), [selectorNode]);
          }
          // Not an ID selector, backtrack
          this.current = hashPos;
        }
        return this.createIdentifier(token.value);
      }

      // Handle "my", "its", "your" property access (but only for space syntax, not dot syntax)
      // For dot syntax (my.prop), let it fall through to be handled by parseCall()
      if (token.value === 'my' && !this.check('.')) {
        return this.parseContextPropertyAccess('me');
      }
      if (token.value === 'its' && !this.check('.')) {
        return this.parseContextPropertyAccess('it');
      }
      if (token.value === 'your' && !this.check('.')) {
        return this.parseContextPropertyAccess('you');
      }

      // Handle "the X of Y" pattern: the value of #element
      if (token.value === 'the') {
        return this.parseTheXofY();
      }

      return this.createIdentifier(token.value);
    }

    // Handle dollar expressions ($variable, $1, $window.foo)
    if (this.match('$')) {
      return this.parseDollarExpression();
    }

    const token = this.peek();
    this.addError(`Unexpected token: ${token.value} at line ${token.line}, column ${token.column}`);
    return this.createErrorNode();
  }

  private parseDollarExpression(): ASTNode {
    // We've already consumed the '$' token

    // Check if followed by a number (like $1, $2)
    if (this.checkNumber()) {
      const numberToken = this.advance();
      const value = numberToken.value;
      return this.createLiteral(value, `$${value}`);
    }

    // Check if followed by an identifier (like $variable, $window)
    if (this.checkIdentifier()) {
      const identifierToken = this.advance();
      let expression: ASTNode = this.createIdentifier(identifierToken.value);

      // Handle property access like $window.foo
      while (this.match('.')) {
        if (this.checkIdentifier()) {
          const propertyToken = this.advance();
          expression = this.createMemberExpression(
            expression,
            this.createIdentifier(propertyToken.value),
            false
          );
        } else {
          this.addError("Expected property name after '.' in dollar expression");
          return this.createErrorNode();
        }
      }

      // Wrap in a special dollar expression node
      return {
        type: 'dollarExpression',
        expression,
        raw: `$${identifierToken.value}${(this.previous() as any).raw || this.previous().value || ''}`,
        line: identifierToken.line,
        column: identifierToken.column - 1, // Include the $ symbol
      };
    }

    this.addError("Expected identifier or number after '$'");
    return this.createErrorNode();
  }

  private parseHyperscriptSelector(): SelectorNode {
    let selector = '';

    // Parse until we find '/>'
    while (!this.check('/') && !this.isAtEnd()) {
      selector += this.advance().value;
    }

    this.consume('/', "Expected '/' in hyperscript selector");
    this.consume('>', "Expected '>' after '/' in hyperscript selector");

    return this.createSelector(selector);
  }

  private parseObjectLiteral(): ASTNode {
    const properties: Array<{ key: ASTNode; value: ASTNode }> = [];
    const pos = this.getPosition();

    // Handle empty object
    if (this.check('}')) {
      this.advance(); // consume '}'
      return {
        type: 'objectLiteral',
        properties,
        start: pos.start,
        end: this.getPosition().end,
        line: pos.line,
        column: pos.column,
      };
    }

    // Parse key-value pairs
    do {
      // Parse property key
      let key: ASTNode;

      if (this.matchPredicate(isIdentifier)) {
        // Unquoted property name
        key = this.createIdentifier(this.previous().value);
      } else if (this.matchString()) {
        // Quoted property name
        const raw = this.previous().value;
        const value = raw.slice(1, -1); // Remove quotes
        key = this.createLiteral(value, raw);
      } else {
        this.addError('Expected property name in object literal');
        return this.createErrorNode();
      }

      // Expect colon
      this.consume(':', "Expected ':' after property name in object literal");

      // Parse property value
      const value = this.parseExpression();
      properties.push({ key, value });

      // Check for comma or end
      if (this.match(',')) {
        // Continue to next property
        if (this.check('}')) {
          // Allow trailing comma
          break;
        }
      } else {
        // Must be end of object
        break;
      }
    } while (!this.isAtEnd());

    this.consume('}', "Expected '}' after object literal properties");

    return {
      type: 'objectLiteral',
      properties,
      start: pos.start,
      end: this.getPosition().end,
      line: pos.line,
      column: pos.column,
    };
  }

  /**
   * Parse CSS-style object literal for inline styles
   * Syntax: { prop: value; prop: value; }
   * Supports template interpolation: { left: ${x}px; top: ${y}px; }
   */
  private parseCSSObjectLiteral(): ASTNode {
    const pos = this.getPosition();
    const properties: Array<{ key: ASTNode; value: ASTNode }> = [];

    do {
      // Check for end of object
      if (this.check('}')) {
        break;
      }

      // Parse property name (CSS property names can have hyphens)
      let key: ASTNode;
      if (this.matchPredicate(isIdentifier)) {
        key = this.createIdentifier(this.previous().value);
      } else if (this.matchString()) {
        const raw = this.previous().value;
        const value = raw.slice(1, -1);
        key = this.createLiteral(value, raw);
      } else {
        this.addError('Expected CSS property name');
        return this.createErrorNode();
      }

      // Expect colon
      if (!this.consume(':', "Expected ':' after CSS property name")) {
        return this.createErrorNode();
      }

      // Parse value - collect all tokens until semicolon or closing brace
      // Handle nested braces in ${} template expressions
      const valueTokens: string[] = [];
      let hasTemplateExpression = false;
      let braceDepth = 0;

      while (!this.isAtEnd()) {
        // Check for end of value (only when not inside ${})
        if (braceDepth === 0 && (this.check(';') || this.check('}'))) {
          break;
        }

        const token = this.advance();
        valueTokens.push(token.value);

        // Track brace depth for ${} template expressions
        if (token.value === '$' && this.check('{')) {
          hasTemplateExpression = true;
        }
        if (token.value === '{') {
          braceDepth++;
        }
        if (token.value === '}') {
          braceDepth--;
        }
      }

      // Combine tokens into a single value string
      const valueString = valueTokens.join('');

      // Create value node - if it has ${} syntax, make it a template literal
      const value: ASTNode = hasTemplateExpression
        ? {
            type: 'templateLiteral',
            value: valueString,
            start: pos.start,
            end: this.getPosition().end,
            line: pos.line,
            column: pos.column,
          }
        : this.createLiteral(valueString, valueString);

      properties.push({ key, value });

      // Consume optional semicolon
      if (this.check(';')) {
        this.advance();
      }

      // Check for another property or end of object
      if (this.check('}')) {
        break;
      }
    } while (!this.isAtEnd());

    this.consume('}', "Expected '}' after CSS object literal properties");

    return {
      type: 'objectLiteral',
      properties,
      start: pos.start,
      end: this.getPosition().end,
      line: pos.line,
      column: pos.column,
    };
  }

  private parseConstructorCall(): ASTNode {
    // We've already consumed the 'new' token
    const newToken = this.previous();

    // Expect constructor name (identifier)
    if (!this.checkIdentifier()) {
      this.addError('Expected constructor name after "new"');
      return this.createErrorNode();
    }

    const constructorToken = this.advance();
    const constructorName = constructorToken.value;

    // Expect opening parenthesis
    if (!this.check('(')) {
      this.addError('Expected "(" after constructor name');
      return this.createErrorNode();
    }

    this.advance(); // consume '('

    // For now, only support empty argument list (constructor calls without arguments)
    const args: ASTNode[] = [];

    // Parse arguments if any (simplified - just handle empty for now)
    if (!this.check(')')) {
      // If there are arguments, we could parse them here
      // For now, just consume tokens until closing paren
      let depth = 1;
      while (depth > 0 && !this.isAtEnd()) {
        const token = this.advance();
        if (token.value === '(') depth++;
        if (token.value === ')') depth--;
      }
    } else {
      this.advance(); // consume ')'
    }

    // Create constructor call AST node (using callExpression type with constructor flag)
    return {
      type: 'callExpression',
      callee: {
        type: 'identifier',
        name: constructorName,
        start: constructorToken.start,
        end: constructorToken.end,
        line: constructorToken.line,
        column: constructorToken.column,
      },
      arguments: args,
      isConstructor: true, // Flag to indicate this is a constructor call
      start: newToken.start,
      end: this.previous().end,
      line: newToken.line,
      column: newToken.column,
    };
  }

  /**
   * Parse a top-level init block (not inside a behavior)
   * Handles comments properly by skipping COMMENT tokens
   */
  private parseTopLevelInitBlock(): ASTNode {
    const pos = this.getPosition();
    const initCommands = this.parseCommandBlock(['end']);

    // Consume the 'end' keyword
    this.consume('end', "Expected 'end' after init block");

    return {
      type: 'initBlock',
      commands: initCommands,
      start: pos.start,
      end: this.getPosition().end,
      line: pos.line,
      column: pos.column,
    };
  }

  /**
   * Parse a function definition (def feature)
   * Syntax: def <name>(<params>) <commands> [catch <id> <commands>] [finally <commands>] end
   */
  private parseDefFeature(): DefNode {
    const pos = this.getPosition();

    // Parse function name (can be namespaced like utils.myFunc)
    let funcName = '';
    if (this.checkIdentifier()) {
      funcName = this.advance().value;

      // Check for namespaced name (dots)
      while (this.check('.')) {
        this.advance(); // consume '.'
        if (this.checkIdentifier()) {
          funcName += '.' + this.advance().value;
        }
      }
    } else {
      this.addError("Expected function name after 'def'");
      return {
        type: 'def',
        name: '',
        params: [],
        body: [],
        start: pos.start,
        end: this.getPosition().end,
        line: pos.line,
        column: pos.column,
      };
    }

    // Parse parameters
    const params: string[] = [];
    if (this.check('(')) {
      this.advance(); // consume '('

      if (!this.check(')')) {
        // Parse first parameter
        if (this.checkIdentifier()) {
          params.push(this.advance().value);
        }

        // Parse additional parameters
        while (this.check(',')) {
          this.advance(); // consume ','
          if (this.checkIdentifier()) {
            params.push(this.advance().value);
          }
        }
      }

      this.consume(')', "Expected ')' after parameter list");
    }

    // Parse command list (body)
    const bodyCommands = this.parseCommandBlock(['end', 'catch', 'finally']);

    // Parse optional catch block
    let errorSymbol: string | undefined;
    let errorHandler: CommandNode[] | undefined;
    if (this.check('catch')) {
      this.advance(); // consume 'catch'
      if (this.checkIdentifier()) {
        errorSymbol = this.advance().value;
      }
      errorHandler = this.parseCommandBlock(['end', 'finally']);
    }

    // Parse optional finally block
    let finallyHandler: CommandNode[] | undefined;
    if (this.check('finally')) {
      this.advance(); // consume 'finally'
      finallyHandler = this.parseCommandBlock(['end']);
    }

    // Consume the 'end' keyword
    this.consume('end', "Expected 'end' after function definition");

    // Build result object, conditionally including optional properties
    return {
      type: 'def' as const,
      name: funcName,
      params,
      body: bodyCommands,
      ...(errorSymbol !== undefined && { errorSymbol }),
      ...(errorHandler !== undefined && { errorHandler }),
      ...(finallyHandler !== undefined && { finallyHandler }),
      start: pos.start,
      end: this.getPosition().end,
      line: pos.line,
      column: pos.column,
    };
  }

  /**
   * Parse an event name, optionally with namespace (e.g., "click" or "draggable:start")
   * @param errorMessage - Error message if event name is not found
   * @returns The parsed event name with optional namespace
   */
  private parseEventNameWithNamespace(errorMessage: string): string {
    let eventToken: Token;
    if (this.checkEvent()) {
      eventToken = this.advance();
    } else if (this.checkIdentifier()) {
      eventToken = this.advance();
    } else {
      // Phase 8: Use predicate-based consume
      eventToken = this.consumeEvent(errorMessage);
    }

    let event = eventToken.value;
    if (this.check(':')) {
      this.advance();
      const namespaceToken = this.advance();
      event = `${event}:${namespaceToken.value}`;
    }
    return event;
  }

  private parseEventHandler(): EventHandlerNode {
    debug.parse(`🔧 parseEventHandler: ENTRY - parsing event handler`);

    // Collect all event names (supports "on event1 or event2 or event3")
    const eventNames: string[] = [];

    // Parse first event name
    const event = this.parseEventNameWithNamespace("Expected event name after 'on'");
    eventNames.push(event);
    debug.parse(`🔧 parseEventHandler: Parsed first event name: ${event}`);

    // Check for additional event names with 'or' keyword
    while (this.check('or')) {
      this.advance(); // consume 'or'
      debug.parse(`🔧 parseEventHandler: Found 'or', parsing additional event name`);

      const additionalEvent = this.parseEventNameWithNamespace("Expected event name after 'or'");
      eventNames.push(additionalEvent);
      debug.parse(`🔧 parseEventHandler: Parsed additional event name: ${additionalEvent}`);
    }

    debug.parse(`🔧 parseEventHandler: Total events parsed: ${eventNames.join(', ')}`);

    // Check for parameter syntax: (param1, param2, ...)
    // This is used for custom events like "on addHistory(action)"
    let eventParams: string[] = [];
    if (this.match('(')) {
      // Parse parameter names
      if (!this.check(')')) {
        do {
          const paramToken = this.advance();
          eventParams.push(paramToken.value);
        } while (this.match(','));
      }
      this.consume(')', "Expected ')' after event parameters");
      debug.parse(`🔧 parseEventHandler: Parsed event parameters: ${eventParams.join(', ')}`);
    }

    // Check for conditional syntax: [condition]
    let condition: ASTNode | undefined;
    if (this.match('[')) {
      condition = this.parseExpression();
      this.consume(']', "Expected ']' after event condition");
    }

    // Optional: handle "from <target>" for event source delegation
    // Supports: identifiers (me, window, myVar), CSS selectors (#id, .class), query refs (<div/>)
    let target: string | undefined;
    if (this.match('from')) {
      const targetToken = this.advance();
      target = targetToken.value;
      debug.parse(
        `🔧 parseEventHandler: Parsed 'from' target: ${target} (kind: ${targetToken.kind})`
      );
    }

    // Optional: handle "of attribute" for mutation events
    let attributeName: string | undefined;
    if (this.match('of')) {
      const attrToken = this.advance();
      // Handle both @attribute and attribute syntax
      if (attrToken.value.startsWith('@')) {
        attributeName = attrToken.value.substring(1); // Remove @ prefix
      } else {
        attributeName = attrToken.value;
      }
      debug.parse(`🔧 parseEventHandler: Parsed attribute name: ${attributeName}`);
    }

    // Optional: handle "in <target>" for watching other elements
    let watchTarget: ASTNode | undefined;
    if (this.match('in')) {
      debug.parse(`🔧 parseEventHandler: Found 'in' keyword, parsing watch target`);
      watchTarget = this.parseExpression();
      debug.parse(`🔧 parseEventHandler: Parsed watch target expression`);
    }

    // Parse commands
    const commands: CommandNode[] = [];

    debug.parse(
      `✅ parseEventHandler: About to parse commands, current token: ${this.isAtEnd() ? 'END' : this.peek().value}, isAtEnd: ${this.isAtEnd()}`
    );

    // Look for commands after the event (and optional selector)
    while (!this.isAtEnd()) {
      debug.parse(
        `✅ parseEventHandler: Loop iteration, current token: ${this.peek().value}, kind: ${this.peek().kind}`
      );

      // Stop parsing commands if we encounter another event handler (on ...)
      if (this.check('on')) {
        debug.parse(
          `✅ parseEventHandler: Stopping command parsing, found next event handler 'on'`
        );
        break;
      }

      // Skip comment tokens inside event handlers
      if (this.checkComment()) {
        debug.parse(`✅ parseEventHandler: Skipping comment token: ${this.peek().value}`);
        this.advance();
        continue;
      }

      // Stop parsing commands if we encounter 'end' (for top-level event handlers)
      if (this.check('end')) {
        debug.parse(`✅ parseEventHandler: Stopping command parsing, found 'end' keyword`);
        this.advance(); // consume the 'end' keyword
        break;
      }

      if (this.checkIsCommand()) {
        // Check if this is actually a pseudo-command (command token used as function call)
        const nextIsOpenParen = this.tokens[this.current + 1]?.value === '(';
        const commandName = this.peek().value.toLowerCase();

        // Special handling for commands that use (param) syntax but aren't pseudo-commands
        // js(param) ... end - parameter names, not function call
        // tell <target> - not a function call
        const isSpecialBodyCommand = commandName === 'js' || commandName === 'tell';

        if (nextIsOpenParen && !isSpecialBodyCommand) {
          // This might be a pseudo-command like add(5, 10) on calc
          // Parse as expression to get the function call
          let expr;
          const savedError = this.error;
          try {
            expr = this.parseExpression();
          } catch (error) {
            // If expression parsing fails, fall back to command parsing
            this.error = savedError;
            this.advance(); // consume the command token
            const cmd = this.parseCommand();
            commands.push(cmd);
            continue;
          }

          // Check if it's a call expression followed by pseudo-command pattern
          if (expr && expr.type === 'callExpression') {
            const callExpr = expr as CallExpressionNode;
            const methodName = (callExpr.callee as IdentifierNode).name;
            const pseudoCommandPrepositions = ['from', 'on', 'with', 'into', 'at', 'to'];
            const nextToken = this.peek();

            // Check if this looks like a pseudo-command pattern
            const hasPseudoCommandPattern =
              pseudoCommandPrepositions.includes(nextToken.value.toLowerCase()) ||
              (isIdentifier(nextToken) && !this.isCommand(nextToken.value)) ||
              isContextVar(nextToken);

            const isPseudoCommand = hasPseudoCommandPattern;

            if (isPseudoCommand) {
              // Emit warning if using a known command name as pseudo-command
              if (this.isCommand(methodName)) {
                this.addWarning({
                  type: 'command-shadow',
                  message: `Method '${methodName}' shadows hyperscript command`,
                  suggestions: [
                    `Rename method to avoid confusion (e.g., '${methodName}Fn', 'my${methodName.charAt(0).toUpperCase() + methodName.slice(1)}')`,
                    `Use 'call' command instead: call ${methodName}(...)`,
                    'This works but may cause ambiguity',
                  ],
                  severity: 'warning',
                  code: 'PSEUDO_CMD_SHADOW',
                  ...(expr.line !== undefined && { line: expr.line }),
                  ...(expr.column !== undefined && { column: expr.column }),
                });
              }
              // Parse as pseudo-command
              let preposition: string | undefined;
              if (pseudoCommandPrepositions.includes(this.peek().value.toLowerCase())) {
                preposition = this.advance().value.toLowerCase();
              }

              let targetExpr: ASTNode;
              try {
                targetExpr = this.parseExpression();
              } catch (error) {
                // Fall back to regular command
                const commandNode: CommandNode = {
                  type: 'command',
                  name: methodName,
                  args: callExpr.arguments as ExpressionNode[],
                  isBlocking: false,
                  ...(expr.start !== undefined && { start: expr.start }),
                  ...(expr.end !== undefined && { end: expr.end }),
                  ...(expr.line !== undefined && { line: expr.line }),
                  ...(expr.column !== undefined && { column: expr.column }),
                };
                commands.push(commandNode);
                continue;
              }

              // Create pseudo-command node
              const pseudoCommandNode: CommandNode = {
                type: 'command',
                name: 'pseudo-command',
                args: [
                  {
                    type: 'objectLiteral',
                    properties: [
                      {
                        key: { type: 'identifier', name: 'methodName' } as IdentifierNode,
                        value: {
                          type: 'literal',
                          value: methodName,
                          raw: `"${methodName}"`,
                        } as LiteralNode,
                      },
                      {
                        key: { type: 'identifier', name: 'methodArgs' } as IdentifierNode,
                        value: {
                          type: 'literal',
                          value: callExpr.arguments,
                          raw: JSON.stringify(callExpr.arguments),
                        } as LiteralNode,
                      },
                      ...(preposition
                        ? [
                            {
                              key: { type: 'identifier', name: 'preposition' } as IdentifierNode,
                              value: {
                                type: 'literal',
                                value: preposition,
                                raw: `"${preposition}"`,
                              } as LiteralNode,
                            },
                          ]
                        : []),
                      {
                        key: { type: 'identifier', name: 'targetExpression' } as IdentifierNode,
                        value: targetExpr,
                      },
                    ],
                  } as any,
                ] as ExpressionNode[],
                isBlocking: false,
                ...(expr.start !== undefined && { start: expr.start }),
                ...(expr.end !== undefined && { end: expr.end }),
                ...(expr.line !== undefined && { line: expr.line }),
                ...(expr.column !== undefined && { column: expr.column }),
              };
              commands.push(pseudoCommandNode);
              continue;
            }
          }

          // Not a pseudo-command, treat as regular expression/command
          if (expr && expr.type === 'callExpression') {
            const callExpr = expr as CallExpressionNode;
            const commandNode: CommandNode = {
              type: 'command',
              name: (callExpr.callee as IdentifierNode).name,
              args: callExpr.arguments as ExpressionNode[],
              isBlocking: false,
              ...(expr.start !== undefined && { start: expr.start }),
              ...(expr.end !== undefined && { end: expr.end }),
              ...(expr.line !== undefined && { line: expr.line }),
              ...(expr.column !== undefined && { column: expr.column }),
            };
            commands.push(commandNode);
          }
        } else {
          // No parentheses, parse as regular command
          this.advance(); // consume the command token - parseCommand expects this as previous()
          // Save error state before parsing
          const savedError = this.error;
          try {
            const cmd = this.parseCommand();
            // Check if an error was added during parsing (even if no exception was thrown)
            if (this.error && this.error !== savedError) {
              debug.parse(
                '⚠️ Command parsing added error, restoring error state. Error was:',
                this.error.message
              );
              this.error = savedError;
            }
            commands.push(cmd);
            debug.parse(
              `✅ parseEventHandler: Parsed command, next token: ${this.isAtEnd() ? 'END' : this.peek().value}`
            );
          } catch (error) {
            // If command parsing fails, restore error state and skip to next command
            debug.parse(
              '⚠️ Command parsing threw exception, restoring error state:',
              error instanceof Error ? error.message : String(error)
            );
            this.error = savedError;
          }
        }
      } else if (this.checkIdentifier()) {
        // Check if this identifier is a command or function call
        const token = this.peek();
        if (this.isCommand(token.value)) {
          // It's a command - parse as command
          this.advance(); // consume the command token - parseCommand expects this as previous()
          // Save error state before parsing
          const savedError = this.error;
          try {
            const cmd = this.parseCommand();
            // Check if an error was added during parsing (even if no exception was thrown)
            if (this.error && this.error !== savedError) {
              debug.parse(
                '⚠️ Command parsing added error, restoring error state. Error was:',
                this.error.message
              );
              this.error = savedError;
            }
            commands.push(cmd);
          } catch (error) {
            // If command parsing fails, restore error state and skip to next command
            debug.parse(
              '⚠️ Command parsing threw exception, restoring error state:',
              error instanceof Error ? error.message : String(error)
            );
            this.error = savedError;
          }
        } else {
          // Parse as expression (could be function call like focus())
          let expr;
          // Save error state before parsing
          const savedError = this.error;
          try {
            expr = this.parseExpression();
          } catch (error) {
            // If expression parsing fails (e.g., HSL colors), restore error state and skip
            debug.parse(
              '⚠️ Expression parsing error, restoring error state:',
              error instanceof Error ? error.message : String(error)
            );
            this.error = savedError;
            break;
          }

          // Convert call expressions to commands
          if (expr && expr.type === 'callExpression') {
            const callExpr = expr as CallExpressionNode;
            const methodName = (callExpr.callee as IdentifierNode).name;

            // Check if this is a pseudo-command (function call followed by preposition/target)
            const pseudoCommandPrepositions = ['from', 'on', 'with', 'into', 'at', 'to'];
            const nextToken = this.peek();

            // Check if this looks like a pseudo-command pattern
            const hasPseudoCommandPattern =
              pseudoCommandPrepositions.includes(nextToken.value.toLowerCase()) ||
              (isIdentifier(nextToken) && !this.isCommand(nextToken.value)) ||
              isContextVar(nextToken);

            const isPseudoCommand = hasPseudoCommandPattern;

            if (isPseudoCommand) {
              // Emit warning if using a known command name as pseudo-command
              if (this.isCommand(methodName)) {
                this.addWarning({
                  type: 'command-shadow',
                  message: `Method '${methodName}' shadows hyperscript command`,
                  suggestions: [
                    `Rename method to avoid confusion (e.g., '${methodName}Fn', 'my${methodName.charAt(0).toUpperCase() + methodName.slice(1)}')`,
                    `Use 'call' command instead: call ${methodName}(...)`,
                    'This works but may cause ambiguity',
                  ],
                  severity: 'warning',
                  code: 'PSEUDO_CMD_SHADOW',
                  ...(expr.line !== undefined && { line: expr.line }),
                  ...(expr.column !== undefined && { column: expr.column }),
                });
              }
              // Parse pseudo-command: methodName(args) [preposition] target
              let preposition: string | undefined;

              // Check for optional preposition
              if (pseudoCommandPrepositions.includes(this.peek().value.toLowerCase())) {
                preposition = this.advance().value.toLowerCase();
              }

              // Parse target expression
              let targetExpr: ASTNode;
              try {
                targetExpr = this.parseExpression();
              } catch (error) {
                // If target parsing fails, treat as regular command
                const commandNode: CommandNode = {
                  type: 'command',
                  name: methodName,
                  args: callExpr.arguments as ExpressionNode[],
                  isBlocking: false,
                  ...(expr.start !== undefined && { start: expr.start }),
                  ...(expr.end !== undefined && { end: expr.end }),
                  ...(expr.line !== undefined && { line: expr.line }),
                  ...(expr.column !== undefined && { column: expr.column }),
                };
                commands.push(commandNode);
                continue;
              }

              // Create pseudo-command node
              const pseudoCommandNode: CommandNode = {
                type: 'command',
                name: 'pseudo-command',
                args: [
                  // Encode pseudo-command data as a structured argument
                  {
                    type: 'objectLiteral',
                    properties: [
                      {
                        key: { type: 'identifier', name: 'methodName' } as IdentifierNode,
                        value: {
                          type: 'literal',
                          value: methodName,
                          raw: `"${methodName}"`,
                        } as LiteralNode,
                      },
                      {
                        key: { type: 'identifier', name: 'methodArgs' } as IdentifierNode,
                        value: {
                          type: 'literal',
                          value: callExpr.arguments,
                          raw: JSON.stringify(callExpr.arguments),
                        } as LiteralNode,
                      },
                      ...(preposition
                        ? [
                            {
                              key: { type: 'identifier', name: 'preposition' } as IdentifierNode,
                              value: {
                                type: 'literal',
                                value: preposition,
                                raw: `"${preposition}"`,
                              } as LiteralNode,
                            },
                          ]
                        : []),
                      {
                        key: { type: 'identifier', name: 'targetExpression' } as IdentifierNode,
                        value: targetExpr,
                      },
                    ],
                  } as any,
                ] as ExpressionNode[],
                isBlocking: false,
                ...(expr.start !== undefined && { start: expr.start }),
                ...(expr.end !== undefined && { end: expr.end }),
                ...(expr.line !== undefined && { line: expr.line }),
                ...(expr.column !== undefined && { column: expr.column }),
              };
              commands.push(pseudoCommandNode);
            } else {
              // Regular command
              const commandNode: CommandNode = {
                type: 'command',
                name: methodName,
                args: callExpr.arguments as ExpressionNode[],
                isBlocking: false,
                ...(expr.start !== undefined && { start: expr.start }),
                ...(expr.end !== undefined && { end: expr.end }),
                ...(expr.line !== undefined && { line: expr.line }),
                ...(expr.column !== undefined && { column: expr.column }),
              };
              commands.push(commandNode);
            }
          } else if (
            expr &&
            expr.type === 'binaryExpression' &&
            (expr as BinaryExpressionNode).operator === ' '
          ) {
            // Handle "command target" patterns
            const binExpr = expr as BinaryExpressionNode;
            if (
              binExpr.left &&
              binExpr.left.type === 'identifier' &&
              this.isCommand((binExpr.left as any).name)
            ) {
              const commandNode: CommandNode = {
                type: 'command',
                name: (binExpr.left as any).name,
                args: [binExpr.right as ExpressionNode],
                isBlocking: false,
                ...(expr.start !== undefined && { start: expr.start }),
                ...(expr.end !== undefined && { end: expr.end }),
                ...(expr.line !== undefined && { line: expr.line }),
                ...(expr.column !== undefined && { column: expr.column }),
              };
              commands.push(commandNode);
            } else {
              break; // Not a command pattern
            }
          } else {
            break; // Not a command pattern
          }
        }
      } else {
        break; // No more commands
      }

      // Skip any unexpected tokens until we find a command or separator
      // This handles cases where command parsing doesn't consume all its arguments (like HSL colors)
      // But don't skip 'on' tokens (they start new event handlers)
      while (
        !this.isAtEnd() &&
        !this.checkIsCommand() &&
        !this.isCommand(this.peek().value) &&
        !this.check('then') &&
        !this.check('and') &&
        !this.check(',') &&
        !this.check('on')
      ) {
        this.advance(); // skip the unexpected token
      }

      // Handle command separators
      if (this.match('then', 'and', ',')) {
        continue; // parse next command
      } else if (this.checkIsCommand() || this.isCommand(this.peek().value)) {
        // Next token is a command - continue parsing even without explicit 'then'
        // This handles newline-separated commands in event handlers
        continue;
      } else {
        break; // no more commands
      }
    }

    const pos = this.getPosition();

    // Use first event name for compatibility (if single event) or all events
    const node: EventHandlerNode = {
      type: 'eventHandler',
      event: eventNames.length === 1 ? eventNames[0] : eventNames.join('|'),
      events: eventNames, // Store all event names for runtime
      commands,
      ...(eventParams.length > 0 && { params: eventParams }), // Add event parameters
      ...(condition && { condition }), // Add condition if present
      ...(target && { target }), // Add target if present
      ...(attributeName && { attributeName }), // Add attributeName if present
      ...(watchTarget && { watchTarget }), // Add watchTarget if present
      start: pos.start,
      end: pos.end,
      line: pos.line,
      column: pos.column,
    };

    debug.parse(
      `🔧 parseEventHandler: Created node with events: ${eventNames.join(', ')}, attributeName: ${attributeName || 'none'}, watchTarget: ${watchTarget ? 'yes' : 'none'}`
    );
    return node;
  }

  /**
   * Parse a behavior definition
   *
   * Syntax:
   *   behavior BehaviorName
   *     [on <event> ... end]*
   *     [init ... end]
   *   end
   *
   *   behavior BehaviorName(param1, param2)
   *     on <event> ... end
   *   end
   */
  private parseBehaviorDefinition(): BehaviorNode {
    const pos = this.getPosition();

    // 'behavior' keyword should already be consumed
    // Now expect behavior name (must start with uppercase)
    // Phase 8: Use predicate-based consume
    const nameToken = this.consumeIdentifier("Expected behavior name after 'behavior' keyword");
    const behaviorName = nameToken.value;

    // Validate behavior name starts with uppercase
    if (!/^[A-Z]/.test(behaviorName)) {
      this.addError(`Behavior name must start with uppercase letter (got "${behaviorName}")`);
    }

    // Check for optional parameters: behavior Name(param1, param2)
    const parameters: string[] = [];
    if (this.match('(')) {
      // Parse parameter list
      if (!this.check(')')) {
        do {
          // Phase 8: Use predicate-based consume
          const paramToken = this.consumeIdentifier('Expected parameter name');
          parameters.push(paramToken.value);
        } while (this.match(','));
      }
      this.consume(')', "Expected ')' after behavior parameters");
    }

    // Parse behavior body: event handlers and optional init block
    const eventHandlers: EventHandlerNode[] = [];
    let initBlock: ASTNode | undefined;

    // Parse body until we hit 'end'
    while (!this.isAtEnd() && !this.check('end')) {
      if (this.match('on')) {
        // Parse event handler manually (not using parseEventHandler which is for top-level)
        const handlerPos = this.getPosition();

        // Get event name (current token after match consumed 'on')
        const eventToken = this.peek();
        const eventName = eventToken.value;
        this.advance(); // Now advance past the event name

        // Capture parameter list if present: (clientX, clientY)
        const eventArgs: string[] = [];
        if (this.check('(')) {
          this.advance(); // consume '('
          // Capture parameter names
          while (!this.isAtEnd() && !this.check(')')) {
            const paramToken = this.peek();
            if (isIdentifier(paramToken)) {
              eventArgs.push(paramToken.value);
              this.advance();

              // Check for comma separator
              if (this.check(',')) {
                this.advance();
              }
            } else {
              // Skip non-identifier tokens (shouldn't happen but be defensive)
              this.advance();
            }
          }

          // Consume closing parenthesis
          if (this.check(')')) {
            this.advance();
          }
        }

        // Capture event source if present: from <target>
        let eventSource: string | undefined;
        if (this.check('from')) {
          this.advance(); // consume 'from'
          // Capture target expression (could be 'the document', 'document', '#element', etc.)
          const targetTokens: string[] = [];

          if (this.check('the')) {
            this.advance(); // consume 'the'
          }

          // Capture the target identifier/selector
          if (!this.isAtEnd() && !this.checkIsCommand()) {
            const targetToken = this.peek();
            targetTokens.push(targetToken.value);
            eventSource = targetToken.value;
            this.advance();
          }
        }

        // Parse commands until we hit 'end'
        const handlerCommands: CommandNode[] = [];
        while (!this.isAtEnd() && !this.check('end')) {
          if (this.checkIsCommand() || this.isCommand(this.peek().value)) {
            this.advance(); // Consume command token

            // Save error state (following parseCommandSequence pattern)
            const savedError = this.error;

            try {
              const cmd = this.parseCommand();

              // Restore error state if command parsing added an error
              // This allows us to continue parsing even if a command has issues
              if (this.error && this.error !== savedError) {
                this.error = savedError;
              }

              handlerCommands.push(cmd);

              // Skip any unexpected tokens until next command or 'end'
              // (handles edge cases like extra whitespace tokens)
              while (
                !this.isAtEnd() &&
                !this.check('end') &&
                !this.checkIsCommand() &&
                !this.isCommand(this.peek().value)
              ) {
                this.advance();
              }
            } catch (error) {
              // If command parsing throws, restore error state and exit
              this.error = savedError;
              break;
            }
          } else {
            // Not a command token - should be at 'end' or something's wrong
            if (!this.check('end')) {
              this.addError(`Unexpected token in event handler: ${this.peek().value}`);
            }
            break;
          }
        }

        // Create event handler node with captured target and args
        const handlerNode: EventHandlerNode = {
          type: 'eventHandler',
          event: eventName,
          commands: handlerCommands,
          ...(eventSource !== undefined && { target: eventSource }), // Add the captured target from 'from' clause
          ...(eventArgs.length > 0 && { args: eventArgs }), // Add captured event parameters
          start: handlerPos.start,
          end: this.getPosition().end,
          line: handlerPos.line,
          column: handlerPos.column,
        };

        eventHandlers.push(handlerNode);

        // Expect 'end' after event handler body
        this.consume('end', "Expected 'end' after event handler body");
      } else if (this.match('init')) {
        // Parse init block
        const initCommands = this.parseCommandBlock(['end']);

        initBlock = {
          type: 'initBlock',
          commands: initCommands,
          start: pos.start,
          end: this.getPosition().end,
          line: pos.line,
          column: pos.column,
        };

        this.consume('end', "Expected 'end' after init block");
      } else {
        this.addError(`Unexpected token in behavior body: ${this.peek().value}`);
        break;
      }
    }

    // Consume final 'end'
    this.consume('end', "Expected 'end' to close behavior definition");

    // Create behavior node
    // Note: initBlock is conditionally included to satisfy exactOptionalPropertyTypes
    const behaviorNode: BehaviorNode = {
      type: 'behavior',
      name: behaviorName,
      parameters,
      eventHandlers,
      ...(initBlock !== undefined ? { initBlock } : {}),
      start: pos.start,
      end: this.getPosition().end,
      line: pos.line,
      column: pos.column,
    };

    return behaviorNode;
  }

  private parseCommandSequence(): ASTNode {
    const commands: CommandNode[] = [];

    // Parse commands separated by 'then' or newlines
    while (!this.isAtEnd()) {
      // Check if we have a command
      if (
        this.checkIsCommand() ||
        (this.isCommand(this.peek().value) && !this.isKeyword(this.peek().value))
      ) {
        this.advance(); // consume the command token

        // Save error state before parsing command
        const savedError = this.error;
        // Use parseCommand() instead of parseFullCommand() to handle special commands like 'repeat'
        const cmd = this.parseCommand();

        // Check if an error was added during parsing
        // Only restore error state for non-critical errors - preserve structural/syntax errors
        // Note: Be careful about what's considered "critical" - nested conditionals can trigger
        // temporary errors during parsing that get resolved
        if (this.error && this.error !== savedError) {
          // Only treat unclosed parentheses as critical (not 'Expected end' which can be false positive)
          const isCriticalError =
            this.error.message.includes('Expected closing parenthesis') ||
            this.error.message.includes("Expected ')'") ||
            this.error.message.includes('unclosed parenthes') ||
            this.error.message.includes('Unclosed parenthes');

          if (!isCriticalError) {
            debug.parse(
              '⚠️  parseCommandSequence: Command parsing added non-critical error, restoring error state. Error was:',
              this.error.message
            );
            this.error = savedError;
          }
        }

        commands.push(cmd);

        // Skip any unexpected tokens until we find 'then', a command, an event handler, or end
        // This handles cases where command parsing doesn't consume all its arguments (like HSL colors)
        while (
          !this.isAtEnd() &&
          !this.checkIsCommand() &&
          !this.isCommand(this.peek().value) &&
          !this.check('then') &&
          !this.check('on')
        ) {
          // Stop if we encounter an event handler
          debug.parse('⚠️  parseCommandSequence: Skipping unexpected token:', this.peek().value);
          this.advance(); // skip the unexpected token
        }

        // If we encountered an 'on' token, we're done with command sequence
        if (this.check('on')) {
          debug.parse(
            '✅ parseCommandSequence: Found "on" token, stopping command sequence to allow event handler parsing'
          );
          break;
        }

        // Check for optional 'then' separator
        if (this.match('then')) {
          continue; // Parse next command
        }

        // Check if next token is also a command (newline-separated)
        if (
          this.checkIsCommand() ||
          (this.isCommand(this.peek().value) && !this.isKeyword(this.peek().value))
        ) {
          continue; // Parse next command
        }

        // No more commands
        break;
      } else {
        this.addError(`Expected command, got: ${this.peek().value}`);
        break;
      }
    }

    // If we only have one command, return it directly
    if (commands.length === 1) {
      return commands[0];
    }

    // Return a CommandSequence node
    return {
      type: 'CommandSequence',
      commands: commands,
      start: commands[0]?.start || 0,
      end: commands[commands.length - 1]?.end || 0,
      line: commands[0]?.line || 1,
      column: commands[0]?.column || 1,
    };
  }

  /**
   * Get multi-word pattern definition for a command
   */
  private getMultiWordPattern(commandName: string): parsingHelpers.MultiWordPattern | null {
    return parsingHelpers.getMultiWordPattern(commandName);
  }

  /**
   * Check if current token is one of the specified keywords
   */
  private isTokenKeyword(token: Token | undefined, keywords: string[]): boolean {
    return parsingHelpers.isKeyword(token, keywords);
  }

  /**
   * Parse multi-word command with modifiers (e.g., "append X to Y", "fetch URL as json")
   * Returns null if this command doesn't use multi-word syntax
   */
  private parseMultiWordCommand(commandToken: Token, commandName: string): CommandNode | null {
    // Phase 9-3b: Delegate to extracted utility command parser
    return utilityCommands.parseMultiWordCommand(this.getContext(), commandToken, commandName);
  }

  /**
   * Parse a block of commands until one of the stop keywords is encountered
   * @param stopKeywords - Keywords that signal the end of the block
   * @returns Array of parsed command nodes
   */
  private parseCommandBlock(stopKeywords: string[]): CommandNode[] {
    const commands: CommandNode[] = [];
    while (!this.isAtEnd() && !stopKeywords.some(kw => this.check(kw))) {
      if (this.checkComment()) {
        this.advance();
        continue;
      }
      if (this.checkIsCommand() || this.isCommand(this.peek().value)) {
        this.advance();
        const cmd = this.parseCommand();
        commands.push(cmd);
      } else {
        break;
      }
    }
    return commands;
  }

  /**
   * Try semantic-first parsing for the current command.
   *
   * This method attempts to parse using the semantic analyzer when available.
   * If successful with sufficient confidence, returns the parsed command node.
   * Otherwise returns null to indicate fallback to traditional parsing.
   *
   * @param remainingInput The remaining input string from current position
   * @returns Parsed CommandNode if successful, null otherwise
   */
  private trySemanticParse(remainingInput: string): CommandNode | null {
    if (!this.semanticAdapter || !this.semanticAdapter.isAvailable()) {
      return null;
    }

    try {
      const result = this.semanticAdapter.trySemanticParse(remainingInput);

      if (result.success && result.node) {
        debug.parse(
          `[Semantic] Successfully parsed with confidence ${result.confidence}:`,
          result.node.name
        );

        // Update position tracking based on tokens consumed
        // For now, semantic parsing handles full command - traditional parser continues from here
        return result.node;
      }

      debug.parse(
        `[Semantic] Low confidence (${result.confidence}), falling back to traditional parser`
      );
      return null;
    } catch (error) {
      debug.parse('[Semantic] Error during semantic parse:', error);
      return null;
    }
  }

  /**
   * Get remaining input from current token position for semantic analysis.
   */
  private getRemainingInput(): string {
    if (!this.originalInput) {
      // Reconstruct from tokens if not stored
      return this.tokens
        .slice(this.current > 0 ? this.current - 1 : 0)
        .map(t => t.value)
        .join(' ');
    }

    // Get position from current token
    const currentToken = this.current > 0 ? this.tokens[this.current - 1] : this.tokens[0];
    if (currentToken && currentToken.start !== undefined) {
      return this.originalInput.slice(currentToken.start);
    }

    return this.originalInput;
  }

  /**
   * Skip tokens until a command boundary is reached.
   * Used after semantic parsing to sync token position with parsed content.
   * A command boundary is: then, and, else, end, or end of input.
   */
  private skipToCommandBoundary(): void {
    const boundaryKeywords = ['then', 'and', 'else', 'end'];
    while (!this.isAtEnd()) {
      const token = this.peek();
      const value = token.value.toLowerCase();
      // Stop at command boundary keywords
      if (boundaryKeywords.includes(value)) {
        break;
      }
      // Stop at command tokens (next command starting)
      if (isCommandPredicate(token)) {
        break;
      }
      // Stop at newline boundaries that might indicate command separation
      // (Handled implicitly by reaching end of relevant tokens)
      this.advance();
    }
  }

  private parseCommand(): CommandNode {
    // Try semantic-first parsing if available
    // Semantic parsing uses modifiers format ({args: [patient], modifiers: {into: dest}})
    // Command handlers now accept both formats via fallback logic

    // Commands with complex syntax that semantic parsing doesn't handle correctly yet
    // These must use traditional parsing until semantic schemas support their full syntax
    const commandToken = this.previous();
    let commandName = commandToken.value;
    const skipSemanticParsing: string[] = [
      // Commands with complex syntax that semantic parsing doesn't handle correctly yet:
      // - 'install' has complex 'install Behavior(param: value)' syntax with named params
      'install',
      // TODO: Add semantic parsing support for these commands
      // - 'wait' has complex multiline 'or' continuation and 'from' clauses
      'wait',
      // - 'repeat' has nested command blocks and 'until event X from Y' syntax
      'repeat',
      // - 'for' has nested command blocks (for x in collection)
      'for',
      // - 'set' has complex target expressions (possessive, CSS properties, etc.)
      'set',
      // - 'put' has complex positioning (at start/end of, before, after, into)
      'put',
      // - 'add' can have CSS object literals with special syntax
      'add',
      // Control flow commands:
      // - 'if'/'unless' via buildIfCommandNode with condition role
      'if',
      'unless',
      // Other commands with complex syntax:
      'make',
      'measure',
      'trigger',
      'halt',
      'remove',
      'exit',
      'return', // return can have complex expressions like 'return x + y'
      'closest',
      // Body-based commands that require traditional parsing:
      'js', // js ... end with body content
      'tell', // tell <target> <commands> with body
      // ✅ 'call'/'get' now supported via parseExpressionString() in SemanticIntegrationAdapter
      // which properly handles method calls like me.insertBefore(a, b)
    ];

    if (this.semanticAdapter && !skipSemanticParsing.includes(commandName.toLowerCase())) {
      const remainingInput = this.getRemainingInput();
      const semanticResult = this.trySemanticParse(remainingInput);
      if (semanticResult) {
        // Successfully parsed with semantic analyzer - advance token position
        // Skip all tokens until we reach a command boundary
        // This is necessary because semantic parsing operates on raw strings,
        // not the token stream, so we need to sync the token position
        this.skipToCommandBoundary();
        return semanticResult;
      }
      // Fall through to traditional parsing
    }

    // Note: commandToken already defined above from this.previous()
    // Re-read the command name (may have been modified above)

    // Handle special case for beep! command - check if beep is followed by !
    if (commandName === 'beep' && this.check('!')) {
      this.advance(); // consume the !
      commandName = 'beep!';
    }

    // Check if this is a multi-word command (append...to, fetch...as, etc.)
    const multiWordResult = this.parseMultiWordCommand(commandToken, commandName);
    if (multiWordResult) {
      return multiWordResult;
    }

    // Handle control flow commands
    const lowerName = commandName.toLowerCase();
    if (lowerName === 'repeat') {
      return this.parseRepeatCommand(commandToken);
    }
    if (lowerName === 'for') {
      return this.parseForCommand(commandToken);
    }
    if (lowerName === 'if' || lowerName === 'unless') {
      return this.parseIfCommand(commandToken);
    }
    if (lowerName === 'wait') {
      return this.parseWaitCommand(commandToken);
    }
    if (lowerName === 'install') {
      return this.parseInstallCommand(commandToken);
    }
    if (lowerName === 'transition') {
      return this.parseTransitionCommand(commandToken);
    }
    if (lowerName === 'add') {
      return this.parseAddCommand(commandToken);
    }

    // Delegate compound commands (put, trigger, remove, etc.) to their specialized parsers
    if (this.isCompoundCommand(lowerName)) {
      const identifierNode: IdentifierNode = {
        type: 'identifier',
        name: lowerName,
        start: commandToken.start || 0,
        end: commandToken.end || 0,
        line: commandToken.line,
        column: commandToken.column,
      };
      const result = this.parseCompoundCommand(identifierNode);
      return result || (this.createErrorNode() as unknown as CommandNode);
    }

    const args: ASTNode[] = [];

    // Special handling for increment/decrement commands with 'global' and 'by' syntax
    if ((commandName === 'increment' || commandName === 'decrement') && !this.isAtEnd()) {
      return variableCommands.parseIncrementDecrementCommand(this.getContext(), commandToken);
    }

    // Parse command arguments - continue until we hit a separator, end, or another command
    while (
      !this.isAtEnd() &&
      !this.check('then') &&
      !this.check('and') &&
      !this.check('else') &&
      !this.check('end') &&
      !this.checkIsCommand()
    ) {
      // Always use parseExpression for arguments to handle complex expressions
      // This allows for expressions like 'Result: ' + (#math-input's value as Math)
      const expr = this.parseExpression();
      if (expr) {
        args.push(expr);
      } else {
        // If parseExpression fails, try parsePrimary as fallback
        args.push(this.parsePrimary());
      }

      // For comma-separated arguments, consume the comma and continue
      if (this.match(',')) {
        // Comma-separated - continue to next argument
        continue;
      }

      // For hyperscript natural language syntax, continue if we see keywords that indicate more arguments
      // This handles patterns like "put X into Y", "add X to Y", "remove X from Y", "transition X over Yms", etc.
      const continuationKeywords = [
        'into',
        'from',
        'to',
        'with',
        'by',
        'at',
        'before',
        'after',
        'over',
      ];
      if (continuationKeywords.some(keyword => this.check(keyword))) {
        // Continue parsing - this is likely part of the command
        continue;
      }

      // Also continue if the previous argument was a continuation keyword
      // This handles the case where we just parsed "from" and need to parse the target
      const lastArg = args[args.length - 1];
      if (
        lastArg &&
        (lastArg.type === 'identifier' || lastArg.type === 'keyword') &&
        continuationKeywords.includes((lastArg as any).name || (lastArg as any).value)
      ) {
        // The previous argument was a continuation keyword, so continue parsing
        continue;
      }

      // No comma and no continuation context - this argument sequence is complete
      break;
    }

    const pos = this.getPosition();
    return {
      type: 'command',
      name: commandName,
      args: args as ExpressionNode[],
      isBlocking: false,
      start: pos.start,
      end: pos.end,
      line: pos.line,
      column: pos.column,
    };
  }

  private parseConditional(): ASTNode {
    const test = this.parseExpression();

    this.consume('then', "Expected 'then' after if condition");
    const consequent = this.parseConditionalBranch();

    let alternate: ASTNode | undefined;
    if (this.match('else')) {
      alternate = this.parseConditionalBranch();
    }

    const pos = this.getPosition();
    return {
      type: 'conditionalExpression',
      test,
      consequent,
      alternate,
      start: pos.start,
      end: pos.end,
      line: pos.line,
      column: pos.column,
    } as unknown as CommandNode; // TypeScript helper for complex conditional types
  }

  private parseConditionalBranch(): ASTNode {
    // Check if the next token is a command identifier
    if (this.checkIsCommand()) {
      // Parse as command directly
      const commandToken = this.advance();
      const identifierNode = this.createIdentifier(commandToken.value);
      const command = this.createCommandFromIdentifier(identifierNode);
      return command || identifierNode;
    }

    // Also check for IDENTIFIER tokens that are commands (backup)
    if (this.checkIdentifier() || this.checkKeyword()) {
      const token = this.peek();

      // Check if this identifier is a known command
      if (this.isCommand(token.value)) {
        // Parse as command
        const identifierToken = this.advance();
        const identifierNode = this.createIdentifier(identifierToken.value);
        const command = this.createCommandFromIdentifier(identifierNode);
        return command || identifierNode;
      }
    }

    // Otherwise parse as expression
    return this.parseExpression();
  }

  private parseNavigationFunction(funcName: string): CallExpressionNode {
    const args: ASTNode[] = [];

    // Handle "first of items", "closest <form/>", etc.
    if (this.match('of')) {
      args.push(this.parseExpression());
    } else if (this.check('(')) {
      // Standard function call syntax
      return this.finishCall(this.createIdentifier(funcName));
    } else if (
      !this.isAtEnd() &&
      !this.checkBasicOperator() &&
      !this.check('then') &&
      !this.check('else')
    ) {
      // Parse single argument (like selector)
      args.push(this.parsePrimary());
    }

    return this.createCallExpression(this.createIdentifier(funcName), args);
  }

  /**
   * Parse "the X of Y" pattern: the value of #element
   * Also handles "the first/last/etc <selector>" by delegating to navigation parsing
   * Returns a propertyOfExpression node or the parsed positional expression
   */
  private parseTheXofY(): ASTNode {
    // We've already consumed "the" token
    // Pattern: the <property> of <target>

    // Positional keywords that should be parsed as navigation functions
    // These are used in patterns like "the first <...>", "the last item"
    const positionalKeywords = ['first', 'last', 'next', 'previous', 'random', 'closest'];

    // Next should be the property name (e.g., "value", "innerHTML", etc.)
    if (!this.checkIdentifier()) {
      // Not a "the X of Y" pattern - return "the" as identifier
      return this.createIdentifier('the');
    }

    // Peek at the property name without consuming
    const nextToken = this.peek();
    const propertyName = nextToken.value;

    // If it's a positional keyword, parse it as a navigation function
    // "the" is just syntactic sugar before these keywords
    if (positionalKeywords.includes(propertyName)) {
      this.advance(); // consume the positional keyword
      // Parse the rest as a navigation function (like "first <#test-input/>")
      return this.parseNavigationFunction(propertyName);
    }

    // Lookahead: check if we have "property of" pattern
    // We need to peek TWO tokens ahead to see if there's an "of"
    const savedPosition = this.current;
    this.advance(); // consume property name

    if (!this.check('of')) {
      // Not the "the X of Y" pattern - backtrack
      this.current = savedPosition;
      return this.createIdentifier('the');
    }

    this.advance(); // consume "of"

    // Parse the target expression (e.g., #test-input)
    const target = this.parsePrimary();

    // Return a propertyOfExpression node
    return {
      type: 'propertyOfExpression',
      property: { type: 'identifier', name: propertyName },
      target: target,
      line: nextToken.line,
      column: nextToken.column,
    } as ASTNode;
  }

  private parseContextPropertyAccess(contextVar: 'me' | 'it' | 'you'): MemberExpressionNode {
    // Check for CSS property syntax: my *background-color (only applies to 'me')
    const hasCssPrefix = contextVar === 'me' && this.match('*');

    if (hasCssPrefix) {
      // Parse CSS property name with hyphens (e.g., background-color)
      let propertyName = '';

      if (!this.checkIdentifier()) {
        this.addError("Expected property name after 'my *'");
        return this.createMemberExpression(
          this.createIdentifier(contextVar),
          this.createIdentifier(''),
          false
        );
      }

      // Build the CSS property name (e.g., "background-color")
      propertyName = this.advance().value;

      // Handle hyphenated properties (background-color, border-width, etc.)
      while (this.check('-') && !this.isAtEnd()) {
        propertyName += '-';
        this.advance(); // consume '-'

        if (this.checkIdentifier()) {
          propertyName += this.advance().value;
        } else {
          this.addError('Expected identifier after hyphen in CSS property name');
          break;
        }
      }

      // Create member expression with computed-prefix for CSS properties
      // This tells the evaluator to use getComputedStyle
      const cssPropertyName = `computed-${propertyName}`;
      return this.createMemberExpression(
        this.createIdentifier(contextVar),
        this.createIdentifier(cssPropertyName),
        false
      );
    } else {
      // Standard JavaScript property access: my className, its value, your name
      // Phase 8: Use predicate-based consume
      const contextLabels = { me: 'my', it: 'its', you: 'your' };
      const property = this.consumeIdentifier(
        `Expected property name after '${contextLabels[contextVar]}'`
      );
      return this.createMemberExpression(
        this.createIdentifier(contextVar),
        this.createIdentifier(property.value),
        false
      );
    }
  }

  // Alias for backward compatibility
  private parseMyPropertyAccess(): MemberExpressionNode {
    return this.parseContextPropertyAccess('me');
  }

  private finishCall(callee: ASTNode): CallExpressionNode {
    const args: ASTNode[] = [];

    if (!this.check(')')) {
      do {
        // Check for invalid syntax: leading or consecutive commas
        if (this.check(',')) {
          this.addError('Unexpected token in function arguments');
          return this.createCallExpression(callee, [this.createErrorNode()]);
        }
        args.push(this.parseExpression());
      } while (this.match(','));
    }

    // Check for CSS function with space-separated values (common mistake)
    // e.g., hsl(265 60% 65%) should be quoted: 'hsl(265 60% 65%)'
    if (!this.check(')') && callee.type === 'identifier') {
      const funcName = (callee as IdentifierNode).name;
      if (CommandClassification.isCSSFunction(funcName)) {
        debug.parse(
          `💡 Tip: CSS functions like ${funcName}() should be quoted for clean parsing. ` +
            `Use '${funcName}(...)' or \`${funcName}(...)\` instead.`
        );
      }
    }

    this.consume(')', "Expected ')' after arguments");
    return this.createCallExpression(callee, args);
  }

  // Helper methods for AST node creation (Phase 9-2: using ast-helpers module)
  private createLiteral(value: unknown, raw: string): LiteralNode {
    return astHelpers.createLiteral(value, raw, this.getPosition());
  }

  private createIdentifier(name: string): IdentifierNode {
    return astHelpers.createIdentifier(name, this.getPosition());
  }

  private createBinaryExpression(
    operator: string,
    left: ASTNode,
    right: ASTNode
  ): BinaryExpressionNode {
    return astHelpers.createBinaryExpression(operator, left, right, this.getPosition());
  }

  private createUnaryExpression(
    operator: string,
    argument: ASTNode,
    prefix: boolean
  ): UnaryExpressionNode {
    return astHelpers.createUnaryExpression(operator, argument, prefix, this.getPosition());
  }

  private createCallExpression(callee: ASTNode, args: ASTNode[]): CallExpressionNode {
    return astHelpers.createCallExpression(callee, args, this.getPosition());
  }

  private createMemberExpression(
    object: ASTNode,
    property: ASTNode,
    computed: boolean
  ): MemberExpressionNode {
    return astHelpers.createMemberExpression(object, property, computed, this.getPosition());
  }

  private createSelector(value: string): SelectorNode {
    return astHelpers.createSelector(value, this.getPosition());
  }

  private createPossessiveExpression(object: ASTNode, property: ASTNode): PossessiveExpressionNode {
    return astHelpers.createPossessiveExpression(object, property, this.getPosition());
  }

  private createErrorNode(): IdentifierNode {
    return astHelpers.createErrorNode(this.getPosition());
  }

  /**
   * Process escape sequences in a string (like \n, \t, etc.)
   */
  private processEscapeSequences(str: string): string {
    return str.replace(/\\(.)/g, (_match, char) => {
      switch (char) {
        case 'n':
          return '\n';
        case 't':
          return '\t';
        case 'r':
          return '\r';
        case 'b':
          return '\b';
        case 'f':
          return '\f';
        case 'v':
          return '\v';
        case '0':
          return '\0';
        case '\\':
          return '\\';
        case '"':
          return '"';
        case "'":
          return "'";
        default:
          return char; // Return the character as-is for unknown escapes
      }
    });
  }

  /**
   * Create a Program node that contains multiple top-level statements
   * (e.g., commands followed by event handlers)
   */
  private createProgramNode(statements: ASTNode[]): ASTNode {
    return astHelpers.createProgramNode(statements);
  }

  // Token manipulation methods
  private match(...types: string[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private matchOperator(operator: string): boolean {
    if (this.isAtEnd()) return false;
    const token = this.peek();
    if (isBasicOperator(token) && token.value === operator) {
      this.advance();
      return true;
    }
    return false;
  }

  private check(value: string): boolean {
    if (this.isAtEnd()) return false;
    const tokenValue = this.peek().value;
    // Resolve the token value to English before comparing
    const resolved = this.resolveKeyword(tokenValue);
    return resolved === value;
  }

  // ============================================================================
  // PREDICATE-BASED TOKEN CHECKING (Phase 4)
  // These methods use token predicates for semantic classification,
  // enabling migration from TokenType enum checks to predicate functions.
  // ============================================================================

  /**
   * Check if current token satisfies a predicate
   */
  private checkPredicate(predicate: (token: Token) => boolean): boolean {
    if (this.isAtEnd()) return false;
    return predicate(this.peek());
  }

  /**
   * Match and advance if current token satisfies a predicate
   */
  private matchPredicate(predicate: (token: Token) => boolean): boolean {
    if (this.checkPredicate(predicate)) {
      this.advance();
      return true;
    }
    return false;
  }

  /**
   * Check if current token is a basic selector (ID, class, or CSS selector)
   * Note: Use this when query references need separate handling
   */
  private checkSelector(): boolean {
    return this.checkPredicate(isBasicSelector);
  }

  /**
   * Match and advance if current token is a basic selector
   * Note: Use this when query references need separate handling
   */
  private matchSelector(): boolean {
    return this.matchPredicate(isBasicSelector);
  }

  /**
   * Check if current token is any selector including query reference
   */
  private checkAnySelector(): boolean {
    return this.checkPredicate(isSelector);
  }

  /**
   * Check if current token is a literal (string, number, boolean, template)
   */
  private checkLiteral(): boolean {
    return this.checkPredicate(isLiteral);
  }

  /**
   * Check if current token is identifier-like (identifier, keyword, command, event, context var)
   */
  private checkIdentifierLike(): boolean {
    return this.checkPredicate(isIdentifierLike);
  }

  /**
   * Check if current token is a command (by type or by value)
   */
  private checkIsCommand(): boolean {
    return this.checkPredicate(isCommandPredicate);
  }

  /**
   * Check if current token is a command terminator (then, and, else, end, on)
   */
  private checkCommandTerminator(): boolean {
    return this.checkPredicate(isCommandTerminator);
  }

  /**
   * Check if current token is a reference (context var, global var, or identifier)
   */
  private checkReference(): boolean {
    return this.checkPredicate(isReference);
  }

  /**
   * Check if current token is a time expression (5s, 100ms)
   */
  private checkTimeExpression(): boolean {
    return this.checkPredicate(isTimeExpression);
  }

  /**
   * Check if current token is a DOM event
   */
  private checkEvent(): boolean {
    return this.checkPredicate(isEvent);
  }

  /**
   * Check if current token is a context variable (me, it, you, result, etc.)
   */
  private checkContextVar(): boolean {
    return this.checkPredicate(isContextVar);
  }

  // ============================================================================
  // SPECIFIC TYPE PREDICATE HELPERS (Phase 7)
  // These enable full TokenType removal from parser.ts
  // ============================================================================

  private checkComment(): boolean {
    return this.checkPredicate(isComment);
  }

  private checkIdentifier(): boolean {
    return this.checkPredicate(isIdentifier);
  }

  private checkKeyword(): boolean {
    return this.checkPredicate(isKeywordPredicate);
  }

  private checkString(): boolean {
    return this.checkPredicate(isString);
  }

  private matchString(): boolean {
    return this.matchPredicate(isString);
  }

  private checkNumber(): boolean {
    return this.checkPredicate(isNumber);
  }

  private matchNumber(): boolean {
    return this.matchPredicate(isNumber);
  }

  private checkBoolean(): boolean {
    return this.checkPredicate(isBoolean);
  }

  private matchBoolean(): boolean {
    return this.matchPredicate(isBoolean);
  }

  private checkTemplateLiteral(): boolean {
    return this.checkPredicate(isTemplateLiteral);
  }

  private matchTemplateLiteral(): boolean {
    return this.matchPredicate(isTemplateLiteral);
  }

  private checkQueryReference(): boolean {
    return this.checkPredicate(isQueryReference);
  }

  private matchQueryReference(): boolean {
    return this.matchPredicate(isQueryReference);
  }

  private checkIdSelector(): boolean {
    return this.checkPredicate(isIdSelector);
  }

  private checkClassSelector(): boolean {
    return this.checkPredicate(isClassSelector);
  }

  private checkCssSelector(): boolean {
    return this.checkPredicate(isCssSelector);
  }

  private checkBasicOperator(): boolean {
    return this.checkPredicate(isBasicOperator);
  }

  private matchBasicOperator(): boolean {
    return this.matchPredicate(isBasicOperator);
  }

  private matchTimeExpression(): boolean {
    return this.matchPredicate(isTimeExpression);
  }

  private matchIdentifierLike(): boolean {
    return this.matchPredicate(isIdentifierLike);
  }

  private matchComparisonOperator(): boolean {
    return this.matchPredicate(isComparisonOperator);
  }

  // ============================================================================
  // PREDICATE-BASED CONSUME METHODS (Phase 8)
  // These replace consume(TokenType.X, ...) calls with predicate-based checks
  // ============================================================================

  /**
   * Consume a token if it satisfies the predicate, otherwise add error
   */
  private consumePredicate(predicate: (token: Token) => boolean, message: string): Token {
    if (this.checkPredicate(predicate)) {
      return this.advance();
    }
    this.addError(message);
    return this.peek();
  }

  /**
   * Consume an identifier token
   */
  private consumeIdentifier(message: string): Token {
    return this.consumePredicate(isIdentifier, message);
  }

  /**
   * Consume an event token
   */
  private consumeEvent(message: string): Token {
    return this.consumePredicate(isEvent, message);
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.current >= this.tokens.length;
  }

  private peek(): Token {
    if (this.isAtEnd()) {
      // Return a dummy EOF token - Phase 8: Use kind instead of type
      return { kind: 'unknown', value: '', start: 0, end: 0, line: 1, column: 1 };
    }
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  /**
   * Consume a token with the expected string value
   * Phase 8: Simplified to string-only - use consumeIdentifier/consumeEvent for type-based checks
   */
  private consume(expected: string, message: string): Token {
    if (this.check(expected)) {
      return this.advance();
    }
    this.addError(message);
    return this.peek();
  }

  private addError(message: string): void {
    const token = this.peek();
    let position = token.start || 0;
    let line = token.line || 1;
    let column = token.column || 1;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Tracked for future error enhancement
    let errorToken = token;

    // For property access errors after '.', position should be after the dot
    if (message.includes("property name after '.'")) {
      const previousToken = this.current > 0 ? this.previous() : token;
      errorToken = previousToken;
      position = previousToken.end || previousToken.start || 0;
      line = previousToken.line || 1;
      column = previousToken.column || 1;
    }

    // For unclosed parentheses, use current position
    if (message.includes('parenthes')) {
      // Position should be where the error was detected
      const currentPos = this.current > 0 ? this.previous() : token;
      errorToken = currentPos;
      position = currentPos.end || currentPos.start || 0;
      line = currentPos.line || 1;
      column = currentPos.column || 1;
      if (position === 0 && this.current > 0) {
        position = this.current; // Use token index as fallback
      }
    }

    // For trailing operators, position should be at the operator
    if (message.includes('Expected expression after')) {
      const previousToken = this.current > 0 ? this.previous() : token;
      errorToken = previousToken;
      position = previousToken.start || 0;
      line = previousToken.line || 1;
      column = previousToken.column || 1;
      // Use a reasonable position if token positions aren't available
      if (position === 0) {
        position = Math.max(1, this.current - 1);
      }
    }

    // For missing operands, find the token at the beginning of the expression
    if (message.includes('Missing operand')) {
      // Try to find a token that better represents where the error occurred
      let bestToken = token;
      for (let i = this.current - 1; i >= 0; i--) {
        const checkToken = this.tokens[i];
        if (checkToken && (checkToken.value === '+' || checkToken.value === '-')) {
          bestToken = checkToken;
          break;
        }
      }
      errorToken = bestToken;
      position = bestToken.start || 0;
      line = bestToken.line || 1;
      column = bestToken.column || 1;
    }

    this.error = {
      message,
      line: Math.max(1, line),
      column: Math.max(1, column),
      position: Math.max(0, position),
    };
  }

  private parseAttributeOrArrayLiteral(): ASTNode {
    // We've already consumed the '['
    const startPos = this.previous().start;
    const startLine = this.previous().line;
    const startColumn = this.previous().column;

    // Check if this is an attribute literal: [@attr="value"]
    // The next token should start with '@'
    if (!this.isAtEnd() && this.peek().value.startsWith('@')) {
      // Attribute literal syntax - collect all tokens until ']'
      const tokens: string[] = [];

      while (!this.check(']') && !this.isAtEnd()) {
        const token = this.advance();
        tokens.push(token.value);
      }

      this.consume(']', "Expected ']' after attribute literal");

      // Reconstruct the full attribute literal string: [@attr="value"]
      const attributeString = '[' + tokens.join('') + ']';

      // Return as a string literal that the ADD command can parse
      return {
        type: 'literal',
        value: attributeString,
        raw: attributeString,
        start: startPos,
        end: this.previous().end,
        line: startLine,
        column: startColumn,
      };
    }

    // Otherwise, parse as array literal: [1, 2, 3]
    const elements: ASTNode[] = [];

    if (!this.check(']')) {
      do {
        if (this.check(']')) break; // Allow trailing comma
        elements.push(this.parseExpression());
      } while (this.match(','));
    }

    this.consume(']', "Expected ']' after array elements");

    return {
      type: 'arrayLiteral',
      elements,
      start: startPos,
      end: this.previous().end,
      line: startLine,
      column: startColumn,
    };
  }

  private getPosition() {
    const token = this.current > 0 ? this.previous() : this.peek();
    return {
      start: token.start || 0,
      end: token.end || 0,
      line: token.line || 1,
      column: token.column || 1,
    };
  }

  /**
   * Get ParserContext for command parsers
   *
   * This method creates a ParserContext object that exposes parser functionality
   * to command parsers without exposing the Parser class internals.
   * All methods are bound to the Parser instance.
   *
   * Phase 9-3a: ParserContext Implementation
   */
  getContext(): import('./parser-types').ParserContext {
    const parser = this;
    const ctx = {
      // Token Stream Access (Read-Only)
      tokens: this.tokens,
      // Note: 'current' is added below via Object.defineProperty for getter/setter

      // Token Navigation Methods (Phase 8: removed deprecated checkTokenType)
      advance: this.advance.bind(this),
      peek: this.peek.bind(this),
      previous: this.previous.bind(this),
      consume: this.consume.bind(this),
      check: this.check.bind(this),

      // Predicate-Based Token Checking (Phase 4)
      checkIdentifierLike: this.checkIdentifierLike.bind(this),
      checkSelector: this.checkSelector.bind(this),
      checkAnySelector: this.checkAnySelector.bind(this),
      checkLiteral: this.checkLiteral.bind(this),
      checkReference: this.checkReference.bind(this),
      checkTimeExpression: this.checkTimeExpression.bind(this),
      checkEvent: this.checkEvent.bind(this),
      checkIsCommand: this.checkIsCommand.bind(this),
      checkContextVar: this.checkContextVar.bind(this),

      match: this.match.bind(this),
      // Phase 8: removed deprecated matchTokenType
      matchOperator: this.matchOperator.bind(this),
      isAtEnd: this.isAtEnd.bind(this),

      // AST Node Creation (11 methods)
      createIdentifier: this.createIdentifier.bind(this),
      createLiteral: this.createLiteral.bind(this),
      createSelector: this.createSelector.bind(this),
      createBinaryExpression: this.createBinaryExpression.bind(this),
      createUnaryExpression: this.createUnaryExpression.bind(this),
      createMemberExpression: this.createMemberExpression.bind(this),
      createPossessiveExpression: this.createPossessiveExpression.bind(this),
      createCallExpression: this.createCallExpression.bind(this),
      createErrorNode: this.createErrorNode.bind(this),
      createProgramNode: this.createProgramNode.bind(this),
      createCommandFromIdentifier: this.createCommandFromIdentifier.bind(this),

      // Expression Parsing (18 methods)
      parseExpression: this.parseExpression.bind(this),
      parsePrimary: this.parsePrimary.bind(this),
      parseCall: this.parseCall.bind(this),
      parseAssignment: this.parseAssignment.bind(this),
      parseLogicalOr: this.parseLogicalOr.bind(this),
      parseLogicalAnd: this.parseLogicalAnd.bind(this),
      parseEquality: this.parseEquality.bind(this),
      parseComparison: this.parseComparison.bind(this),
      parseAddition: this.parseAddition.bind(this),
      parseMultiplication: this.parseMultiplication.bind(this),
      parseImplicitBinary: this.parseImplicitBinary.bind(this),
      parseConditional: this.parseConditional.bind(this),
      parseConditionalBranch: this.parseConditionalBranch.bind(this),
      parseEventHandler: this.parseEventHandler.bind(this),
      parseBehaviorDefinition: this.parseBehaviorDefinition.bind(this),
      parseNavigationFunction: this.parseNavigationFunction.bind(this),
      parseMyPropertyAccess: this.parseMyPropertyAccess.bind(this),
      parseDollarExpression: this.parseDollarExpression.bind(this),
      parseHyperscriptSelector: this.parseHyperscriptSelector.bind(this),
      parseAttributeOrArrayLiteral: this.parseAttributeOrArrayLiteral.bind(this),
      parseObjectLiteral: this.parseObjectLiteral.bind(this),
      parseCSSObjectLiteral: this.parseCSSObjectLiteral.bind(this),

      // Command Sequence Parsing (3 methods)
      parseCommand: this.parseCommand.bind(this),
      parseCommandSequence: this.parseCommandSequence.bind(this),
      parseCommandListUntilEnd: this.parseCommandListUntilEnd.bind(this),

      // Position Tracking (1 method)
      getPosition: this.getPosition.bind(this),

      // Error Handling (2 methods)
      addError: this.addError.bind(this),
      addWarning: this.addWarning.bind(this),

      // Utility Functions (5 methods)
      isCommand: this.isCommand.bind(this),
      isCompoundCommand: this.isCompoundCommand.bind(this),
      isKeyword: this.isKeyword.bind(this),
      getMultiWordPattern: this.getMultiWordPattern.bind(this),
      resolveKeyword: this.resolveKeyword.bind(this),

      // Raw Input Access (for preserving literal code like JS in js...end blocks)
      getInputSlice: (start: number, end?: number): string => {
        if (!this.originalInput) return '';
        if (start < 0 || start >= this.originalInput.length) return '';
        return end !== undefined
          ? this.originalInput.slice(start, end)
          : this.originalInput.slice(start);
      },
    } as unknown as import('./parser-types').ParserContext;

    // Add 'current' as getter/setter that syncs with parser's position
    // This fixes the bug where ctx.current = savedPosition didn't restore parser state
    Object.defineProperty(ctx, 'current', {
      get: () => parser.current,
      set: (value: number) => {
        parser.current = value;
      },
      enumerable: true,
      configurable: true,
    });

    return ctx;
  }
}

// Main parse function
export function parse(input: string, options?: ParserOptions): ParseResult {
  const tokens = tokenize(input);
  const parser = new Parser(tokens, options, input);
  const result = parser.parse();
  return result;
}
