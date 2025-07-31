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
  ParseError as CoreParseError 
} from '../types/core';

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

interface ObjectLiteralNode extends ASTNode {
  type: 'objectLiteral';
  properties: Array<{ key: ASTNode; value: ASTNode }>;
}

interface EventHandlerNode extends ASTNode {
  type: 'eventHandler';
  event: string;
  condition?: ASTNode;
  selector?: string;
  commands: CommandNode[];
}

export class Parser {
  private tokens: Token[];
  private current: number = 0;
  private error: ParseError | undefined;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
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
          error: this.error!
        };
      }

      const ast = this.parseExpression();
      
      // Check if we have an error or unexpected remaining tokens
      if (this.error) {
        return {
          success: false,
          node: ast || this.createErrorNode(), // Include partial AST if available
          tokens: this.tokens,
          error: this.error
        };
      }
      
      // Check for unexpected tokens after parsing
      if (!this.isAtEnd()) {
        this.addError(`Unexpected token: ${this.peek().value}`);
        return {
          success: false,
          node: ast || this.createErrorNode(),
          tokens: this.tokens,
          error: this.error!
        };
      }

      return {
        success: true,
        node: ast,
        tokens: this.tokens
      };
    } catch (error) {
      this.addError(error instanceof Error ? error.message : 'Unknown parsing error');
      return {
        success: false,
        node: this.createErrorNode(),
        tokens: this.tokens,
        error: this.error!
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

    while (this.matchTokenType(TokenType.COMPARISON_OPERATOR) || this.match('is', 'matches', 'contains', 'include', 'includes', 'in', 'of', 'as', 'really')) {
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

    while (this.match('+', '-')) {
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
      if (this.check('*') || this.check('/') || this.check('%') || this.check('+') || this.check('-')) {
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
    if (this.match('not', '-', '+')) {
      const operator = this.previous().value;
      
      // Only flag as missing operand if this starts a complex expression and lacks proper context
      // Valid unary: "-5", "not true", "+number" 
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
    while (!this.isAtEnd() && 
           !this.checkTokenType(TokenType.OPERATOR) && 
           !this.check('then') && 
           !this.check('and') && 
           !this.check('else') && 
           !this.check(')') && 
           !this.check(']') && 
           !this.check(',')) {
      
      // Check if current expression is an identifier from a command token
      if (expr.type === 'identifier') {
        // If followed by a selector, create binary expression
        if (this.checkTokenType(TokenType.CSS_SELECTOR) || 
            this.checkTokenType(TokenType.ID_SELECTOR) || 
            this.checkTokenType(TokenType.CLASS_SELECTOR)) {
          
          const right = this.parseCall();
          expr = this.createBinaryExpression(' ', expr, right);
          
        // If followed by other argument types and the identifier is a command, create command
        } else if (this.checkTokenType(TokenType.TIME_EXPRESSION) ||
                   this.checkTokenType(TokenType.STRING) ||
                   this.checkTokenType(TokenType.NUMBER) ||
                   this.checkTokenType(TokenType.CONTEXT_VAR) ||
                   this.checkTokenType(TokenType.IDENTIFIER) ||
                   this.checkTokenType(TokenType.KEYWORD)) {  // Add KEYWORD support for words like "from", "into"
          
          // Convert identifier back to command if it's actually a command
          if (expr.type === 'identifier' && this.isCommand((expr as IdentifierNode).name)) {
            expr = this.createCommandFromIdentifier(expr as IdentifierNode);
          } else {
            break;
          }
        } else {
          // No arguments follow - keep as identifier even if it's a command name
          break;
        }
      } else if (expr.type === 'literal' && 
                 (this.checkTokenType(TokenType.NUMBER) || this.checkTokenType(TokenType.IDENTIFIER))) {
        // Detect missing operator between literals/numbers like "5 3" or "123abc"
        const nextToken = this.peek();
        this.addError(`Missing operator between '${expr.raw || expr.value}' and '${nextToken.value}'`);
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
      'add', 'append', 'async', 'beep', 'break', 'call', 'continue', 'decrement',
      'default', 'fetch', 'get', 'go', 'halt', 'hide', 'increment', 'js', 'log',
      'make', 'measure', 'pick', 'put', 'remove', 'render', 'return',
      'send', 'settle', 'show', 'take', 'tell', 'throw', 'toggle',
      'transition', 'trigger', 'wait'
    ]);
    return COMMANDS.has(name.toLowerCase());
  }

  private createCommandFromIdentifier(identifierNode: IdentifierNode): CommandNode | null {
    const args: ASTNode[] = [];
    
    // Parse command arguments (space-separated, not comma-separated)
    while (!this.isAtEnd() && 
           !this.check('then') && 
           !this.check('and') && 
           !this.check('else') && 
           !this.checkTokenType(TokenType.COMMAND)) {
      
      if (this.checkTokenType(TokenType.CONTEXT_VAR) || 
          this.checkTokenType(TokenType.IDENTIFIER) ||
          this.checkTokenType(TokenType.KEYWORD) ||  // Add KEYWORD support for words like "into"
          this.checkTokenType(TokenType.CSS_SELECTOR) ||
          this.checkTokenType(TokenType.ID_SELECTOR) ||
          this.checkTokenType(TokenType.CLASS_SELECTOR) ||
          this.checkTokenType(TokenType.STRING) ||
          this.checkTokenType(TokenType.NUMBER) ||
          this.checkTokenType(TokenType.TIME_EXPRESSION) ||
          this.match('<')) {
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
      start: identifierNode.start,
      end: this.getPosition().end,
      line: identifierNode.line,
      column: identifierNode.column
    };
  }

  private parseCall(): ASTNode {
    let expr = this.parsePrimary();

    while (true) {
      if (this.match('(')) {
        expr = this.finishCall(expr);
      } else if (this.match('.')) {
        const name = this.consume(TokenType.IDENTIFIER, "Expected property name after '.' - malformed member access");
        expr = this.createMemberExpression(expr, this.createIdentifier(name.value), false);
      } else if (this.match('[')) {
        const index = this.parseExpression();
        this.consume(']', "Expected ']' after array index");
        expr = this.createMemberExpression(expr, index, true);
      } else if (this.check("'s")) {
        // Handle possessive syntax: element's property (tokenized as single 's operator)
        this.advance(); // consume 's'
        const property = this.consume(TokenType.IDENTIFIER, "Expected property name after possessive");
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
      if (raw.length < 2 || 
          (raw.startsWith('"') && !raw.endsWith('"')) ||
          (raw.startsWith("'") && !raw.endsWith("'"))) {
        this.addError("Unclosed string literal - string not properly closed");
        return this.createErrorNode();
      }
      
      const value = raw.slice(1, -1); // Remove quotes
      return this.createLiteral(value, raw);
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
    if (this.matchTokenType(TokenType.CSS_SELECTOR) || this.matchTokenType(TokenType.ID_SELECTOR) || this.matchTokenType(TokenType.CLASS_SELECTOR)) {
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
        this.addError("Expected expression inside parentheses");
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

    // Handle identifiers, keywords, and commands
    if (this.matchTokenType(TokenType.IDENTIFIER) || 
        this.matchTokenType(TokenType.KEYWORD) || 
        this.matchTokenType(TokenType.CONTEXT_VAR) ||
        this.matchTokenType(TokenType.COMMAND)) {
      const token = this.previous();
      
      // Handle special hyperscript constructs
      if (token.value === 'on') {
        return this.parseEventHandler();
      }
      
      if (token.value === 'if') {
        return this.parseConditional();
      }

      // Handle hyperscript navigation functions
      if (token.value === 'closest' || token.value === 'first' || token.value === 'last' || token.value === 'previous' || token.value === 'next') {
        // Check if followed by function call syntax or expression
        if (this.check('(') || this.checkTokenType(TokenType.CSS_SELECTOR) || this.check('<') || this.checkTokenType(TokenType.QUERY_REFERENCE)) {
          return this.parseNavigationFunction(token.value);
        }
        return this.createIdentifier(token.value);
      }

      // Handle "my" property access
      if (token.value === 'my') {
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
      let expression = this.createIdentifier(identifierToken.value);
      
      // Handle property access like $window.foo
      while (this.match('.')) {
        if (this.checkTokenType(TokenType.IDENTIFIER)) {
          const propertyToken = this.advance();
          expression = this.createMemberExpression(expression, this.createIdentifier(propertyToken.value), false);
        } else {
          this.addError("Expected property name after '.' in dollar expression");
          return this.createErrorNode();
        }
      }
      
      // Wrap in a special dollar expression node
      return {
        type: 'dollarExpression',
        expression,
        raw: `$${identifierToken.value}${this.previous().raw || ''}`,
        line: identifierToken.line,
        column: identifierToken.column - 1 // Include the $ symbol
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
        column: pos.column
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
        this.addError("Expected property name in object literal");
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
      column: pos.column
    };
  }

  private parseEventHandler(): EventHandlerNode {
    // Event name can be EVENT token or IDENTIFIER (for cases like "keydown")
    let eventToken: Token;
    if (this.checkTokenType(TokenType.EVENT)) {
      eventToken = this.advance();
    } else if (this.checkTokenType(TokenType.IDENTIFIER)) {
      eventToken = this.advance();
    } else {
      eventToken = this.consume(TokenType.EVENT, "Expected event name after 'on'");
    }
    
    const event = eventToken.value;
    
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
    
    // Look for commands after the event (and optional selector)
    while (!this.isAtEnd()) {
      if (this.checkTokenType(TokenType.COMMAND)) {
        this.advance(); // consume the command token - parseCommand expects this as previous()
        commands.push(this.parseCommand());
      } else if (this.checkTokenType(TokenType.IDENTIFIER)) {
        // Check if this identifier is a command or function call
        const token = this.peek();
        if (this.isCommand(token.value)) {
          // It's a command - parse as command
          this.advance(); // consume the command token - parseCommand expects this as previous()
          commands.push(this.parseCommand());
        } else {
          // Parse as expression (could be function call like focus())
          const expr = this.parseExpression();
          
          // Convert call expressions to commands
          if (expr && expr.type === 'callExpression') {
            const callExpr = expr as CallExpressionNode;
            const commandNode: CommandNode = {
              type: 'command',
              name: (callExpr.callee as IdentifierNode).name,
              args: callExpr.arguments as ExpressionNode[],
              isBlocking: false,
              start: expr.start,
              end: expr.end,
              line: expr.line,
              column: expr.column
            };
            commands.push(commandNode);
          } else if (expr && expr.type === 'binaryExpression' && (expr as BinaryExpressionNode).operator === ' ') {
            // Handle "command target" patterns
            const binExpr = expr as BinaryExpressionNode;
            if (binExpr.left && binExpr.left.type === 'identifier' && this.isCommand(binExpr.left.name)) {
              const commandNode: CommandNode = {
                type: 'command',
                name: binExpr.left.name,
                args: [binExpr.right],
                isBlocking: false,
                start: expr.start,
                end: expr.end,
                line: expr.line,
                column: expr.column
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
      
      // Handle command separators
      if (this.match('then', 'and', ',')) {
        continue; // parse next command
      } else {
        break; // no more commands
      }
    }

    const pos = this.getPosition();
    const node: EventHandlerNode = {
      type: 'eventHandler',
      event,
      commands,
      start: pos.start,
      end: pos.end,
      line: pos.line,
      column: pos.column
    };

    if (condition) {
      node.condition = condition;
    }

    if (selector) {
      node.selector = selector;
    }

    return node;
  }

  private parseCommand(): CommandNode {
    const commandToken = this.previous();
    let commandName = commandToken.value;
    
    // Handle special case for beep! command - check if beep is followed by !
    if (commandName === 'beep' && this.check('!')) {
      this.advance(); // consume the !
      commandName = 'beep!';
    }
    
    const args: ASTNode[] = [];

    // Parse command arguments - continue until we hit a separator or end
    while (!this.isAtEnd() && 
           !this.check('then') && 
           !this.check('and') && 
           !this.check('else') && 
           !this.checkTokenType(TokenType.COMMAND)) {
      
      // For simple arguments like identifiers, selectors, literals
      if (this.checkTokenType(TokenType.CONTEXT_VAR) || 
          this.checkTokenType(TokenType.IDENTIFIER) ||
          this.checkTokenType(TokenType.KEYWORD) ||  // Add KEYWORD support for words like "into", "from"
          this.checkTokenType(TokenType.CSS_SELECTOR) ||
          this.checkTokenType(TokenType.ID_SELECTOR) ||
          this.checkTokenType(TokenType.CLASS_SELECTOR) ||
          this.checkTokenType(TokenType.STRING) ||
          this.checkTokenType(TokenType.NUMBER) ||
          this.checkTokenType(TokenType.TIME_EXPRESSION) ||
          this.match('<')) {
        args.push(this.parsePrimary());
      } else {
        // For more complex expressions
        args.push(this.parseExpression());
      }
      
      // For comma-separated arguments, consume the comma and continue
      if (this.match(',')) {
        // Comma-separated - continue to next argument
        continue;
      }
      
      // For hyperscript natural language syntax, continue if we see keywords that indicate more arguments
      // This handles patterns like "put X into Y", "add X to Y", "remove X from Y", etc.
      const continuationKeywords = ['into', 'from', 'to', 'with', 'by', 'at', 'before', 'after'];
      if (continuationKeywords.some(keyword => this.check(keyword))) {
        // Continue parsing - this is likely part of the command
        continue;
      }
      
      // Also continue if the previous argument was a continuation keyword
      // This handles the case where we just parsed "from" and need to parse the target
      const lastArg = args[args.length - 1];
      if (lastArg && 
          (lastArg.type === 'identifier' || lastArg.type === 'keyword') &&
          continuationKeywords.includes((lastArg as any).name || (lastArg as any).value)) {
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
      column: pos.column
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
      column: pos.column
    } as CommandNode; // TypeScript helper for complex conditional types
  }

  private parseConditionalBranch(): ASTNode {
    // Check if the next token is a command identifier
    if (this.checkTokenType(TokenType.COMMAND)) {
      // Parse as command directly
      const commandToken = this.advance();
      const identifierNode = this.createIdentifier(commandToken.value);
      return this.createCommandFromIdentifier(identifierNode);
    }
    
    // Also check for IDENTIFIER tokens that are commands (backup)
    if (this.checkTokenType(TokenType.IDENTIFIER) || this.checkTokenType(TokenType.KEYWORD)) {
      const token = this.peek();
      
      // Check if this identifier is a known command
      if (this.isCommand(token.value)) {
        // Parse as command
        const identifierToken = this.advance();
        const identifierNode = this.createIdentifier(identifierToken.value);
        return this.createCommandFromIdentifier(identifierNode);
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
    } else if (!this.isAtEnd() && !this.checkTokenType(TokenType.OPERATOR) && !this.check('then') && !this.check('else')) {
      // Parse single argument (like selector)
      args.push(this.parsePrimary());
    }

    return this.createCallExpression(this.createIdentifier(funcName), args);
  }

  private parseMyPropertyAccess(): MemberExpressionNode {
    const property = this.consume(TokenType.IDENTIFIER, "Expected property name after 'my'");
    return this.createMemberExpression(
      this.createIdentifier('me'),
      this.createIdentifier(property.value),
      false
    );
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
      column: pos.column
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
      column: pos.column
    };
  }

  private createBinaryExpression(operator: string, left: ASTNode, right: ASTNode): BinaryExpressionNode {
    const pos = this.getPosition();
    return {
      type: 'binaryExpression',
      operator,
      left,
      right,
      start: pos.start,
      end: pos.end,
      line: pos.line,
      column: pos.column
    };
  }

  private createUnaryExpression(operator: string, argument: ASTNode, prefix: boolean): UnaryExpressionNode {
    const pos = this.getPosition();
    return {
      type: 'unaryExpression',
      operator,
      argument,
      prefix,
      start: pos.start,
      end: pos.end,
      line: pos.line,
      column: pos.column
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
      column: pos.column
    };
  }

  private createMemberExpression(object: ASTNode, property: ASTNode, computed: boolean): MemberExpressionNode {
    const pos = this.getPosition();
    return {
      type: 'memberExpression',
      object,
      property,
      computed,
      start: pos.start,
      end: pos.end,
      line: pos.line,
      column: pos.column
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
      column: pos.column
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
      column: pos.column
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
      column: pos.column
    };
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

  private checkNext(value: string): boolean {
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
      if (this.check(expected as string)) return this.advance();
    }

    this.addError(message);
    return this.peek();
  }

  private addError(message: string): void {
    const token = this.peek();
    let position = token.start || 0;
    let line = token.line || 1;
    let column = token.column || 1;
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
    if (message.includes("parenthes")) {
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
    if (message.includes("Expected expression after")) {
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
    if (message.includes("Missing operand")) {
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
      position: Math.max(0, position),
      line: Math.max(1, line),
      column: Math.max(1, column)
    };
  }

  private getPosition() {
    const token = this.current > 0 ? this.previous() : this.peek();
    return {
      start: token.start || 0,
      end: token.end || 0,
      line: token.line || 1,
      column: token.column || 1
    };
  }
}

// Main parse function
export function parse(input: string): ParseResult {
  const tokens = tokenize(input);
  const parser = new Parser(tokens);
  return parser.parse();
}