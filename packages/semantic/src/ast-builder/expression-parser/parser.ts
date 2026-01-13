/**
 * Expression Parser
 *
 * Parses expression tokens into AST nodes.
 * Uses recursive descent parsing with operator precedence.
 */

import { tokenize, Token, TokenType } from './tokenizer';
import type {
  ExpressionNode,
  LiteralNode,
  TemplateLiteralNode,
  SelectorNode,
  ContextReferenceNode,
  IdentifierNode,
  PropertyAccessNode,
  PossessiveExpressionNode,
  BinaryExpressionNode,
  UnaryExpressionNode,
  CallExpressionNode,
  ArrayLiteralNode,
  ObjectLiteralNode,
  TimeExpressionNode,
  ExpressionParseResult,
  ContextType,
  SelectorKind,
} from './types';

// =============================================================================
// Parser Class
// =============================================================================

export class ExpressionParser {
  private tokens: Token[] = [];
  private current = 0;

  parse(input: string): ExpressionParseResult {
    try {
      this.tokens = tokenize(input);
      this.current = 0;

      if (this.isAtEnd()) {
        return { success: false, error: 'Empty expression' };
      }

      const node = this.parseExpression();
      return { success: true, node, consumed: this.current };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Parse error',
      };
    }
  }

  // =============================================================================
  // Token Navigation
  // =============================================================================

  private peek(): Token {
    return this.tokens[this.current] ?? { type: TokenType.EOF, value: '', start: 0, end: 0 };
  }

  private previous(): Token {
    return this.tokens[this.current - 1] ?? { type: TokenType.EOF, value: '', start: 0, end: 0 };
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.current++;
    }
    return this.previous();
  }

  private check(type: TokenType): boolean {
    return this.peek().type === type;
  }

  private checkValue(value: string): boolean {
    return this.peek().value.toLowerCase() === value.toLowerCase();
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  // =============================================================================
  // Expression Parsing (Precedence Climbing)
  // =============================================================================

  private parseExpression(): ExpressionNode {
    return this.parseOr();
  }

  private parseOr(): ExpressionNode {
    let left = this.parseAnd();

    while (this.checkValue('or')) {
      const operator = this.advance().value;
      const right = this.parseAnd();
      left = this.createBinaryExpression(operator, left, right);
    }

    return left;
  }

  private parseAnd(): ExpressionNode {
    let left = this.parseEquality();

    while (this.checkValue('and')) {
      const operator = this.advance().value;
      const right = this.parseEquality();
      left = this.createBinaryExpression(operator, left, right);
    }

    return left;
  }

  private parseEquality(): ExpressionNode {
    let left = this.parseComparison();

    while (
      this.match(TokenType.COMPARISON) ||
      this.checkValue('is') ||
      this.checkValue('matches') ||
      this.checkValue('contains') ||
      this.checkValue('in')
    ) {
      const operator = this.previous().value;
      const right = this.parseComparison();
      left = this.createBinaryExpression(operator, left, right);
    }

    return left;
  }

  private parseComparison(): ExpressionNode {
    let left = this.parseAddition();

    while (this.check(TokenType.COMPARISON)) {
      const operator = this.advance().value;
      const right = this.parseAddition();
      left = this.createBinaryExpression(operator, left, right);
    }

    return left;
  }

  private parseAddition(): ExpressionNode {
    let left = this.parseMultiplication();

    while (this.peek().value === '+' || this.peek().value === '-') {
      const operator = this.advance().value;
      const right = this.parseMultiplication();
      left = this.createBinaryExpression(operator, left, right);
    }

    return left;
  }

  private parseMultiplication(): ExpressionNode {
    let left = this.parseUnary();

    while (this.peek().value === '*' || this.peek().value === '/' || this.peek().value === '%') {
      const operator = this.advance().value;
      const right = this.parseUnary();
      left = this.createBinaryExpression(operator, left, right);
    }

    return left;
  }

  private parseUnary(): ExpressionNode {
    if (this.checkValue('not') || this.checkValue('no') || this.peek().value === '-') {
      const operator = this.advance().value;
      const operand = this.parseUnary();
      return this.createUnaryExpression(operator, operand);
    }

    return this.parsePostfix();
  }

  private parsePostfix(): ExpressionNode {
    let expr = this.parsePrimary();

    while (true) {
      // Property access with dot: expr.property
      if (this.match(TokenType.DOT)) {
        // Accept IDENTIFIER or CONTEXT_VAR as property name
        if (this.check(TokenType.IDENTIFIER) || this.check(TokenType.CONTEXT_VAR)) {
          const property = this.advance().value;
          expr = this.createPropertyAccess(expr, property);
        } else {
          break;
        }
      }
      // Possessive: expr's property
      else if (this.match(TokenType.POSSESSIVE)) {
        // Accept IDENTIFIER or CONTEXT_VAR as property name
        if (this.check(TokenType.IDENTIFIER) || this.check(TokenType.CONTEXT_VAR)) {
          const property = this.advance().value;
          expr = this.createPossessiveExpression(expr, property);
        } else {
          break;
        }
      }
      // Function call: expr(args)
      else if (this.match(TokenType.LPAREN)) {
        const args = this.parseArguments();
        expr = this.createCallExpression(expr, args);
      }
      // Array access: expr[index]
      else if (this.match(TokenType.LBRACKET)) {
        const index = this.parseExpression();
        if (!this.match(TokenType.RBRACKET)) {
          throw new Error('Expected ] after index');
        }
        expr = this.createPropertyAccess(expr, index);
      } else {
        break;
      }
    }

    return expr;
  }

  private parsePrimary(): ExpressionNode {
    const token = this.peek();

    // Literals
    if (this.match(TokenType.NUMBER)) {
      return this.createLiteral(parseFloat(token.value), 'number', token);
    }

    if (this.match(TokenType.STRING)) {
      const value = token.value.slice(1, -1); // Remove quotes
      return this.createLiteral(value, 'string', token);
    }

    if (this.match(TokenType.BOOLEAN)) {
      const value =
        token.value === 'true'
          ? true
          : token.value === 'false'
            ? false
            : token.value === 'null'
              ? null
              : undefined;
      return this.createLiteral(value, token.value as any, token);
    }

    if (this.match(TokenType.TEMPLATE_LITERAL)) {
      const templateNode: TemplateLiteralNode = {
        type: 'templateLiteral',
        value: token.value,
        start: token.start,
        end: token.end,
        line: token.line,
        column: token.column,
      };
      return templateNode;
    }

    if (this.match(TokenType.TIME_EXPRESSION)) {
      return this.parseTimeExpression(token);
    }

    // Selectors
    if (this.match(TokenType.ID_SELECTOR)) {
      return this.createSelector(token.value, 'id', token);
    }

    if (this.match(TokenType.CLASS_SELECTOR)) {
      return this.createSelector(token.value, 'class', token);
    }

    if (this.match(TokenType.ATTRIBUTE_SELECTOR)) {
      return this.createSelector(token.value, 'attribute', token);
    }

    if (this.match(TokenType.QUERY_SELECTOR)) {
      // Extract selector from <.../>
      const selector = token.value.slice(1, -2);
      return this.createSelector(selector, 'query', token);
    }

    // Context references
    if (this.match(TokenType.CONTEXT_VAR)) {
      return this.createContextReference(token.value as ContextType, token);
    }

    // Identifiers
    if (this.match(TokenType.IDENTIFIER)) {
      return this.createIdentifier(token.value, token);
    }

    // Parenthesized expression
    if (this.match(TokenType.LPAREN)) {
      const expr = this.parseExpression();
      if (!this.match(TokenType.RPAREN)) {
        throw new Error('Expected ) after expression');
      }
      return expr;
    }

    // Array literal
    if (this.match(TokenType.LBRACKET)) {
      return this.parseArrayLiteral();
    }

    // Object literal
    if (this.match(TokenType.LBRACE)) {
      return this.parseObjectLiteral();
    }

    throw new Error(`Unexpected token: ${token.value}`);
  }

  private parseArguments(): ExpressionNode[] {
    const args: ExpressionNode[] = [];

    if (!this.check(TokenType.RPAREN)) {
      do {
        args.push(this.parseExpression());
      } while (this.match(TokenType.COMMA));
    }

    if (!this.match(TokenType.RPAREN)) {
      throw new Error('Expected ) after arguments');
    }

    return args;
  }

  private parseArrayLiteral(): ArrayLiteralNode {
    const elements: ExpressionNode[] = [];
    const start = this.previous().start;

    if (!this.check(TokenType.RBRACKET)) {
      do {
        elements.push(this.parseExpression());
      } while (this.match(TokenType.COMMA));
    }

    if (!this.match(TokenType.RBRACKET)) {
      throw new Error('Expected ] after array elements');
    }

    return {
      type: 'arrayLiteral',
      elements,
      start,
      end: this.previous().end,
    };
  }

  private parseObjectLiteral(): ObjectLiteralNode {
    const properties: Array<{ key: string; value: ExpressionNode }> = [];
    const start = this.previous().start;

    if (!this.check(TokenType.RBRACE)) {
      do {
        let key: string;
        if (this.check(TokenType.STRING)) {
          key = this.advance().value.slice(1, -1);
        } else if (this.check(TokenType.IDENTIFIER)) {
          key = this.advance().value;
        } else {
          throw new Error('Expected property name');
        }

        if (!this.match(TokenType.COLON)) {
          throw new Error('Expected : after property name');
        }

        const value = this.parseExpression();
        properties.push({ key, value });
      } while (this.match(TokenType.COMMA));
    }

    if (!this.match(TokenType.RBRACE)) {
      throw new Error('Expected } after object properties');
    }

    return {
      type: 'objectLiteral',
      properties: properties.map(p => ({
        type: 'objectProperty' as const,
        key: p.key,
        value: p.value,
      })),
      start,
      end: this.previous().end,
    };
  }

  private parseTimeExpression(token: Token): TimeExpressionNode {
    const match = token.value.match(
      /^(\d+(?:\.\d+)?)(ms|s|seconds?|milliseconds?|minutes?|hours?)$/i
    );
    if (!match) {
      throw new Error(`Invalid time expression: ${token.value}`);
    }

    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase() as TimeExpressionNode['unit'];

    return {
      type: 'timeExpression',
      value,
      unit,
      raw: token.value,
      start: token.start,
      end: token.end,
      line: token.line,
      column: token.column,
    };
  }

  // =============================================================================
  // Node Factories
  // =============================================================================

  private createLiteral(
    value: string | number | boolean | null | undefined,
    dataType: LiteralNode['dataType'],
    token: Token
  ): LiteralNode {
    return {
      type: 'literal',
      value,
      dataType,
      raw: token.value,
      start: token.start,
      end: token.end,
      line: token.line,
      column: token.column,
    };
  }

  private createSelector(value: string, kind: SelectorKind, token: Token): SelectorNode {
    return {
      type: 'selector',
      value,
      selector: value,
      selectorType: kind,
      start: token.start,
      end: token.end,
      line: token.line,
      column: token.column,
    };
  }

  private createContextReference(contextType: ContextType, token: Token): ContextReferenceNode {
    return {
      type: 'contextReference',
      contextType,
      name: token.value,
      start: token.start,
      end: token.end,
      line: token.line,
      column: token.column,
    };
  }

  private createIdentifier(name: string, token: Token): IdentifierNode {
    return {
      type: 'identifier',
      name,
      start: token.start,
      end: token.end,
      line: token.line,
      column: token.column,
    };
  }

  private createPropertyAccess(
    object: ExpressionNode,
    property: string | ExpressionNode
  ): PropertyAccessNode {
    return {
      type: 'propertyAccess',
      object,
      property: typeof property === 'string' ? property : ((property as any).name ?? ''),
      start: object.start,
      end: this.previous().end,
    };
  }

  private createPossessiveExpression(
    object: ExpressionNode,
    property: string
  ): PossessiveExpressionNode {
    return {
      type: 'possessiveExpression',
      object,
      property,
      start: object.start,
      end: this.previous().end,
    };
  }

  private createBinaryExpression(
    operator: string,
    left: ExpressionNode,
    right: ExpressionNode
  ): BinaryExpressionNode {
    return {
      type: 'binaryExpression',
      operator,
      left,
      right,
      start: left.start,
      end: right.end,
    };
  }

  private createUnaryExpression(operator: string, operand: ExpressionNode): UnaryExpressionNode {
    return {
      type: 'unaryExpression',
      operator,
      operand,
      prefix: true,
      start: this.previous().start,
      end: operand.end,
    };
  }

  private createCallExpression(callee: ExpressionNode, args: ExpressionNode[]): CallExpressionNode {
    return {
      type: 'callExpression',
      callee,
      arguments: args,
      start: callee.start,
      end: this.previous().end,
    };
  }
}

// =============================================================================
// Convenience Function
// =============================================================================

/**
 * Parse an expression string into an AST node.
 *
 * @param input - The expression string to parse
 * @returns The parse result with success status and node or error
 */
export function parseExpression(input: string): ExpressionParseResult {
  const parser = new ExpressionParser();
  return parser.parse(input);
}
