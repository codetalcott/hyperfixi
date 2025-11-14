/**
 * Hyperscript Parser
 * Converts tokens into Abstract Syntax Tree (AST)
 * Handles hyperscript's unique natural language syntax
 */

import { tokenize, TokenType } from './tokenizer';
import type {
  Token,
  ASTNode,
  CommandNode,
  ExpressionNode,
  ParseResult as CoreParseResult,
  ParseError as CoreParseError,
  ParseWarning,
  EventHandlerNode,
  BehaviorNode,
} from '../types/core';
import { debug } from '../utils/debug';

// Use core types for consistency
export type ParseResult = CoreParseResult;
export type ParseError = CoreParseError;

// Additional AST node types for hyperscript-specific constructs
interface LiteralNode extends ASTNode {
  type: 'literal';
  value: unknown;
  raw: string;
}

interface IdentifierNode extends ASTNode {
  type: 'identifier';
  name: string;
}

interface BinaryExpressionNode extends ASTNode {
  type: 'binaryExpression';
  operator: string;
  left: ASTNode;
  right: ASTNode;
}

interface UnaryExpressionNode extends ASTNode {
  type: 'unaryExpression';
  operator: string;
  argument: ASTNode;
  prefix: boolean;
}

interface CallExpressionNode extends ASTNode {
  type: 'callExpression';
  callee: ASTNode;
  arguments: ASTNode[];
}

interface MemberExpressionNode extends ASTNode {
  type: 'memberExpression';
  object: ASTNode;
  property: ASTNode;
  computed: boolean;
}

interface SelectorNode extends ASTNode {
  type: 'selector';
  value: string;
}

interface PossessiveExpressionNode extends ASTNode {
  type: 'possessiveExpression';
  object: ASTNode;
  property: ASTNode;
}

// interface ObjectLiteralNode extends ASTNode {
//   type: 'objectLiteral';
//   properties: Array<{ key: ASTNode; value: ASTNode }>;
// }

export class Parser {
  private tokens: Token[];
  private current: number = 0;
  private error: ParseError | undefined;
  private warnings: ParseWarning[] = [];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  /**
   * Add a warning to the parser output
   */
  private addWarning(warning: ParseWarning): void {
    this.warnings.push(warning);
  }

