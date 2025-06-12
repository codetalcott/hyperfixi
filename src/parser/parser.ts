/**
 * Hyperscript Parser
 * Converts tokens into Abstract Syntax Tree (AST) 
 * Handles hyperscript's unique natural language syntax
 */

import { tokenize, TokenType } from './tokenizer.js';
import type { 
  Token, 
  ASTNode,
  CommandNode,
  ExpressionNode,
  ParseResult as CoreParseResult, 
  ParseError as CoreParseError 
} from '../types/core.js';

// Use core types for consistency
export type ParseResult = CoreParseResult;
export type ParseError = CoreParseError;

// Additional AST node types for hyperscript-specific constructs
interface LiteralNode extends ASTNode {
  type: 'literal';
  value: any;
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

interface EventHandlerNode extends ASTNode {
  type: 'eventHandler';
  event: string;
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
      const ast = this.parseExpression();
      return {
        success: true,
        node: ast,
        tokens: this.tokens,
        error: this.error
      };
    } catch (error) {
      this.addError(error instanceof Error ? error.message : 'Unknown parsing error');
      return {
        success: false,
        node: this.createErrorNode(),
        tokens: this.tokens,
        error: this.error
      };
    }
  }

  private parseExpression(): ASTNode {
    return this.parseLogicalOr();
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

    while (this.matchTokenType(TokenType.COMPARISON_OPERATOR) || this.match('is', 'matches', 'contains', 'in', 'of')) {
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
      const right = this.parseMultiplication();
      expr = this.createBinaryExpression(operator, expr, right);
    }

    return expr;
  }

  private parseMultiplication(): ASTNode {
    let expr = this.parseUnary();

    while (this.match('*', '/', '%', 'mod')) {
      const operator = this.previous().value;
      const right = this.parseUnary();
      expr = this.createBinaryExpression(operator, expr, right);
    }

    return expr;
  }

  private parseUnary(): ASTNode {
    if (this.match('not', '-', '+')) {
      const operator = this.previous().value;
      const expr = this.parseUnary();
      return this.createUnaryExpression(operator, expr, true);
    }

    return this.parseCall();
  }

  private parseCall(): ASTNode {
    let expr = this.parsePrimary();

    while (true) {
      if (this.match('(')) {
        expr = this.finishCall(expr);
      } else if (this.match('.')) {
        const name = this.consume(TokenType.IDENTIFIER, "Expected property name after '.'");
        expr = this.createMemberExpression(expr, this.createIdentifier(name.value), false);
      } else if (this.match('[')) {
        const index = this.parseExpression();
        this.consume(']', "Expected ']' after array index");
        expr = this.createMemberExpression(expr, index, true);
      } else if (this.check("'s") || this.checkSequence("'", 's')) {
        // Handle possessive syntax: element's property
        this.consumePossessive();
        const property = this.consume(TokenType.IDENTIFIER, "Expected property name after possessive");
        expr = this.createPossessiveExpression(expr, this.createIdentifier(property.value));
      } else {
        break;
      }
    }

    return expr;
  }

  private parsePrimary(): ASTNode {
    // Handle literals
    if (this.matchTokenType(TokenType.NUMBER)) {
      const value = parseFloat(this.previous().value);
      return this.createLiteral(value, this.previous().value);
    }

    if (this.matchTokenType(TokenType.STRING)) {
      const raw = this.previous().value;
      const value = raw.slice(1, -1); // Remove quotes
      return this.createLiteral(value, raw);
    }

    if (this.matchTokenType(TokenType.BOOLEAN)) {
      const value = this.previous().value === 'true';
      return this.createLiteral(value, this.previous().value);
    }

    // Handle CSS selectors
    if (this.matchTokenType(TokenType.CSS_SELECTOR) || this.matchTokenType(TokenType.ID_SELECTOR) || this.matchTokenType(TokenType.CLASS_SELECTOR)) {
      return this.createSelector(this.previous().value);
    }

    // Handle hyperscript selector syntax: <button/>
    if (this.match('<')) {
      return this.parseHyperscriptSelector();
    }

    // Handle parenthesized expressions
    if (this.match('(')) {
      const expr = this.parseExpression();
      this.consume(')', "Expected ')' after expression");
      return expr;
    }

    // Handle identifiers and keywords
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
      if (token.value === 'closest' || token.value === 'first' || token.value === 'last') {
        return this.parseNavigationFunction(token.value);
      }

      // Handle "my" property access
      if (token.value === 'my') {
        return this.parseMyPropertyAccess();
      }

      return this.createIdentifier(token.value);
    }

    this.addError(`Unexpected token: ${this.peek().value}`);
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

  private parseEventHandler(): EventHandlerNode {
    const event = this.consume(TokenType.EVENT, "Expected event name after 'on'").value;
    
    // Optional: handle "from selector"
    let selector: string | undefined;
    if (this.match('from')) {
      const selectorToken = this.advance();
      selector = selectorToken.value;
    }

    // Parse commands
    const commands: CommandNode[] = [];
    
    do {
      if (this.matchTokenType(TokenType.COMMAND)) {
        commands.push(this.parseCommand());
      } else {
        break;
      }
    } while (this.match('then', 'and'));

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

    if (selector) {
      node.selector = selector;
    }

    return node;
  }

  private parseCommand(): CommandNode {
    const commandToken = this.previous();
    const args: ASTNode[] = [];

    // Parse command arguments based on command type
    while (!this.isAtEnd() && !this.check('then') && !this.check('else') && !this.checkTokenType(TokenType.COMMAND)) {
      args.push(this.parseExpression());
      
      // Break after parsing one argument for most commands
      if (!this.match(',')) {
        break;
      }
    }

    const pos = this.getPosition();
    return {
      type: 'command',
      name: commandToken.value,
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
    const consequent = this.parseExpression();
    
    let alternate: ASTNode | undefined;
    if (this.match('else')) {
      alternate = this.parseExpression();
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
    } as any; // TypeScript helper for complex conditional types
  }

  private parseNavigationFunction(funcName: string): CallExpressionNode {
    const args: ASTNode[] = [];
    
    // Handle "first of items", "closest <form/>", etc.
    if (this.match('of')) {
      args.push(this.parseExpression());
    } else if (!this.isAtEnd() && !this.checkTokenType(TokenType.OPERATOR)) {
      args.push(this.parseExpression());
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
  private createLiteral(value: any, raw: string): LiteralNode {
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

  private checkSequence(...values: string[]): boolean {
    for (let i = 0; i < values.length; i++) {
      if (this.current + i >= this.tokens.length) return false;
      if (this.tokens[this.current + i].value !== values[i]) return false;
    }
    return true;
  }

  private consumePossessive(): void {
    if (this.check("'s")) {
      this.advance();
    } else {
      this.consume("'", "Expected ''' in possessive");
      this.consume('s', "Expected 's' after ''' in possessive");
    }
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
    if (typeof expected === 'string') {
      if (this.check(expected)) return this.advance();
    } else {
      if (this.checkTokenType(expected)) return this.advance();
    }

    this.addError(message);
    return this.peek();
  }

  private addError(message: string): void {
    const token = this.peek();
    this.error = {
      message,
      position: token.start,
      line: token.line,
      column: token.column
    };
  }

  private getPosition() {
    const token = this.previous();
    return {
      start: token.start,
      end: token.end,
      line: token.line,
      column: token.column
    };
  }
}

// Main parse function
export function parse(input: string): ParseResult {
  const tokens = tokenize(input);
  const parser = new Parser(tokens);
  return parser.parse();
}