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
  AttributeAccessNode,
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

/** Context vars whose SPACE form (`my value`) is a possessive property access. */
const POSSESSIVE_CONTEXT_TYPES = new Set(['my', 'its', 'your']);

/**
 * Identifier-typed operator keywords that must never be folded as a possessive
 * space-form property (`my value is empty` folds `value`, stops at `is`).
 */
const POSTFIX_STOP_WORDS = new Set(['is', 'matches', 'match', 'contains', 'in', 'exists', 'does']);

/**
 * Positional builtins folded to a call expression when followed by a selector
 * (`next .dropdown-menu` → next('.dropdown-menu')). Matches the set the core
 * runtime's call evaluator dispatches to positional expressions.
 */
const POSITIONAL_CALL_KEYWORDS = new Set(['next', 'previous', 'closest', 'first', 'last']);

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

  private peekAt(offset: number): Token {
    return (
      this.tokens[this.current + offset] ?? { type: TokenType.EOF, value: '', start: 0, end: 0 }
    );
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

    while (true) {
      let operator: string;
      if (this.match(TokenType.COMPARISON)) {
        // match() already consumed the symbolic comparison token.
        operator = this.previous().value;
      } else if (
        this.checkValue('is') ||
        this.checkValue('matches') ||
        this.checkValue('match') ||
        this.checkValue('contains') ||
        this.checkValue('in')
      ) {
        // Keyword infix operators are tokenized as IDENTIFIER, so they must be
        // CONSUMED here (checkValue only peeks — mirrors the advance() in
        // parseAnd/parseOr). Reading previous() without advancing left the
        // operator unconsumed and mis-attributed the operand (e.g. `target
        // matches .x` parsed as a broken `matches.x` member access). `match` is
        // the corpus's bare alias of `matches`.
        const raw = this.advance().value;
        operator = raw.toLowerCase() === 'match' ? 'matches' : raw;
      } else {
        break;
      }
      // `is empty` / `is not empty` are UNARY predicates on the left operand
      // (the core runtime evaluates them via its isEmpty/isNotEmpty
      // expressions), not a binary comparison against an `empty` identifier.
      if (operator.toLowerCase() === 'is') {
        if (this.checkValue('empty')) {
          this.advance();
          left = this.createPostfixUnary('is empty', left);
          continue;
        }
        if (this.checkValue('not') && this.peekAt(1).value.toLowerCase() === 'empty') {
          this.advance();
          this.advance();
          left = this.createPostfixUnary('is not empty', left);
          continue;
        }
      }
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
      }
      // Possessive SPACE form: `my value`, `its length`, `your name` — a
      // possessive context var followed directly by a plain identifier is the
      // hyperscript possessive without the `'s`/dot. Folded to a propertyAccess
      // (string property — the runtime resolves Element props through
      // getElementProperty). Gated to a contextReference head so `foo bar`
      // never folds, and the identifier must not be an operator keyword
      // (`my value is empty` folds `my value`, leaves `is empty` alone).
      else if (
        expr.type === 'contextReference' &&
        POSSESSIVE_CONTEXT_TYPES.has((expr as { contextType?: string }).contextType ?? '') &&
        this.check(TokenType.IDENTIFIER) &&
        !POSTFIX_STOP_WORDS.has(this.peek().value.toLowerCase())
      ) {
        const property = this.advance().value;
        expr = this.createPropertyAccess(expr, property);
      }
      // Postfix `exists` predicate: `#modal exists`, `result exists` — a unary
      // existence check the core runtime evaluates via its `exists` expression.
      // Not taken when `exists` is being CALLED (`exists(...)`).
      else if (this.checkValue('exists') && this.peekAt(1).type !== TokenType.LPAREN) {
        this.advance();
        expr = this.createPostfixUnary('exists', expr);
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
      const dataTypeMap: Record<string, LiteralNode['dataType']> = {
        true: 'boolean',
        false: 'boolean',
        null: 'null',
        undefined: 'undefined',
      };
      return this.createLiteral(value, dataTypeMap[token.value] ?? 'string', token);
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

    // Bare attribute reference: `@disabled` → attributeAccess (the canonical
    // core-parser shape; the runtime reads it via getAttribute, and set/toggle
    // route it to setAttribute).
    if (this.match(TokenType.ATTRIBUTE_REF)) {
      return {
        type: 'attributeAccess',
        attributeName: token.value.slice(1),
        start: token.start,
        end: token.end,
      } as AttributeAccessNode;
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
      // Positional builtin + selector operand (`next .dropdown-menu`,
      // `closest .modal`) → a call expression. The core runtime's positional
      // expressions evaluate exactly this shape (its call evaluator passes
      // selector args as raw strings). Without the fold, `next .dropdown-menu`
      // mangled into `next.dropdown - menu`.
      if (
        POSITIONAL_CALL_KEYWORDS.has(token.value.toLowerCase()) &&
        (this.check(TokenType.CLASS_SELECTOR) ||
          this.check(TokenType.ID_SELECTOR) ||
          this.check(TokenType.QUERY_SELECTOR))
      ) {
        const selToken = this.advance();
        const selValue =
          selToken.type === TokenType.QUERY_SELECTOR ? selToken.value.slice(1, -2) : selToken.value;
        const kind: SelectorKind =
          selToken.type === TokenType.CLASS_SELECTOR
            ? 'class'
            : selToken.type === TokenType.ID_SELECTOR
              ? 'id'
              : 'query';
        return {
          type: 'callExpression',
          callee: this.createIdentifier(token.value, token),
          arguments: [this.createSelector(selValue, kind, selToken)],
          start: token.start,
          end: selToken.end,
        } as CallExpressionNode;
      }
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
      property:
        typeof property === 'string'
          ? property
          : property.type === 'identifier'
            ? (property as IdentifierNode).name
            : '',
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

  /** Postfix unary predicate (`X exists`, `X is empty`): operand precedes the operator. */
  private createPostfixUnary(operator: string, operand: ExpressionNode): UnaryExpressionNode {
    return {
      type: 'unaryExpression',
      operator,
      operand,
      prefix: false,
      start: operand.start,
      end: this.previous().end,
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