  parse(): ParseResult {
    // debug.parse('🚀 PARSER: Parser.parse() method called', {
    // tokenCount: this.tokens.length,
    // firstToken: this.tokens[0]?.value,
    // firstTokenType: this.tokens[0]?.type
    // });

    try {
      // Handle empty input
      if (this.tokens.length === 0) {
        // debug.parse('❌ PARSER: empty input detected');
        this.addError('Cannot parse empty input');
        return {
          success: false,
          node: this.createErrorNode(),
          tokens: this.tokens,
          error: this.error!,
          warnings: this.warnings,
        };
      }

      // Check if this is a behavior definition
      if (this.check('behavior')) {
        this.advance(); // consume 'behavior' keyword
        const behaviorNode = this.parseBehaviorDefinition();

        if (this.error) {
          return {
            success: false,
            node: behaviorNode || this.createErrorNode(),
            tokens: this.tokens,
            error: this.error,
            warnings: this.warnings,
          };
        }

        return {
          success: true,
          node: behaviorNode,
          tokens: this.tokens,
          warnings: this.warnings,
        };
      }

      // Check if this looks like a command sequence (starts with command)
      // debug.parse('🔍 PARSER: checking if command sequence', {
      // isCommandToken: this.checkTokenType(TokenType.COMMAND),
      // isCommandValue: this.isCommand(this.peek().value),
      // isKeyword: this.isKeyword(this.peek().value),
      // firstTokenValue: this.peek().value
      // });

      if (
        this.checkTokenType(TokenType.COMMAND) ||
        (this.isCommand(this.peek().value) && !this.isKeyword(this.peek().value))
      ) {
        // debug.parse('✅ PARSER: confirmed command sequence, calling parseCommandSequence');

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
      this.matchTokenType(TokenType.COMPARISON_OPERATOR) ||
      this.match('is', 'matches', 'contains', 'include', 'includes', 'in', 'of', 'as', 'really')
    ) {
      const operator = this.previous().value;
      const right = this.parseComparison();
      expr = this.createBinaryExpression(operator, expr, right);
    }

    return expr;
  }

  private parseComparison(): ASTNode {
    let expr = this.parseAddition();

    while (this.matchTokenType(TokenType.COMPARISON_OPERATOR)) {
      const operator = this.previous().value;
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
    if (this.match('not', 'no', '-', '+')) {
      const operator = this.previous().value;

      // Only flag as missing operand if this starts a complex expression and lacks proper context
      // Valid unary: "-5", "not true", "no value", "+number"
      // Invalid: "5 + + 3" (handled elsewhere), standalone "+" (handled below)
      if (this.isAtEnd()) {
        this.addError(`Expected expression after '${operator}' operator`);
        return this.createErrorNode();
      }

      const expr = this.parseUnary();
      return this.createUnaryExpression(operator, expr, true);
    }

    return this.parseImplicitBinary();
  }

  private parseImplicitBinary(): ASTNode {
    let expr = this.parseCall();

    // Handle implicit binary expressions like "command selector" OR commands with arguments
    while (
      !this.isAtEnd() &&
      !this.checkTokenType(TokenType.OPERATOR) &&
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
              this.checkTokenType(TokenType.CSS_SELECTOR) ||
              this.checkTokenType(TokenType.ID_SELECTOR) ||
              this.checkTokenType(TokenType.CLASS_SELECTOR) ||
              this.checkTokenType(TokenType.TIME_EXPRESSION) ||
              this.checkTokenType(TokenType.STRING) ||
              this.checkTokenType(TokenType.NUMBER) ||
              this.checkTokenType(TokenType.CONTEXT_VAR) ||
              this.checkTokenType(TokenType.IDENTIFIER) ||
              this.checkTokenType(TokenType.KEYWORD)
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
            if (commandName === 'wait' && this.checkTokenType(TokenType.TIME_EXPRESSION)) {
              // wait with time expression should be a command
              const command = this.createCommandFromIdentifier(expr as IdentifierNode);
              if (command) {
                expr = command;
              }
            } else if (
              this.checkTokenType(TokenType.CSS_SELECTOR) ||
              this.checkTokenType(TokenType.ID_SELECTOR) ||
              this.checkTokenType(TokenType.CLASS_SELECTOR)
            ) {
              // Other simple commands with selectors become binary expressions
              const right = this.parseCall();
              expr = this.createBinaryExpression(' ', expr, right);
            } else {
              break;
            }
          }
        } else {
          // Not a command - handle as regular identifier followed by selector
          if (
            this.checkTokenType(TokenType.CSS_SELECTOR) ||
            this.checkTokenType(TokenType.ID_SELECTOR) ||
            this.checkTokenType(TokenType.CLASS_SELECTOR)
          ) {
            const right = this.parseCall();
            expr = this.createBinaryExpression(' ', expr, right);
          } else {
            break;
          }
        }
      } else if (
        expr.type === 'literal' &&
        (this.checkTokenType(TokenType.NUMBER) || this.checkTokenType(TokenType.IDENTIFIER))
      ) {
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
    // Check if the name is in the COMMANDS set from tokenizer
    const COMMANDS = new Set([
      'add',
      'append',
      'async',
      'beep',
      'break',
      'call',
      'continue',
      'decrement',
      'default',
      'exit',
      'fetch',
      'get',
      'go',
      'halt',
      'hide',
      'if',
      'increment',
      'install',
      'js',
      'log',
      'make',
      'measure',
      'pick',
      'put',
      'remove',
      'render',
      'repeat',
      'return',
      'send',
      'set',
      'settle',
      'show',
      'take',
      'tell',
      'throw',
      'toggle',
      'transition',
      'trigger',
      'unless',
      'wait',
    ]);
    return COMMANDS.has(name.toLowerCase());
  }

  private isKeyword(name: string): boolean {
    // Check if the name is in the KEYWORDS set from tokenizer
    const KEYWORDS = new Set([
      'if',
      'else',
      'unless',
      'for',
      'while',
      'until',
      'end',
      'and',
      'or',
      'not',
      'in',
      'to',
      'from',
      'into',
      'with',
      'without',
      'as',
      'matches',
      'contains',
      'then',
      'on',
      'when',
      'every',
      'init',
      'def',
      'behavior',
      'the',
      'of',
      'first',
      'last',
      'next',
      'previous',
      'closest',
      'within',
      'pseudo',
      'async',
      'await',
    ]);
    return KEYWORDS.has(name.toLowerCase());
  }

  private createCommandFromIdentifier(identifierNode: IdentifierNode): CommandNode | null {
    const args: ASTNode[] = [];
    const commandName = identifierNode.name.toLowerCase();

    if (this.isCompoundCommand(commandName)) {
      return this.parseCompoundCommand(identifierNode);
    }

    // Parse command arguments (space-separated, not comma-separated)
    while (
      !this.isAtEnd() &&
      !this.check('then') &&
      !this.check('and') &&
      !this.check('else') &&
      !this.checkTokenType(TokenType.COMMAND)
    ) {
      if (
        this.checkTokenType(TokenType.CONTEXT_VAR) ||
        this.checkTokenType(TokenType.IDENTIFIER) ||
        this.checkTokenType(TokenType.KEYWORD) || // Add KEYWORD support for words like "into"
        this.checkTokenType(TokenType.CSS_SELECTOR) ||
        this.checkTokenType(TokenType.ID_SELECTOR) ||
        this.checkTokenType(TokenType.CLASS_SELECTOR) ||
        this.checkTokenType(TokenType.STRING) ||
        this.checkTokenType(TokenType.NUMBER) ||
        this.checkTokenType(TokenType.TIME_EXPRESSION) ||
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
    // Added 'set' back to use the sophisticated parseSetCommand method for "the X of Y" syntax
    // Added 'show' and 'hide' to ensure they parse as commands with selector arguments
    // Added 'halt' to handle "halt the event" syntax with special parsing
    const compoundCommands = [
      'put',
      'trigger',
      'remove',
      'take',
      'toggle',
      'set',
      'show',
      'hide',
      'add',
      'halt',
    ];
    return compoundCommands.includes(commandName);
  }

  private parseCompoundCommand(identifierNode: IdentifierNode): CommandNode | null {
    const commandName = identifierNode.name.toLowerCase();
    // debug.parse('🎯 PARSER: parseCompoundCommand called', {
    // commandName,
    // originalName: identifierNode.name,
    // isSetCommand: commandName === 'set'
    // });

    switch (commandName) {
      case 'put':
        return this.parsePutCommand(identifierNode);
      case 'trigger':
        return this.parseTriggerCommand(identifierNode);
      case 'remove':
        return this.parseRemoveCommand(identifierNode);
      case 'toggle':
        return this.parseToggleCommand(identifierNode);
      case 'set':
        return this.parseSetCommand(identifierNode);
      case 'halt':
        return this.parseHaltCommand(identifierNode);
      default:
        // Fallback to regular parsing
        return this.parseRegularCommand(identifierNode);
    }
  }

  private parsePutCommand(identifierNode: IdentifierNode): CommandNode | null {
    // Use a more flexible approach similar to the original _hyperscript
    // Parse all arguments until we hit a terminator, then identify the structure
    const allArgs: ASTNode[] = [];

    while (
      !this.isAtEnd() &&
      !this.check('then') &&
      !this.check('and') &&
      !this.check('else') &&
      !this.check('end') &&
      !this.checkTokenType(TokenType.COMMAND)
    ) {
      allArgs.push(this.parsePrimary());
    }

    // Now find the operation keyword and restructure
    let operationIndex = -1;
    let operationKeyword = '';

    for (let i = 0; i < allArgs.length; i++) {
      const arg = allArgs[i];
      // Check for identifier, literal, AND keyword types for operation keywords
      const argValue = (arg as any).name || (arg as any).value;
      if (
        (arg.type === 'identifier' || arg.type === 'literal' || arg.type === 'keyword') &&
        [
          'into',
          'before',
          'after',
          'at',
          'at start of',
          'at end of',
          'at the start of',
          'at the end of',
        ].includes(argValue)
      ) {
        operationIndex = i;
        operationKeyword = argValue;
        // debug.parse('🔍 PARSER: found operation keyword', { arg, operationKeyword, type: arg.type });
        break;
      }
    }

    if (operationIndex === -1) {
      // debug.parse('⚠️ PARSER: no operation keyword found');
      // Return all args as-is (fallback)
      return {
        type: 'command',
        name: identifierNode.name,
        args: allArgs as ExpressionNode[],
        isBlocking: false,
        start: identifierNode.start || 0,
        end: this.getPosition().end,
        line: identifierNode.line || 1,
        column: identifierNode.column || 1,
      };
    }

    // debug.parse('🔍 PARSER: found operation keyword', { operationKeyword, operationIndex });

    // Restructure: [content_args...] + [operation] + [target_args...]
    const contentArgs = allArgs.slice(0, operationIndex);
    const targetArgs = allArgs.slice(operationIndex + 1);

    // Build final args: content, operation, target
    const finalArgs: ASTNode[] = [];

    // Content (could be multiple parts, combine if needed)
    if (contentArgs.length === 1) {
      finalArgs.push(contentArgs[0]);
    } else if (contentArgs.length > 1) {
      // Multiple content parts - keep as separate args for now
      finalArgs.push(...contentArgs);
    }

    // Operation keyword
    finalArgs.push(this.createIdentifier(operationKeyword));

    // Target (could be multiple parts, combine if needed)
    if (targetArgs.length === 1) {
      finalArgs.push(targetArgs[0]);
    } else if (targetArgs.length > 1) {
      // Multiple target parts - keep as separate args for now
      finalArgs.push(...targetArgs);
    }

    const result = {
      type: 'command' as const,
      name: identifierNode.name,
      args: finalArgs as ExpressionNode[],
      isBlocking: false,
      start: identifierNode.start || 0,
      end: this.getPosition().end,
      line: identifierNode.line || 1,
      column: identifierNode.column || 1,
    };

    // debug.parse('✅ PARSER: parsePutCommand completed', {
    // result,
    // argCount: finalArgs.length,
    // finalArgs: finalArgs.map(a => ({ type: a.type, value: (a as any).value || (a as any).name }))
    // });

    return result;
  }

  private parseSetCommand(identifierNode: IdentifierNode): CommandNode | null {
    // SIMPLIFIED APPROACH: Try to parse target as a single expression first
    const startPosition = this.current;
    let targetExpression: ASTNode | null = null;

    try {
      // Check for local variable prefix `:` FIRST (before any other parsing)
      if (this.check(':')) {
        this.advance(); // consume `:`
        const varToken = this.advance(); // get variable name
        targetExpression = {
          type: 'identifier',
          name: varToken.value,
          scope: 'local',
          start: varToken.start - 1, // Include the `:` in the start position
          end: varToken.end,
        } as any;
      }
      // Check for scope modifiers (global/local) first
      else if (this.check('global') || this.check('local')) {
        const scopeToken = this.advance();
        const variableToken = this.advance();

        // Create a scoped variable target
        targetExpression = {
          type: 'identifier',
          name: variableToken.value,
          scope: scopeToken.value,
          start: scopeToken.start,
          end: variableToken.end,
        } as any;

        // Scoped variable parsed successfully
      } else if (this.check('the')) {
        // debug.parse('🎯 PARSER: detected "the" keyword! Proceeding with "X of Y" pattern recognition');

        // Look ahead to check if this is actually a "the X of Y" pattern
        // before consuming any tokens
        const thePosition = this.current;
        this.advance(); // consume 'the'

        // Peek at next token to see if we have "X of Y" pattern
        const nextToken = this.peek();
        const tokenAfterNext =
          this.current + 1 < this.tokens.length ? this.tokens[this.current + 1] : null;

        // Only proceed with "the X of Y" parsing if we actually have "X of Y"
        if (nextToken && tokenAfterNext && tokenAfterNext.value === 'of') {
          // Get the property name (X)
          const propertyToken = this.advance();
          // debug.parse('🔍 PARSER: property token:', propertyToken?.value, 'type:', propertyToken?.type);

          // Check for 'of' keyword
          // debug.parse('🔍 PARSER: checking for "of" keyword, next token:', this.peek()?.value);
          if (this.check('of')) {
            // debug.parse('✅ PARSER: found "of" keyword, advancing');
            this.advance(); // consume 'of'

            // Get the target element (Y)
            const targetToken = this.advance();
            // debug.parse('🔍 PARSER: target token:', targetToken?.value, 'type:', targetToken?.type);

            // Create a propertyOfExpression AST node
            targetExpression = {
              type: 'propertyOfExpression',
              property: {
                type: 'identifier',
                name: propertyToken.value,
                start: propertyToken.start,
                end: propertyToken.end,
              },
              target: {
                type: targetToken.type === TokenType.ID_SELECTOR ? 'idSelector' : 'cssSelector',
                value: targetToken.value,
                start: targetToken.start,
                end: targetToken.end,
              },
              start: startPosition,
              end: this.current,
            };

            // debug.parse('🔍 PARSER: created propertyOfExpression AST node', {
            // property: propertyToken.value,
            // target: targetToken.value,
            // type: targetExpression.type
            // });
          } else {
            // debug.parse('⚠️ PARSER: "the" not followed by "X of Y" pattern, reverting', {
            // expectedOf: this.peek()?.value,
            // position: this.current,
            // startPosition
            // });
            this.current = startPosition;
            targetExpression = null;
          }
        } else {
          // Lookahead determined this is NOT a "the X of Y" pattern
          // Revert to before consuming "the" and let token-by-token parsing handle it
          // debug.parse('⚠️ PARSER: "the" not part of "X of Y" pattern, reverting');
          this.current = thePosition;
          targetExpression = null;
        }
      } else {
        // Not a "the X of Y" pattern, try regular expression parsing
        targetExpression = this.parseExpression();
        // debug.parse('🔍 PARSER: regular expression parsing success', {
        // type: targetExpression.type,
        // value: (targetExpression as any).value || (targetExpression as any).name
        // });
      }
    } catch (error) {
      // console.error('⚠️ PARSER: direct "the X of Y" parsing failed, falling back to token-by-token', {
      // error: (error as Error).message
      // });
      // Reset position and fall back to token-by-token parsing
      this.current = startPosition;
      targetExpression = null;
    }

    // If single expression parsing failed, fall back to collecting individual tokens
    const targetTokens: ASTNode[] = [];
    if (!targetExpression) {
      debug.parse('🔍 PARSER (SET): Fallback token collection, current token:', this.peek().value);
      // Check for local variable prefix `:` (hyperscript syntax for local variables)
      if (this.match(':')) {
        debug.parse('✅ PARSER (SET): Found `:` prefix, parsing local variable');
        // Consume the `:` and get the variable name
        const varToken = this.advance();
        debug.parse('✅ PARSER (SET): Variable name after `:`:', varToken.value);
        // Create a variable node with local scope
        targetExpression = {
          type: 'identifier',
          name: varToken.value,
          scope: 'local',
          start: varToken.start,
          end: varToken.end,
        } as any;
      } else {
        debug.parse('🔍 PARSER (SET): No `:` prefix, collecting tokens until "to"');
        // Original token collection logic
        while (
          !this.isAtEnd() &&
          !this.check('to') &&
          !this.check('then') &&
          !this.check('and') &&
          !this.check('else') &&
          !this.check('end')
        ) {
          const token = this.parsePrimary();
          targetTokens.push(token);
        }
      }

      // debug.parse('🔍 PARSER: collected target tokens via fallback', {
      // targetTokens: targetTokens.map(a => ({ type: a.type, value: (a as any).value || (a as any).name }))
      // });

      // Reconstruct complex expressions from collected tokens
      if (targetTokens.length > 0) {
        // Check if we have a "the X of Y" pattern in the tokens
        if (
          targetTokens.length >= 4 &&
          (targetTokens[0] as any).value === 'the' &&
          (targetTokens[2] as any).value === 'of'
        ) {
          // Create propertyOfExpression node
          targetExpression = {
            type: 'propertyOfExpression',
            property: {
              type: 'identifier',
              name: (targetTokens[1] as any).value || (targetTokens[1] as any).name,
              start: (targetTokens[1] as any).start,
              end: (targetTokens[1] as any).end,
            },
            target: {
              type: (targetTokens[3] as any).type === 'idSelector' ? 'idSelector' : 'cssSelector',
              value: (targetTokens[3] as any).value || (targetTokens[3] as any).name,
              start: (targetTokens[3] as any).start,
              end: (targetTokens[3] as any).end,
            },
            start: (targetTokens[0] as any).start,
            end: (targetTokens[3] as any).end,
          };

          // debug.parse('🔧 PARSER: reconstructed propertyOfExpression from tokens', {
          // property: (targetTokens[1] as any).value,
          // target: (targetTokens[3] as any).value,
          // type: targetExpression.type
          // });
        } else if (targetTokens.length === 1) {
          // Single token target (simple case like "count" or "myVar")
          targetExpression = targetTokens[0];
        } else {
          // Multiple tokens but not "the X of Y" pattern
          // Don't combine them into a single expression - leave as null
          // and we'll add all tokens to finalArgs below
          targetExpression = null;
        }
      }
    }

    // Expect 'to' keyword
    if (!this.check('to')) {
      const found = this.isAtEnd() ? 'end of input' : this.peek().value;
      throw new Error(`Expected 'to' in set command, found: ${found}`);
    }

    this.advance(); // consume 'to'
    // debug.parse('🔍 PARSER: consumed "to" keyword');

    // Parse value (single expression after 'to')
    // The value should be exactly ONE expression (e.g., count + 1, "string", variable)
    // parseExpression() correctly handles expression boundaries and stops at 'then', 'and', etc.
    const valueTokens: ASTNode[] = [];
    const expr = this.parseExpression();
    if (expr) {
      valueTokens.push(expr);
    } else {
      // Fallback to primary if expression parsing fails
      const primary = this.parsePrimary();
      if (primary) {
        valueTokens.push(primary);
      }
    }

    // Build final args: target + 'to' + value tokens
    const finalArgs: ASTNode[] = [];

    if (targetExpression) {
      // Single expression target
      finalArgs.push(targetExpression);
    } else if (targetTokens.length > 0) {
      // Multiple tokens: add them all (e.g., ["the", "dragHandle"])
      finalArgs.push(...targetTokens);
    }

    // Add 'to' keyword
    finalArgs.push(this.createIdentifier('to'));

    // Add all value tokens (runtime will handle combining them)
    if (valueTokens.length > 0) {
      finalArgs.push(...valueTokens);
    }

    const result = {
      type: 'command' as const,
      name: identifierNode.name,
      args: finalArgs as ExpressionNode[],
      isBlocking: false,
      start: identifierNode.start || 0,
      end: this.getPosition().end,
      line: identifierNode.line || 1,
      column: identifierNode.column || 1,
    };

    return result;
  }

  private parseHaltCommand(identifierNode: IdentifierNode): CommandNode | null {
    // Parse "halt" or "halt the event"
    // We need to keep "the" and "event" as separate tokens for the command adapter
    const args: ASTNode[] = [];

    // Check if next tokens are "the event"
    if (this.check('the')) {
      const theToken = this.advance();
      args.push({
        type: 'identifier',
        name: 'the',
        start: theToken.start,
        end: theToken.end,
        line: theToken.line,
        column: theToken.column,
      } as IdentifierNode);

      // Check if followed by "event"
      if (this.check('event')) {
        const eventToken = this.advance();
        args.push({
          type: 'identifier',
          name: 'event',
          start: eventToken.start,
          end: eventToken.end,
          line: eventToken.line,
          column: eventToken.column,
        } as IdentifierNode);
      }
    }

    return {
      type: 'command',
      name: 'halt',
      args: args as ExpressionNode[],
      isBlocking: false,
      start: identifierNode.start || 0,
      end: this.getPosition().end,
      line: identifierNode.line || 1,
      column: identifierNode.column || 1,
    };
  }

  private parseTriggerCommand(identifierNode: IdentifierNode): CommandNode | null {
    // debug.parse('🔍 PARSER: parseTriggerCommand started', {
    // commandName: identifierNode.name,
    // currentToken: this.peek(),
    // remainingTokens: this.tokens.slice(this.current).map(t => t.value)
    // });

    // Use the same flexible approach as put/set commands
    const allArgs: ASTNode[] = [];

    while (
      !this.isAtEnd() &&
      !this.check('then') &&
      !this.check('and') &&
      !this.check('else') &&
      !this.check('end') &&
      !this.checkTokenType(TokenType.COMMAND)
    ) {
      allArgs.push(this.parsePrimary());
    }

    // debug.parse('🔍 PARSER: collected all arguments for trigger', {
    // allArgs: allArgs.map(a => ({ type: a.type, value: (a as any).value || (a as any).name }))
    // });

    // Find the 'on' keyword
    let operationIndex = -1;
    for (let i = 0; i < allArgs.length; i++) {
      const arg = allArgs[i];
      if (
        (arg.type === 'identifier' || arg.type === 'literal' || arg.type === 'keyword') &&
        ((arg as any).name === 'on' || (arg as any).value === 'on')
      ) {
        operationIndex = i;
        // debug.parse('🔍 PARSER: found "on" keyword', { arg, type: arg.type });
        break;
      }
    }

    const finalArgs: ASTNode[] = [];

    if (operationIndex === -1) {
      // debug.parse('⚠️ PARSER: no "on" keyword found in trigger command');
      finalArgs.push(...allArgs);
    } else {
      // Restructure: event + 'on' + target
      const eventArgs = allArgs.slice(0, operationIndex);
      const targetArgs = allArgs.slice(operationIndex + 1);

      finalArgs.push(...eventArgs);
      finalArgs.push(this.createIdentifier('on'));
      finalArgs.push(...targetArgs);
    }

    const result = {
      type: 'command' as const,
      name: identifierNode.name,
      args: finalArgs as ExpressionNode[],
      isBlocking: false,
      start: identifierNode.start || 0,
      end: this.getPosition().end,
      line: identifierNode.line || 1,
      column: identifierNode.column || 1,
    };

    // debug.parse('✅ PARSER: parseTriggerCommand completed', {
    // result,
    // argCount: finalArgs.length,
    // finalArgs: finalArgs.map(a => ({ type: a.type, value: (a as any).value || (a as any).name }))
    // });

    return result;
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
        'type:',
        this.peek().type
      );
      // Try to parse a command
      let parsedCommand = false;

      if (this.checkTokenType(TokenType.COMMAND)) {
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
      } else if (this.checkTokenType(TokenType.IDENTIFIER)) {
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
        !this.checkTokenType(TokenType.COMMAND) &&
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
      } else if (this.checkTokenType(TokenType.COMMAND) || this.isCommand(this.peek().value)) {
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
    const args: ASTNode[] = [];
    let loopType: string = 'forever';
    let eventName: string | null = null;
    let eventTarget: ASTNode | null = null;
    let condition: ASTNode | null = null;
    let collection: ASTNode | null = null;
    let variable: string | null = null;
    let times: ASTNode | null = null;

    // Parse repeat type
    if (this.check('for')) {
      this.advance(); // consume 'for'
      loopType = 'for';

      // Parse: for <identifier> in <expression>
      const identToken = this.peek();
      if (identToken.type === TokenType.IDENTIFIER) {
        variable = identToken.value;
        this.advance();
      }

      if (this.check('in')) {
        this.advance(); // consume 'in'
        collection = this.parseExpression();
      }
    } else if (this.check('in')) {
      this.advance(); // consume 'in'
      loopType = 'for';
      variable = 'it';
      collection = this.parseExpression();
    } else if (this.check('while')) {
      this.advance(); // consume 'while'
      loopType = 'while';
      condition = this.parseExpression();
    } else if (this.check('until')) {
      this.advance(); // consume 'until'
      loopType = 'until';

      // Check for event-driven loop: until event <eventName> from <target>
      if (this.check('event')) {
        this.advance(); // consume 'event'
        loopType = 'until-event';

        // Parse event name (dotOrColonPath in _hyperscript)
        const eventToken = this.peek();
        debug.parse('📍 Parsing event name, current token:', {
          value: eventToken.value,
          type: eventToken.type,
        });
        if (eventToken.type === TokenType.IDENTIFIER) {
          eventName = eventToken.value;
          this.advance();
          debug.parse('✅ Got event name:', eventName, 'Next token:', this.peek().value);
        } else {
          throw new Error('Expected event name after "event"');
        }

        // Parse optional 'from <target>'
        debug.parse('🔍 Checking for "from", current token:', this.peek().value);
        if (this.check('from')) {
          debug.parse('✅ Found "from", advancing...');
          this.advance(); // consume 'from'
          debug.parse('📍 After consuming "from", current token:', this.peek().value);
          // Parse the target - use parsePrimary to avoid consuming too much
          // This handles "from document" or "from the document" or "from #element"
          if (this.check('the')) {
            debug.parse('✅ Found "the", advancing...');
            this.advance(); // consume 'the'
          }
          // Debug: log current token before calling parsePrimary
          const beforePrimary = this.peek();
          debug.parse('🔍 Before parsePrimary for event target:', {
            value: beforePrimary.value,
            type: beforePrimary.type,
            position: beforePrimary.start,
          });
          eventTarget = this.parsePrimary();
          debug.parse('✅ After parsePrimary, eventTarget:', eventTarget);
        } else {
          debug.parse('❌ No "from" found, skipping target parsing');
        }
      } else {
        // Regular until with condition
        condition = this.parseExpression();
      }
    } else if (this.check('forever')) {
      this.advance(); // consume 'forever'
      loopType = 'forever';
    } else {
      // Parse: repeat <n> times
      times = this.parseExpression();
      if (this.check('times')) {
        this.advance(); // consume 'times'
        loopType = 'times';
      }
    }

    // Parse optional index variable
    // Supports both "index" and "with index" syntax
    let indexVariable: string | null = null;
    if (this.check('with')) {
      // Peek ahead to verify this is "with index" pattern
      const nextToken =
        this.current + 1 < this.tokens.length ? this.tokens[this.current + 1] : null;
      if (nextToken && nextToken.value.toLowerCase() === 'index') {
        this.advance(); // consume 'with'
        this.advance(); // consume 'index'
        indexVariable = 'index'; // default variable name
      }
      // Otherwise leave 'with' alone - might be for something else (like transition timing)
    } else if (this.check('index')) {
      this.advance(); // consume 'index'
      const indexToken = this.peek();
      if (indexToken.type === TokenType.IDENTIFIER) {
        indexVariable = indexToken.value;
        this.advance();
      } else {
        indexVariable = 'index'; // default if no variable name provided
      }
    }

    // Parse command block until 'end'
    // Use parseCommandList helper to handle the command sequence
    const commands: ASTNode[] = this.parseCommandListUntilEnd();

    // Build args array based on loop type
    args.push({
      type: 'identifier',
      name: loopType,
      start: commandToken.start,
      end: commandToken.end,
      line: commandToken.line,
      column: commandToken.column,
    } as IdentifierNode);

    if (variable) {
      args.push({
        type: 'string',
        value: variable,
        start: commandToken.start,
        end: commandToken.end,
        line: commandToken.line,
        column: commandToken.column,
      } as any);
    }

    if (collection) args.push(collection);
    if (condition) args.push(condition);
    if (times) args.push(times);

    if (eventName) {
      args.push({
        type: 'string',
        value: eventName,
        start: commandToken.start,
        end: commandToken.end,
        line: commandToken.line,
        column: commandToken.column,
      } as any);
    }

    if (eventTarget) args.push(eventTarget);

    if (indexVariable) {
      args.push({
        type: 'string',
        value: indexVariable,
        start: commandToken.start,
        end: commandToken.end,
        line: commandToken.line,
        column: commandToken.column,
      } as any);
    }

    // Add commands as a block
    args.push({
      type: 'block',
      commands: commands,
      start: commandToken.start,
      end: commandToken.end || 0,
      line: commandToken.line,
      column: commandToken.column,
    } as any);

    return {
      type: 'command',
      name: 'repeat',
      args: args as ExpressionNode[],
      isBlocking: false,
      start: commandToken.start || 0,
      end: commandToken.end || 0,
      line: commandToken.line || 1,
      column: commandToken.column || 1,
    };
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
  private parseWaitCommand(commandToken: Token): CommandNode {
    const args: ASTNode[] = [];

    // Check if this is a simple time-based wait (e.g., "wait 1s")
    if (this.checkTokenType(TokenType.TIME_EXPRESSION) || this.checkTokenType(TokenType.NUMBER)) {
      // Simple wait with time
      const timeExpr = this.parsePrimary();
      args.push(timeExpr);

      return {
        type: 'command',
        name: 'wait',
        args: args as ExpressionNode[],
        isBlocking: true,
        start: commandToken.start || 0,
        end: this.getPosition().end,
        line: commandToken.line || 1,
        column: commandToken.column || 1,
      };
    }

    // Check for 'for' keyword (event-based wait)
    if (this.check('for')) {
      this.advance(); // consume 'for'

      // Parse event specifications (can be multiple with 'or')
      const events: Array<{ name: string; params: string[] }> = [];

      do {
        // Parse event name
        const eventToken = this.peek();
        if (eventToken.type !== TokenType.IDENTIFIER) {
          throw new Error('Expected event name after "for"');
        }
        const eventName = eventToken.value;
        this.advance();

        // Parse optional parameters: (param1, param2)
        const eventParams: string[] = [];
        if (this.check('(')) {
          this.advance(); // consume '('

          // Parse parameter list
          while (!this.isAtEnd() && !this.check(')')) {
            const paramToken = this.peek();
            if (paramToken.type === TokenType.IDENTIFIER) {
              eventParams.push(paramToken.value);
              this.advance();

              // Check for comma separator
              if (this.check(',')) {
                this.advance();
              }
            } else {
              break;
            }
          }

          // Consume closing parenthesis
          if (!this.check(')')) {
            throw new Error('Expected ")" after event parameters');
          }
          this.advance();
        }

        events.push({ name: eventName, params: eventParams });

        // Check for 'or' to continue with more events
        if (this.check('or')) {
          this.advance(); // consume 'or'
          continue;
        } else {
          break;
        }
      } while (!this.isAtEnd());

      // Parse optional 'from <target>' clause
      let eventTarget: ASTNode | null = null;
      if (this.check('from')) {
        this.advance(); // consume 'from'

        // Optional 'the' before target
        if (this.check('the')) {
          this.advance();
        }

        // Parse the target expression
        eventTarget = this.parsePrimary();
      }

      // Build args array
      // Format: [eventList, target?]
      args.push({
        type: 'arrayLiteral',
        elements: events.map(
          event =>
            ({
              type: 'objectLiteral',
              properties: [
                {
                  key: { type: 'identifier', name: 'name' } as IdentifierNode,
                  value: {
                    type: 'literal',
                    value: event.name,
                    raw: `"${event.name}"`,
                  } as LiteralNode,
                },
                {
                  key: { type: 'identifier', name: 'args' } as IdentifierNode,
                  value: {
                    type: 'arrayLiteral',
                    elements: event.params.map(
                      param =>
                        ({
                          type: 'literal',
                          value: param,
                          raw: `"${param}"`,
                        }) as LiteralNode
                    ),
                  } as any,
                },
              ],
            }) as any
        ),
        start: commandToken.start,
        end: this.getPosition().end,
        line: commandToken.line,
        column: commandToken.column,
      } as any);

      if (eventTarget) {
        args.push(eventTarget);
      }
    }

    return {
      type: 'command',
      name: 'wait',
      args: args as ExpressionNode[],
      isBlocking: true,
      start: commandToken.start || 0,
      end: this.getPosition().end,
      line: commandToken.line || 1,
      column: commandToken.column || 1,
    };
  }

  /**
   * Parse install command with support for named parameters
   *
   * Syntax:
   *   install BehaviorName                        (simple installation)
   *   install BehaviorName()                      (with empty params)
   *   install BehaviorName(param1, param2)        (positional params)
   *   install BehaviorName(name: value)           (named params)
   *   install BehaviorName(name: value, name2: value2)  (multiple named params)
   */
  private parseInstallCommand(commandToken: Token): CommandNode {
    const args: ASTNode[] = [];

    // Parse behavior name (identifier)
    if (!this.checkTokenType(TokenType.IDENTIFIER)) {
      throw new Error('Expected behavior name after "install"');
    }

    const behaviorName = this.advance().value;
    args.push({
      type: 'identifier',
      name: behaviorName,
      start: this.previous().start,
      end: this.previous().end,
      line: this.previous().line,
      column: this.previous().column,
    } as IdentifierNode);

    // Check for parameter list
    if (this.check('(')) {
      this.advance(); // consume '('

      // Parse parameters (can be named or positional)
      const params: Array<{ name?: string; value: ASTNode }> = [];

      while (!this.isAtEnd() && !this.check(')')) {
        // Check if this is a named parameter (identifier followed by ':')
        const checkpoint = this.current;
        let paramName: string | undefined;

        if (this.checkTokenType(TokenType.IDENTIFIER)) {
          const possibleName = this.peek().value;
          this.advance(); // consume identifier

          if (this.check(':')) {
            // This is a named parameter
            this.advance(); // consume ':'
            paramName = possibleName;
          } else {
            // Not a named parameter, rewind
            this.current = checkpoint;
          }
        }

        // Parse the parameter value
        const value = this.parseExpression();
        params.push(paramName !== undefined ? { name: paramName, value } : { value });

        // Check for comma separator
        if (this.check(',')) {
          this.advance();
        } else if (!this.check(')')) {
          // No comma and not at closing paren - might be end of params
          break;
        }
      }

      // Consume closing parenthesis
      if (!this.check(')')) {
        throw new Error('Expected ")" after behavior parameters');
      }
      this.advance();

      // Add parameters as an object literal node
      if (params.length > 0) {
        args.push({
          type: 'objectLiteral',
          properties: params.map(param => ({
            key: param.name
              ? ({ type: 'identifier', name: param.name } as IdentifierNode)
              : ({ type: 'literal', value: '_positional' } as LiteralNode),
            value: param.value,
          })),
          start: commandToken.start,
          end: this.getPosition().end,
          line: commandToken.line,
          column: commandToken.column,
        } as any);
      }
    }

    return {
      type: 'command',
      name: 'install',
      args: args as ExpressionNode[],
      isBlocking: false,
      start: commandToken.start || 0,
      end: this.getPosition().end,
      line: commandToken.line || 1,
      column: commandToken.column || 1,
    };
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
  private parseTransitionCommand(commandToken: Token): CommandNode {
    const args: ASTNode[] = [];

    // Parse optional target (if it looks like a selector or identifier followed by a property)
    let property: ASTNode | null = null;

    // Look ahead to determine if first token is a target or property
    const firstToken = this.peek();

    // Parse property (required)
    // Property can be:
    // - identifier (opacity, width, etc.)
    // - identifier with * prefix (*background-color)
    if (firstToken.type === TokenType.IDENTIFIER || firstToken.value === '*') {
      let propertyValue = '';

      // Handle wildcard prefix
      if (this.check('*')) {
        propertyValue = '*';
        this.advance();
      }

      // Get property name
      if (this.checkTokenType(TokenType.IDENTIFIER)) {
        propertyValue += this.peek().value;
        this.advance();

        // Handle hyphenated properties (background-color)
        while (this.check('-') && !this.isAtEnd()) {
          propertyValue += '-';
          this.advance();
          if (this.checkTokenType(TokenType.IDENTIFIER)) {
            propertyValue += this.peek().value;
            this.advance();
          }
        }

        property = {
          type: 'string',
          value: propertyValue,
          start: firstToken.start || 0,
          end: this.getPosition().end,
          line: firstToken.line,
          column: firstToken.column,
        };
      }
    }

    if (!property) {
      throw new Error('Transition command requires a CSS property');
    }

    args.push(property);

    // Parse 'to' keyword and value (required)
    if (!this.check('to')) {
      throw new Error('Expected "to" keyword after property in transition command');
    }
    this.advance(); // consume 'to'

    // Parse target value (can be template string, number, color, etc.)
    const value = this.parsePrimary();
    args.push(value);

    // Parse optional 'over <duration>'
    if (this.check('over')) {
      this.advance(); // consume 'over'
      const duration = this.parsePrimary();
      args.push(duration);
    }

    // Parse optional 'with <timing-function>'
    if (this.check('with')) {
      this.advance(); // consume 'with'
      const timingFunction = this.parsePrimary();
      args.push(timingFunction);
    }

    return {
      type: 'command',
      name: 'transition',
      args: args as ExpressionNode[],
      isBlocking: false,
      start: commandToken.start || 0,
      end: this.getPosition().end,
      line: commandToken.line || 1,
      column: commandToken.column || 1,
    };
  }

  /**
   * Parse add command: add <classes/object-literal> [to <target>]
   * Supports:
   * - add .class to me
   * - add { left: 10px, top: 20px } to me
   * - add { background: 'red' }
   */
  private parseAddCommand(commandToken: Token): CommandNode {
    const args: ASTNode[] = [];

    // Parse first argument - can be classes (string/identifier) or CSS object literal
    if (this.match('{')) {
      // Parse CSS-style object literal for inline styles
      // Syntax: { left: ${x}px; top: ${y}px; }
      args.push(this.parseCSSObjectLiteral());
    } else if (!this.isAtEnd() && !this.check('to')) {
      // Parse regular class expression
      args.push(this.parsePrimary());
    }

    // Parse optional 'to <target>'
    if (this.check('to')) {
      this.advance(); // consume 'to'

      // Parse target element
      if (!this.isAtEnd() && !this.check('then') && !this.check('and')) {
        args.push(this.parsePrimary());
      }
    }

    return {
      type: 'command',
      name: 'add',
      args: args as ExpressionNode[],
      isBlocking: false,
      start: commandToken.start || 0,
      end: this.getPosition().end,
      line: commandToken.line || 1,
      column: commandToken.column || 1,
    };
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
    const commandName = commandToken.value.toLowerCase(); // Preserve 'if' or 'unless'
    const args: ASTNode[] = [];

    // Check if this is multi-line:
    // 1. Explicit 'then' keyword: if <condition> then ... end
    // 2. Implicit multi-line (no 'then' but multiple commands on separate lines): if <condition>\n  <cmd>\n  <cmd>\n end
    // 3. Single-line (no 'then', single command on same line): if <condition> <command>
    const hasThen = this.check('then');

    // Look ahead to check for multi-line form without 'then'
    // We need to distinguish:
    //   if no dragHandle set x to y    (single-line, command on SAME line as if)
    //   if no dragHandle               (multi-line, command on DIFFERENT line)
    //     log 'test'
    //   end
    // Key insight: Only check the FIRST command's line position
    let hasImplicitMultiLineEnd = false;
    if (!hasThen) {
      const savedPosition = this.current;
      const ifStatementLine = commandToken.line; // Line where 'if' keyword appears
      const maxLookahead = 100;

      // Scan forward to find the FIRST command after the condition
      while (!this.isAtEnd() && this.current - savedPosition < maxLookahead) {
        const token = this.peek();
        const tokenValue = token.value?.toLowerCase();

        // Stop at structural boundaries
        if (
          tokenValue === 'behavior' ||
          tokenValue === 'def' ||
          tokenValue === 'on' ||
          tokenValue === 'end'
        ) {
          break;
        }

        // When we find the FIRST command, check its line position
        if (this.checkTokenType(TokenType.COMMAND) || this.isCommand(tokenValue)) {
          // If first command is on a DIFFERENT line than if, it's multi-line
          // If first command is on the SAME line as if, it's single-line
          if (token.line !== undefined && token.line !== ifStatementLine) {
            hasImplicitMultiLineEnd = true;
          }
          // Found first command, stop scanning
          break;
        }

        this.advance();
      }

      this.current = savedPosition;
    }

    const isMultiLine = hasThen || hasImplicitMultiLineEnd;

    let condition: ASTNode;
    if (isMultiLine) {
      // Multi-line form: parse condition using standard expression parser
      // This works for both explicit (with 'then') and implicit (without 'then') forms
      // because parseExpression naturally stops at command boundaries
      condition = this.parseExpression();
    } else {
      // Single-line form: parse condition carefully, stopping at COMMAND tokens
      // Parse tokens until we hit a command token (which will be the action)
      const conditionTokens: ASTNode[] = [];
      const maxIterations = 20; // Safety limit to prevent infinite loops
      let iterations = 0;

      while (
        !this.isAtEnd() &&
        !this.checkTokenType(TokenType.COMMAND) &&
        !this.isCommand(this.peek().value) &&
        !this.check('then') &&
        iterations < maxIterations
      ) {
        const beforePos = this.current;
        // Use parseUnary() instead of parsePrimary() to handle unary operators like 'not' and 'no'
        conditionTokens.push(this.parseUnary());

        // Safety check: ensure we're making progress
        if (this.current === beforePos) {
          // parseUnary didn't advance - manually advance to prevent infinite loop
          this.advance();
        }
        iterations++;
      }

      // Combine condition tokens into a single expression
      if (conditionTokens.length === 0) {
        throw new Error('Expected condition after if/unless');
      } else if (conditionTokens.length === 1) {
        condition = conditionTokens[0];
      } else {
        // Multiple tokens - create a compound expression
        condition = {
          type: 'expression',
          tokens: conditionTokens,
          start: conditionTokens[0].start,
          end: conditionTokens[conditionTokens.length - 1].end,
          line: commandToken.line,
          column: commandToken.column,
        } as any;
      }
    }

    args.push(condition);

    if (isMultiLine) {
      // Multi-line form: if condition then ... end (or if condition ... end)
      if (hasThen) {
        this.advance(); // consume 'then' if present
      }

      // Parse command block until 'else' or 'end'
      const thenCommands: ASTNode[] = [];
      while (!this.isAtEnd() && !this.check('else') && !this.check('end')) {
        if (this.checkTokenType(TokenType.COMMAND) || this.isCommand(this.peek().value)) {
          this.advance(); // consume command token
          const cmd = this.parseCommand();
          if (cmd) {
            thenCommands.push(cmd);
          }
        } else {
          break;
        }
      }

      // Add then block
      args.push({
        type: 'block',
        commands: thenCommands,
        start: commandToken.start,
        end: this.getPosition().end,
        line: commandToken.line,
        column: commandToken.column,
      } as any);

      // Check for optional 'else' clause
      if (this.check('else')) {
        this.advance(); // consume 'else'

        const elseCommands: ASTNode[] = [];
        while (!this.isAtEnd() && !this.check('end')) {
          if (this.checkTokenType(TokenType.COMMAND) || this.isCommand(this.peek().value)) {
            this.advance(); // consume command token
            const cmd = this.parseCommand();
            if (cmd) {
              elseCommands.push(cmd);
            }
          } else {
            break;
          }
        }

        // Add else block
        args.push({
          type: 'block',
          commands: elseCommands,
          start: commandToken.start,
          end: this.getPosition().end,
          line: commandToken.line,
          column: commandToken.column,
        } as any);
      }

      // Consume 'end' for multi-line form
      this.consume('end', "Expected 'end' after if block");
    } else {
      // Single-line form: if condition command
      // Parse exactly one command (no 'end' expected)
      if (this.checkTokenType(TokenType.COMMAND) || this.isCommand(this.peek().value)) {
        this.advance(); // consume command token
        const singleCommand = this.parseCommand();

        // Wrap single command in a block for consistency
        args.push({
          type: 'block',
          commands: [singleCommand],
          start: commandToken.start,
          end: this.getPosition().end,
          line: commandToken.line,
          column: commandToken.column,
        } as any);
      } else {
        throw new Error('Expected command after if condition in single-line form');
      }
    }

    return {
      type: 'command',
      name: commandName, // Use actual command name ('if' or 'unless')
      args: args as ExpressionNode[],
      isBlocking: false,
      start: commandToken.start || 0,
      end: this.getPosition().end,
      line: commandToken.line || 1,
      column: commandToken.column || 1,
    };
  }

  // @ts-expect-error - Reserved for future command parsing
  private _parseAddCommand(identifierNode: IdentifierNode): CommandNode | null {
    const args: ASTNode[] = [];

    // Parse: add <class> to <target>
    // First argument: class
    if (!this.isAtEnd() && !this.check('to')) {
      args.push(this.parsePrimary());
    }

    // Expect 'to' keyword
    if (this.check('to')) {
      this.advance(); // consume 'to'
      args.push(this.createIdentifier('to')); // Add 'to' as an argument
    }

    // Third argument: target
    if (!this.isAtEnd() && !this.check('then') && !this.check('and') && !this.check('else')) {
      args.push(this.parsePrimary());
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

  private parseRemoveCommand(identifierNode: IdentifierNode): CommandNode | null {
    const args: ASTNode[] = [];

    // Parse: remove <class> from <target>
    // First argument: class
    if (!this.isAtEnd() && !this.check('from') && !this.check('end')) {
      args.push(this.parsePrimary());
    }

    // Expect 'from' keyword
    if (this.check('from')) {
      this.advance(); // consume 'from'
      args.push(this.createIdentifier('from')); // Add 'from' as an argument
    }

    // Third argument: target
    if (
      !this.isAtEnd() &&
      !this.check('then') &&
      !this.check('and') &&
      !this.check('else') &&
      !this.check('end')
    ) {
      args.push(this.parsePrimary());
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

  private parseToggleCommand(identifierNode: IdentifierNode): CommandNode | null {
    const args: ASTNode[] = [];

    // Parse: toggle <class> from <target> OR toggle <class> on <target>
    // Support both 'from' (HyperFixi) and 'on' (official _hyperscript) for compatibility
    // First argument: class
    if (!this.isAtEnd() && !this.check('from') && !this.check('on') && !this.check('end')) {
      args.push(this.parsePrimary());
    }

    // Accept either 'from' or 'on' keyword for target specification
    if (this.check('from') || this.check('on')) {
      const preposition = this.peek().value; // 'from' or 'on'
      this.advance(); // consume the preposition
      args.push(this.createIdentifier(preposition)); // Add preposition as an argument
    }

    // Third argument: target
    if (
      !this.isAtEnd() &&
      !this.check('then') &&
      !this.check('and') &&
      !this.check('else') &&
      !this.check('end')
    ) {
      args.push(this.parsePrimary());
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

  private parseRegularCommand(identifierNode: IdentifierNode): CommandNode | null {
    const args: ASTNode[] = [];

    // Parse command arguments (space-separated, not comma-separated)
    while (
      !this.isAtEnd() &&
      !this.check('then') &&
      !this.check('and') &&
      !this.check('else') &&
      !this.check('end') &&
      !this.checkTokenType(TokenType.COMMAND)
    ) {
      if (
        this.checkTokenType(TokenType.CONTEXT_VAR) ||
        this.checkTokenType(TokenType.IDENTIFIER) ||
        this.checkTokenType(TokenType.KEYWORD) ||
        this.checkTokenType(TokenType.CSS_SELECTOR) ||
        this.checkTokenType(TokenType.ID_SELECTOR) ||
        this.checkTokenType(TokenType.CLASS_SELECTOR) ||
        this.checkTokenType(TokenType.STRING) ||
        this.checkTokenType(TokenType.NUMBER) ||
        this.checkTokenType(TokenType.TIME_EXPRESSION) ||
        this.match('<')
      ) {
        args.push(this.parsePrimary());
      } else {
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

  private parseCall(): ASTNode {
    let expr = this.parsePrimary();

    while (true) {
      if (this.match('(')) {
        expr = this.finishCall(expr);
      } else if (this.match('.')) {
        const name = this.consume(
          TokenType.IDENTIFIER,
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
        const property = this.consume(
          TokenType.IDENTIFIER,
          'Expected property name after possessive'
        );
        expr = this.createPossessiveExpression(expr, this.createIdentifier(property.value));
      } else {
        break;
      }
    }

    return expr;
  }

  private parsePrimary(): ASTNode {
    // Check for binary operators that cannot start an expression
    if (this.check('*') || this.check('/') || this.check('%') || this.check('mod')) {
      const token = this.peek();
      this.addError(`Binary operator '${token.value}' requires a left operand`);
      return this.createErrorNode();
    }

    // Handle literals
    if (this.matchTokenType(TokenType.NUMBER)) {
      const value = parseFloat(this.previous().value);
      return this.createLiteral(value, this.previous().value);
    }

    if (this.matchTokenType(TokenType.STRING)) {
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

      const value = raw.slice(1, -1); // Remove quotes
      return this.createLiteral(value, raw);
    }

    if (this.matchTokenType(TokenType.TEMPLATE_LITERAL)) {
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

    if (this.matchTokenType(TokenType.BOOLEAN)) {
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
    if (this.matchTokenType(TokenType.TIME_EXPRESSION)) {
      const raw = this.previous().value;
      return this.createLiteral(raw, raw); // Keep time expressions as string literals
    }

    // Handle CSS selectors
    if (
      this.matchTokenType(TokenType.CSS_SELECTOR) ||
      this.matchTokenType(TokenType.ID_SELECTOR) ||
      this.matchTokenType(TokenType.CLASS_SELECTOR)
    ) {
      return this.createSelector(this.previous().value);
    }

    // Handle query reference selectors (<button/>, <.class/>, <#id/>)
    if (this.matchTokenType(TokenType.QUERY_REFERENCE)) {
      const queryValue = this.previous().value;
      // Extract the selector from <.../>
      const selector = queryValue.slice(1, -2); // Remove < and />
      return this.createSelector(selector);
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

    // Handle local variable prefix `:` for expressions (e.g., put :x into #result)
    // IMPORTANT: Check for :variable BEFORE general operator handling
    if (this.check(':')) {
      this.advance(); // consume `:`
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

    // Handle operators as literal tokens
    if (this.matchTokenType(TokenType.OPERATOR)) {
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

    if (
      !isStructuralKeyword &&
      (this.matchTokenType(TokenType.IDENTIFIER) ||
        this.matchTokenType(TokenType.KEYWORD) ||
        this.matchTokenType(TokenType.CONTEXT_VAR) ||
        this.matchTokenType(TokenType.COMMAND))
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
          this.checkTokenType(TokenType.CSS_SELECTOR) ||
          this.check('<') ||
          this.checkTokenType(TokenType.QUERY_REFERENCE)
        ) {
          return this.parseNavigationFunction(token.value);
        }
        return this.createIdentifier(token.value);
      }

      // Handle "my" property access (but only for space syntax, not dot syntax)
      // For dot syntax (my.prop), let it fall through to be handled by parseCall()
      if (token.value === 'my' && !this.check('.')) {
        return this.parseMyPropertyAccess();
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
    if (this.checkTokenType(TokenType.NUMBER)) {
      const numberToken = this.advance();
      const value = numberToken.value;
      return this.createLiteral(value, `$${value}`);
    }

    // Check if followed by an identifier (like $variable, $window)
    if (this.checkTokenType(TokenType.IDENTIFIER)) {
      const identifierToken = this.advance();
      let expression: ASTNode = this.createIdentifier(identifierToken.value);

      // Handle property access like $window.foo
      while (this.match('.')) {
        if (this.checkTokenType(TokenType.IDENTIFIER)) {
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

      if (this.matchTokenType(TokenType.IDENTIFIER)) {
        // Unquoted property name
        key = this.createIdentifier(this.previous().value);
      } else if (this.matchTokenType(TokenType.STRING)) {
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
      if (this.matchTokenType(TokenType.IDENTIFIER)) {
        key = this.createIdentifier(this.previous().value);
      } else if (this.matchTokenType(TokenType.STRING)) {
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
    if (!this.checkTokenType(TokenType.IDENTIFIER)) {
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

  private parseEventHandler(): EventHandlerNode {
    debug.parse(`🔧 parseEventHandler: ENTRY - parsing event handler`);

    // Collect all event names (supports "on event1 or event2 or event3")
    const eventNames: string[] = [];

    // Parse first event name
    let eventToken: Token;
    if (this.checkTokenType(TokenType.EVENT)) {
      eventToken = this.advance();
    } else if (this.checkTokenType(TokenType.IDENTIFIER)) {
      eventToken = this.advance();
    } else {
      eventToken = this.consume(TokenType.EVENT, "Expected event name after 'on'");
    }

    // Check if event name includes namespace (e.g., "draggable:start")
    let event = eventToken.value;
    if (this.check(':')) {
      this.advance(); // consume ':'
      const namespaceToken = this.advance(); // get the part after ':'
      event = `${event}:${namespaceToken.value}`;
    }

    eventNames.push(event);
    debug.parse(`🔧 parseEventHandler: Parsed first event name: ${event}`);

    // Check for additional event names with 'or' keyword
    while (this.check('or')) {
      this.advance(); // consume 'or'
      debug.parse(`🔧 parseEventHandler: Found 'or', parsing additional event name`);

      // Parse next event name
      if (this.checkTokenType(TokenType.EVENT)) {
        eventToken = this.advance();
      } else if (this.checkTokenType(TokenType.IDENTIFIER)) {
        eventToken = this.advance();
      } else {
        eventToken = this.consume(TokenType.EVENT, "Expected event name after 'or'");
      }

      // Check for namespace
      let additionalEvent = eventToken.value;
      if (this.check(':')) {
        this.advance(); // consume ':'
        const namespaceToken = this.advance(); // get the part after ':'
        additionalEvent = `${additionalEvent}:${namespaceToken.value}`;
      }

      eventNames.push(additionalEvent);
      debug.parse(`🔧 parseEventHandler: Parsed additional event name: ${additionalEvent}`);
    }

    debug.parse(`🔧 parseEventHandler: Total events parsed: ${eventNames.join(', ')}`);

    // Check for conditional syntax: [condition]
    let condition: ASTNode | undefined;
    if (this.match('[')) {
      condition = this.parseExpression();
      this.consume(']', "Expected ']' after event condition");
    }

    // Optional: handle "from selector"
    let selector: string | undefined;
    if (this.match('from')) {
      const selectorToken = this.advance();
      selector = selectorToken.value;
    }

    // Parse commands
    const commands: CommandNode[] = [];

    debug.parse(
      `✅ parseEventHandler: About to parse commands, current token: ${this.isAtEnd() ? 'END' : this.peek().value}, isAtEnd: ${this.isAtEnd()}`
    );

    // Look for commands after the event (and optional selector)
    while (!this.isAtEnd()) {
      debug.parse(
        `✅ parseEventHandler: Loop iteration, current token: ${this.peek().value}, type: ${this.peek().type}`
      );

      // Stop parsing commands if we encounter another event handler (on ...)
      if (this.check('on')) {
        debug.parse(
          `✅ parseEventHandler: Stopping command parsing, found next event handler 'on'`
        );
        break;
      }

      if (this.checkTokenType(TokenType.COMMAND)) {
        // Check if this is actually a pseudo-command (command token used as function call)
        const nextIsOpenParen = this.tokens[this.current + 1]?.value === '(';

        if (nextIsOpenParen) {
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
              (nextToken.type === TokenType.IDENTIFIER && !this.isCommand(nextToken.value)) ||
              nextToken.type === TokenType.CONTEXT_VAR;

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
      } else if (this.checkTokenType(TokenType.IDENTIFIER)) {
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
              (nextToken.type === TokenType.IDENTIFIER && !this.isCommand(nextToken.value)) ||
              nextToken.type === TokenType.CONTEXT_VAR;

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
        !this.checkTokenType(TokenType.COMMAND) &&
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
      } else if (this.checkTokenType(TokenType.COMMAND) || this.isCommand(this.peek().value)) {
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
      start: pos.start,
      end: pos.end,
      line: pos.line,
      column: pos.column,
    };

    if (condition) {
      node.condition = condition;
    }

    if (selector) {
      node.selector = selector;
    }

    debug.parse(`🔧 parseEventHandler: Created node with events: ${eventNames.join(', ')}`);
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
    const nameToken = this.consume(
      TokenType.IDENTIFIER,
      "Expected behavior name after 'behavior' keyword"
    );
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
          const paramToken = this.consume(TokenType.IDENTIFIER, 'Expected parameter name');
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
            if (paramToken.type === TokenType.IDENTIFIER) {
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
          if (!this.isAtEnd() && !this.checkTokenType(TokenType.COMMAND)) {
            const targetToken = this.peek();
            targetTokens.push(targetToken.value);
            eventSource = targetToken.value;
            this.advance();
          }
        }

        // Parse commands until we hit 'end'
        const handlerCommands: CommandNode[] = [];
        while (!this.isAtEnd() && !this.check('end')) {
          if (this.checkTokenType(TokenType.COMMAND) || this.isCommand(this.peek().value)) {
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
                !this.checkTokenType(TokenType.COMMAND) &&
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
        const initCommands: CommandNode[] = [];

        while (!this.isAtEnd() && !this.check('end')) {
          if (this.checkTokenType(TokenType.COMMAND) || this.isCommand(this.peek().value)) {
            this.advance();
            const cmd = this.parseCommand();
            initCommands.push(cmd);
          } else {
            break;
          }
        }

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
        this.checkTokenType(TokenType.COMMAND) ||
        (this.isCommand(this.peek().value) && !this.isKeyword(this.peek().value))
      ) {
        this.advance(); // consume the command token

        // Save error state before parsing command
        const savedError = this.error;
        // Use parseCommand() instead of parseFullCommand() to handle special commands like 'repeat'
        const cmd = this.parseCommand();

        // Check if an error was added during parsing (even if no exception was thrown)
        if (this.error && this.error !== savedError) {
          debug.parse(
            '⚠️  parseCommandSequence: Command parsing added error, restoring error state. Error was:',
            this.error.message
          );
          this.error = savedError;
        }

        commands.push(cmd);

        // Skip any unexpected tokens until we find 'then', a command, an event handler, or end
        // This handles cases where command parsing doesn't consume all its arguments (like HSL colors)
        while (
          !this.isAtEnd() &&
          !this.checkTokenType(TokenType.COMMAND) &&
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
          this.checkTokenType(TokenType.COMMAND) ||
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

  // @ts-expect-error - Reserved for future command parsing
  private _parseFullCommand(): CommandNode {
    const commandToken = this.previous();
    let commandName = commandToken.value;

    // Handle special case for beep! command
    if (commandName === 'beep' && this.check('!')) {
      this.advance(); // consume the !
      commandName = 'beep!';
    }

    const args: ASTNode[] = [];

    // Use command-specific parsing instead of parseExpression to preserve natural language syntax
    while (!this.isAtEnd() && !this.check('then')) {
      // Parse individual tokens/primitives instead of full expressions
      // This prevents "add .highlight to #element" from being split into separate expressions
      if (
        this.checkTokenType(TokenType.CSS_SELECTOR) ||
        this.checkTokenType(TokenType.ID_SELECTOR) ||
        this.checkTokenType(TokenType.CLASS_SELECTOR) ||
        this.checkTokenType(TokenType.CONTEXT_VAR) ||
        this.checkTokenType(TokenType.IDENTIFIER) ||
        this.checkTokenType(TokenType.KEYWORD) ||
        this.checkTokenType(TokenType.STRING) ||
        this.checkTokenType(TokenType.NUMBER) ||
        this.checkTokenType(TokenType.TIME_EXPRESSION) ||
        this.checkTokenType(TokenType.OPERATOR) ||
        this.match('<')
      ) {
        args.push(this.parsePrimary());
      } else {
        // Unknown token type - break to avoid infinite loop
        break;
      }

      // For comma-separated arguments, consume the comma and continue
      if (this.match(',')) {
        continue;
      }

      // If we hit another command (not preceded by 'then'), we've gone too far
      if (this.checkTokenType(TokenType.COMMAND) && !this.check('then')) {
        break;
      }
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

  private parseCommand(): CommandNode {
    const commandToken = this.previous();
    let commandName = commandToken.value;

    // Handle special case for beep! command - check if beep is followed by !
    if (commandName === 'beep' && this.check('!')) {
      this.advance(); // consume the !
      commandName = 'beep!';
    }

    // Handle control flow commands
    const lowerName = commandName.toLowerCase();
    if (lowerName === 'repeat') {
      return this.parseRepeatCommand(commandToken);
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

    // Special handling for set command with proper 'to' parsing
    if (commandName === 'set' && !this.isAtEnd()) {
      // Check for 'global' keyword first
      let hasGlobal = false;
      if (this.check('global')) {
        hasGlobal = true;
        this.advance(); // consume 'global'
      }

      // Parse target (everything before 'to')
      const targetTokens: ASTNode[] = [];

      // DEBUG: Log the next 3 tokens to understand structure
      console.log('🔍 PARSER (SET-ALT): Tokens after set command:');
      console.log('  Token 0 (current):', this.peek().value, 'type:', this.peek().type);
      if (this.current + 1 < this.tokens.length) {
        console.log('  Token 1:', this.tokens[this.current + 1].value, 'type:', this.tokens[this.current + 1].type);
      }
      if (this.current + 2 < this.tokens.length) {
        console.log('  Token 2:', this.tokens[this.current + 2].value, 'type:', this.tokens[this.current + 2].type);
      }

      // Check for local variable prefix `:` (hyperscript syntax for local variables)
      // Check the token VALUE instead of using check(':') since : might be part of the token
      const currentToken = this.peek();
      if (currentToken && currentToken.value && typeof currentToken.value === 'string' && currentToken.value.startsWith(':')) {
        // Token value starts with ':', this is a local variable
        console.log('✅ PARSER (SET-ALT): Found :variable as single token:', currentToken.value);
        const varName = currentToken.value.substring(1); // Remove ':' prefix
        this.advance(); // consume the whole ':variable' token
        targetTokens.push({
          type: 'identifier',
          name: varName,
          scope: 'local',
          start: currentToken.start,
          end: currentToken.end,
        } as any);
      } else if (currentToken && currentToken.value === ':' && this.current + 1 < this.tokens.length) {
        // : is separate token, next token is the variable name
        console.log('✅ PARSER (SET-ALT): Found : as separate token, next is:', this.tokens[this.current + 1].value);
        this.advance(); // consume ':'
        const varToken = this.advance(); // consume variable name
        targetTokens.push({
          type: 'identifier',
          name: varToken.value,
          scope: 'local',
          start: currentToken.start,
          end: varToken.end,
        } as any);
      } else {
        // Original token collection logic
        while (
          !this.isAtEnd() &&
          !this.check('to') &&
          !this.check('then') &&
          !this.check('and') &&
          !this.check('else') &&
          !this.checkTokenType(TokenType.COMMAND)
        ) {
          const expr = this.parseExpression();
          if (expr) {
            targetTokens.push(expr);
          } else {
            const primary = this.parsePrimary();
            if (primary) {
              targetTokens.push(primary);
            }
          }

          // Don't consume comma here, let parseExpression handle it
          if (!this.check('to')) {
            break;
          }
        }
      }

      // Expect 'to' keyword
      if (!this.check('to')) {
        console.log('❌ PARSER (SET-ALT): ERROR - Expected "to", found:', this.peek().value, 'targetTokens collected:', targetTokens.length);
        throw new Error(`Expected 'to' in set command, found: ${this.peek().value}`);
      }
      this.advance(); // consume 'to'

      // Parse value (single expression after 'to')
      // The value should be exactly ONE expression (e.g., count + 1, "string", variable)
      // Not multiple expressions in a loop
      const valueTokens: ASTNode[] = [];
      const expr = this.parseExpression();
      if (expr) {
        valueTokens.push(expr);
      } else {
        // Fallback to primary if expression parsing fails
        const primary = this.parsePrimary();
        if (primary) {
          valueTokens.push(primary);
        }
      }

      // Combine target tokens into args
      args.push(...targetTokens);

      // Add 'to' as separator
      args.push({
        type: 'identifier',
        name: 'to',
        start: commandToken.start,
        end: commandToken.end,
        line: commandToken.line,
        column: commandToken.column,
      });

      // Add value tokens
      args.push(...valueTokens);

      // Add global scope indicator if present
      if (hasGlobal) {
        args.push({
          type: 'literal',
          value: 'global',
          dataType: 'string',
          start: commandToken.start,
          end: commandToken.end,
          line: commandToken.line,
          column: commandToken.column,
          raw: 'global',
        });
      }

      // Return early for set command
      return {
        type: 'command',
        name: commandName,
        args: args as ExpressionNode[],
        isBlocking: false,
        start: commandToken.start,
        end: this.previous().end,
        line: commandToken.line,
        column: commandToken.column,
      };
    }

    // Special handling for increment/decrement commands with 'global' and 'by' syntax
    if ((commandName === 'increment' || commandName === 'decrement') && !this.isAtEnd()) {
      // Check for 'global' keyword first
      let hasGlobal = false;
      if (this.check('global')) {
        hasGlobal = true;
        this.advance(); // consume 'global'
      }

      // Parse the target (variable name or element reference)
      const target = this.parseExpression();
      if (target) {
        args.push(target);
      }

      // Check for 'by' keyword followed by amount
      if (this.check('by')) {
        this.advance(); // consume 'by'
        const amount = this.parseExpression();
        if (amount) {
          args.push(amount);
        }
      }

      // Add global scope indicator if present
      if (hasGlobal) {
        args.push({
          type: 'literal',
          value: 'global',
          dataType: 'string',
          start: commandToken.start,
          end: commandToken.end,
          line: commandToken.line,
          column: commandToken.column,
          raw: 'global',
        });
      }

      // Return early for increment/decrement to avoid general parsing
      return {
        type: 'command',
        name: commandName,
        args: args as ExpressionNode[],
        isBlocking: false,
        start: commandToken.start,
        end: this.previous().end,
        line: commandToken.line,
        column: commandToken.column,
      };
    }

    // Parse command arguments - continue until we hit a separator, end, or another command
    while (
      !this.isAtEnd() &&
      !this.check('then') &&
      !this.check('and') &&
      !this.check('else') &&
      !this.check('end') &&
      !this.checkTokenType(TokenType.COMMAND)
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
    if (this.checkTokenType(TokenType.COMMAND)) {
      // Parse as command directly
      const commandToken = this.advance();
      const identifierNode = this.createIdentifier(commandToken.value);
      const command = this.createCommandFromIdentifier(identifierNode);
      return command || identifierNode;
    }

    // Also check for IDENTIFIER tokens that are commands (backup)
    if (this.checkTokenType(TokenType.IDENTIFIER) || this.checkTokenType(TokenType.KEYWORD)) {
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
      !this.checkTokenType(TokenType.OPERATOR) &&
      !this.check('then') &&
      !this.check('else')
    ) {
      // Parse single argument (like selector)
      args.push(this.parsePrimary());
    }

    return this.createCallExpression(this.createIdentifier(funcName), args);
  }

  private parseMyPropertyAccess(): MemberExpressionNode {
    // Check for CSS property syntax: my *background-color
    const hasCssPrefix = this.match('*');

    if (hasCssPrefix) {
      // Parse CSS property name with hyphens (e.g., background-color)
      let propertyName = '';

      if (!this.checkTokenType(TokenType.IDENTIFIER)) {
        this.addError("Expected property name after 'my *'");
        return this.createMemberExpression(
          this.createIdentifier('me'),
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

        if (this.checkTokenType(TokenType.IDENTIFIER)) {
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
        this.createIdentifier('me'),
        this.createIdentifier(cssPropertyName),
        false
      );
    } else {
      // Standard JavaScript property access: my className
      const property = this.consume(TokenType.IDENTIFIER, "Expected property name after 'my'");
      return this.createMemberExpression(
        this.createIdentifier('me'),
        this.createIdentifier(property.value),
        false
      );
    }
  }

  private finishCall(callee: ASTNode): CallExpressionNode {
    const args: ASTNode[] = [];

    if (!this.check(')')) {
      do {
        args.push(this.parseExpression());
      } while (this.match(','));
    }

    this.consume(')', "Expected ')' after arguments");
    return this.createCallExpression(callee, args);
  }

  // Helper methods for AST node creation
  private createLiteral(value: unknown, raw: string): LiteralNode {
    const pos = this.getPosition();
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

  private createIdentifier(name: string): IdentifierNode {
    const pos = this.getPosition();
    return {
      type: 'identifier',
      name,
      start: pos.start,
      end: pos.end,
      line: pos.line,
      column: pos.column,
    };
  }

  private createBinaryExpression(
    operator: string,
    left: ASTNode,
    right: ASTNode
  ): BinaryExpressionNode {
    const pos = this.getPosition();
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

  private createUnaryExpression(
    operator: string,
    argument: ASTNode,
    prefix: boolean
  ): UnaryExpressionNode {
    const pos = this.getPosition();
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

  private createCallExpression(callee: ASTNode, args: ASTNode[]): CallExpressionNode {
    const pos = this.getPosition();
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

  private createMemberExpression(
    object: ASTNode,
    property: ASTNode,
    computed: boolean
  ): MemberExpressionNode {
    const pos = this.getPosition();
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

  private createSelector(value: string): SelectorNode {
    const pos = this.getPosition();
    return {
      type: 'selector',
      value,
      start: pos.start,
      end: pos.end,
      line: pos.line,
      column: pos.column,
    };
  }

  private createPossessiveExpression(object: ASTNode, property: ASTNode): PossessiveExpressionNode {
    const pos = this.getPosition();
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

  private createErrorNode(): IdentifierNode {
    const pos = this.getPosition();
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
   * (e.g., commands followed by event handlers)
   */
  private createProgramNode(statements: ASTNode[]): ASTNode {
    debug.parse(`✅ createProgramNode: Called with ${statements.length} statements`);

    if (statements.length === 0) {
      debug.parse(`✅ createProgramNode: Returning error node (0 statements)`);
      return this.createErrorNode();
    }

    if (statements.length === 1) {
      debug.parse(`✅ createProgramNode: Returning single statement (type=${statements[0].type})`);
      return statements[0];
    }

    const programNode = {
      type: 'Program',
      statements,
      start: statements[0]?.start || 0,
      end: statements[statements.length - 1]?.end || 0,
      line: statements[0]?.line || 1,
      column: statements[0]?.column || 1,
    } as any;

    debug.parse(
      `✅ createProgramNode: Returning Program node with ${statements.length} statements, type=${programNode.type}`
    );
    return programNode;
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
    if (token.type === TokenType.OPERATOR && token.value === operator) {
      this.advance();
      return true;
    }
    return false;
  }

  private matchTokenType(tokenType: TokenType): boolean {
    if (this.checkTokenType(tokenType)) {
      this.advance();
      return true;
    }
    return false;
  }

  private check(value: string): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().value === value;
  }

  private checkTokenType(tokenType: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === tokenType;
  }

  // @ts-expect-error - Reserved for future token lookahead
  private _checkNext(value: string): boolean {
    if (this.current + 1 >= this.tokens.length) return false;
    return this.tokens[this.current + 1].value === value;
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
      // Return a dummy EOF token
      return { type: 'EOF', value: '', start: 0, end: 0, line: 1, column: 1 };
    }
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(expected: string | TokenType, message: string): Token {
    // Check if it's a token type (enum value) by checking if it matches any TokenType enum values
    const isTokenType = Object.values(TokenType).includes(expected as TokenType);

    if (isTokenType) {
      // It's a token type - check the token's type property
      if (this.checkTokenType(expected as TokenType)) return this.advance();
    } else {
      // It's a literal string value - check the token's value property
      if (this.check(expected)) return this.advance();
    }

    this.addError(message);
    return this.peek();
  }

  private addError(message: string): void {
    const token = this.peek();
    let position = token.start || 0;
    let line = token.line || 1;
    let column = token.column || 1;
    // @ts-expect-error - Tracked for future error enhancement
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
      name: 'ParseError',
      message,
      line: Math.max(1, line),
      column: Math.max(1, column),
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
}

// Main parse function
export function parse(input: string): ParseResult {
  // debug.parse('🎯 PARSER: parse() function called', {
  // input,
  // inputLength: input.length
  // });

  const tokens = tokenize(input);
  // debug.parse('🔍 PARSER: tokenization completed', {
  // tokenCount: tokens.length,
  // tokens: tokens.map(t => `${t.type}:${t.value}`).join(' ')
  // });

  const parser = new Parser(tokens);
  const result = parser.parse();

  // debug.parse('🏁 PARSER: parsing completed', {
  // success: result.success,
  // hasNode: !!result.node,
  // errorCount: result.error ? 1 : 0
  // });

  return result;
}
