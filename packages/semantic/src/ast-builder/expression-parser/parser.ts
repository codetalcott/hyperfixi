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
  IdentifierNode,
  AttributeAccessNode,
  MemberExpressionNode,
  PossessiveExpressionNode,
  PropertyOfExpressionNode,
  BinaryExpressionNode,
  UnaryExpressionNode,
  TypeCheckExpressionNode,
  AsExpressionNode,
  CallExpressionNode,
  ArrayLiteralNode,
  ObjectLiteralNode,
  TimeExpressionNode,
  ExpressionParseResult,
  SelectorKind,
} from './types';

// =============================================================================
// Parser Class
// =============================================================================

/** Context vars whose SPACE form (`my value`) is a possessive property access. */
const POSSESSIVE_CONTEXT_TYPES = new Set(['my', 'its', 'your']);

/** Possessive context words → the base word the traditional parser's fold
 *  emits as the member-expression object (`my value` → `identifier{me}`). */
const POSSESSIVE_BASE: Record<string, string> = { my: 'me', its: 'it', your: 'you' };

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

/**
 * Core's keyword comparison operators (its parser's comparison fragment), in
 * the shapes core's runtime evaluates. A binary phrase is the operator of a
 * binaryExpression, a postfix one tests its left operand alone, and a type
 * check reads the next word as a type name. Only `is`, `is empty` and `is not
 * empty` were read, one word at a time, so `p is not q` became `p is (not q)`
 * and `p is less than q` compared p with a variable named `less` — in every
 * translation, since buildAST parses a translated condition here.
 */
export const BINARY_PHRASES = [
  'is not really equal to',
  'is really equal to',
  'is greater than or equal to',
  'is less than or equal to',
  'is not equal to',
  'is equal to',
  'is greater than',
  'is less than',
  'is not really',
  'is really',
  'is not equal',
  'is equal',
  'is not in',
  'is in',
  'is not',
  'is',
  'am not in',
  'am in',
  'am',
  'does not match',
  'do not match',
  'does not contain',
  'does not contains',
  'do not contain',
  'does not include',
  'does not precede',
  'does not follow',
  'precedes',
  'follows',
  'really equals',
  'equals',
  'matches',
  'match',
  'contains',
  'contain',
  'includes',
  'include',
  'has',
  'have',
  'in',
];
export const POSTFIX_PHRASES = ['is not empty', 'is empty', 'does not exist'];
export const TYPE_CHECK_PHRASES = ['is not an', 'is not a', 'is an', 'is a'];

/**
 * Every phrase as its words, in match order: each is listed before any phrase
 * whose words begin it, so `is not in` is never read as `is not`, nor `is not`
 * as `is`.
 */
const COMPARISON_PHRASES: ReadonlyArray<readonly [string, readonly string[]]> = [
  ...POSTFIX_PHRASES,
  ...TYPE_CHECK_PHRASES,
  ...BINARY_PHRASES,
].map(phrase => [phrase, phrase.split(' ')] as const);

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
      if (this.match(TokenType.COMPARISON)) {
        // match() already consumed the symbolic comparison token.
        const operator = this.previous().value;
        left = this.createBinaryExpression(operator, left, this.parseComparison());
        continue;
      }
      // Keyword operators are tokenized a word at a time, so a phrase is
      // matched here and consumed whole (see COMPARISON_PHRASES).
      const phrase = this.matchComparisonPhrase();
      if (phrase === undefined) break;
      if (POSTFIX_PHRASES.includes(phrase)) {
        left = this.createPostfixUnary(phrase, left);
      } else if (TYPE_CHECK_PHRASES.includes(phrase)) {
        left = this.parseTypeCheck(left, phrase.startsWith('is not'));
      } else {
        // `match` is the corpus's bare alias of `matches`.
        const operator = phrase === 'match' ? 'matches' : phrase;
        left = this.createBinaryExpression(operator, left, this.parseComparison());
      }
    }

    return left;
  }

  /** The comparison phrase whose words come next, consumed; undefined (nothing consumed) if none. */
  private matchComparisonPhrase(): string | undefined {
    for (const [phrase, words] of COMPARISON_PHRASES) {
      if (words.every((word, i) => this.peekAt(i).value.toLowerCase() === word)) {
        for (let i = 0; i < words.length; i++) this.advance();
        return phrase;
      }
    }
    return undefined;
  }

  /** `is a Number`, `is not an Array!`: the type name is a word, and `!` makes null fail. */
  private parseTypeCheck(value: ExpressionNode, negated: boolean): TypeCheckExpressionNode {
    const typeName = this.advance();
    if (typeName.type === TokenType.EOF) {
      throw new Error(`Expected a type name after 'is ${negated ? 'not ' : ''}a'`);
    }
    let nullOk = true;
    if (this.peek().value === '!') {
      this.advance();
      nullOk = false;
    }
    return {
      type: 'typeCheckExpression',
      value,
      typeName: typeName.value,
      nullOk,
      negated,
      start: value.start,
      end: this.previous().end,
    };
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
    let left = this.parseConversion();

    while (
      this.peek().value === '*' ||
      this.peek().value === '/' ||
      this.peek().value === '%' ||
      this.checkValue('mod')
    ) {
      const operator = this.advance().value.toLowerCase();
      const right = this.parseConversion();
      left = this.createBinaryExpression(operator, left, right);
    }

    return left;
  }

  /**
   * `value as Type`, bound as core and upstream bind it: tighter than
   * arithmetic, looser than a prefix operator. `n + 1 as Int` converts the
   * `1`, and `-n as Int` converts `-n`. The type is one word, after an
   * optional article (`as an Object`). Without this the parser stopped at
   * `as`, so a value with a conversion inside it (`#a's textContent as Int +
   * 1`) was not read whole, and buildAST dropped the conversion.
   *
   * A pipe chains conversions left to right, each converting the last one's
   * result (`value as JSONString | JSON`), as core and upstream read it. The
   * tokenizer used to skip `|`, so this read `as JSONString JSON` and stopped
   * after the first type.
   */
  private parseConversion(): ExpressionNode {
    let expr = this.parseUnary();
    while (this.checkValue('as') && this.conversionTypeAt(1) !== undefined) {
      this.advance(); // as
      expr = this.createAsExpression(expr, this.parseConversionType());
      while (this.check(TokenType.PIPE) && this.conversionTypeAt(1) !== undefined) {
        this.advance(); // |
        expr = this.createAsExpression(expr, this.parseConversionType());
      }
    }
    return expr;
  }

  /** The offset of the type word from `offset`, past an article; undefined if none. */
  private conversionTypeAt(offset: number): number | undefined {
    const article = this.peekAt(offset).value.toLowerCase();
    const at = article === 'a' || article === 'an' ? offset + 1 : offset;
    return this.peekAt(at).type === TokenType.IDENTIFIER ? at : undefined;
  }

  /**
   * The type, past its article. A `:` suffix is part of it (`as Fixed:2`,
   * `as Values:Form`), as core reads it.
   */
  private parseConversionType(): Token {
    const at = this.conversionTypeAt(0) ?? 0;
    for (let i = 0; i < at; i++) this.advance(); // the article
    const type = this.advance();
    const suffixType = this.peekAt(1).type;
    if (
      !this.check(TokenType.COLON) ||
      (suffixType !== TokenType.NUMBER && suffixType !== TokenType.IDENTIFIER)
    ) {
      return type;
    }
    this.advance(); // :
    const suffix = this.advance();
    return { ...type, value: `${type.value}:${suffix.value}`, end: suffix.end };
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
          const property = this.advance();
          expr = this.createMemberExpression(
            expr,
            this.createIdentifier(property.value, property),
            false
          );
        } else {
          break;
        }
      }
      // Possessive: expr's property
      else if (this.match(TokenType.POSSESSIVE)) {
        // Accept IDENTIFIER or CONTEXT_VAR as property name
        if (this.check(TokenType.IDENTIFIER) || this.check(TokenType.CONTEXT_VAR)) {
          const property = this.advance();
          expr = this.createPossessiveExpression(
            expr,
            this.createIdentifier(property.value, property)
          );
        } else {
          break;
        }
      }
      // Function call: expr(args)
      else if (this.match(TokenType.LPAREN)) {
        const args = this.parseArguments();
        expr = this.createCallExpression(expr, args);
      }
      // Array access: expr[index] — computed member access, the traditional
      // parser's shape (`me[0]` → memberExpression{property: literal 0,
      // computed: true}).
      else if (this.match(TokenType.LBRACKET)) {
        const index = this.parseExpression();
        if (!this.match(TokenType.RBRACKET)) {
          throw new Error('Expected ] after index');
        }
        expr = this.createMemberExpression(expr, index, true);
      }
      // Possessive SPACE form: `my value`, `its length`, `your name` — a
      // possessive context var followed directly by a plain identifier is the
      // hyperscript possessive without the `'s`/dot. Folded to the traditional
      // parser's exact shape: memberExpression with the possessive word
      // normalised to its BASE (`my value` → object `identifier{me}`,
      // property `identifier{value}`). Gated to a possessive context-word
      // head so `foo bar` never folds, and the identifier must not be an
      // operator keyword (`my value is empty` folds `my value`, leaves
      // `is empty` alone).
      else if (
        expr.type === 'identifier' &&
        POSSESSIVE_CONTEXT_TYPES.has((expr as IdentifierNode).name) &&
        this.check(TokenType.IDENTIFIER) &&
        !POSTFIX_STOP_WORDS.has(this.peek().value.toLowerCase())
      ) {
        const property = this.advance();
        const head = expr as IdentifierNode;
        const base: IdentifierNode = { ...head, name: POSSESSIVE_BASE[head.name] ?? head.name };
        expr = this.createMemberExpression(
          base,
          this.createIdentifier(property.value, property),
          false
        );
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

    // `the textContent of #d1`: core's propertyOfExpression. The article was
    // read as a variable named `the`, and the rest of the condition was lost.
    if (
      this.checkValue('the') &&
      (this.peekAt(1).type === TokenType.IDENTIFIER ||
        this.peekAt(1).type === TokenType.CONTEXT_VAR) &&
      this.peekAt(2).value.toLowerCase() === 'of'
    ) {
      this.advance(); // the
      // Above `as`: core converts the property (`the value of #inp as Int`),
      // a known difference from upstream (core's THE_OF_TARGET_BP).
      return this.parsePropertyOf(this.advance(), token, false);
    }

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
      // `value` is the template's CONTENT, with its backticks stripped — the
      // tokenizer hands them over, and the one consumer that reads this field
      // (core's evaluator, via `buildAST`) interpolates the value as-is and
      // emits whatever it is given. Keeping the delimiters made the semantic
      // path PRINT them: `log \`t ${1}\`` logged "`t 1`" where the traditional
      // parser, whose own tokenizer strips them, logged "t 1".
      //
      // Safe here rather than at the consumer: `interchange/from-semantic.ts`
      // reads `raw ?? value` (falling back to this content since the empty-
      // literal fix — `raw` is never set on this node), and nothing else in
      // this package reads it.
      const raw = token.value;
      const templateNode: TemplateLiteralNode = {
        type: 'templateLiteral',
        value: raw.length >= 2 && raw.startsWith('`') && raw.endsWith('`') ? raw.slice(1, -1) : raw,
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
      const attribute = {
        type: 'attributeAccess',
        attributeName: token.value.slice(1),
        start: token.start,
        end: token.end,
      } as AttributeAccessNode;
      // `@title of #a`: the attribute of the target, in core's shape (a
      // binary `of`). The parser stopped at `of`, so the value was cut to
      // `@title`, which reads `me`'s.
      if (this.checkValue('of')) {
        this.advance(); // of
        return this.createBinaryExpression('of', attribute, this.parseConversion());
      }
      return attribute;
    }

    if (this.match(TokenType.QUERY_SELECTOR)) {
      // Extract selector from <.../>
      const selector = token.value.slice(1, -2);
      return this.createSelector(selector, 'query', token);
    }

    // Context words (`me`, `it`, `you`, `event`, …) — emitted as plain
    // identifiers, the traditional parser's spelling (Thread B item 5); the
    // core evaluator resolves them by name. Possessive forms (`my`/`its`/
    // `your`) keep their own name here so parsePostfix's space-form fold can
    // recognise them; the fold normalises to the base word.
    if (this.match(TokenType.CONTEXT_VAR)) {
      return this.createIdentifier(token.value, token);
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
      // `textContent of #d1`, which is what a translated `#d1's textContent`
      // joins back to (es `textContent de #d1`). Read as tight as a possessive,
      // as upstream does; core binds `of` as loosely as `is`, so its English
      // `if textContent of #d1 is "d"` compares #d1 with "d".
      if (this.checkValue('of')) {
        return this.parsePropertyOf(token, token);
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

  /**
   * `<property> of <target>`, the property token consumed and `of` next. The
   * target is a unary operand with its chain and, unless `the` began the
   * phrase, a conversion: upstream reads `v of obj as Int` as `v of (obj as
   * Int)`, and so does core.
   */
  private parsePropertyOf(
    property: Token,
    first: Token,
    targetTakesAs = true
  ): PropertyOfExpressionNode {
    this.advance(); // of
    const target = targetTakesAs ? this.parseConversion() : this.parseUnary();
    return {
      type: 'propertyOfExpression',
      property: this.createIdentifier(property.value, property),
      target,
      start: first.start,
      end: this.previous().end,
    };
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
        } else if (this.check(TokenType.IDENTIFIER) || this.check(TokenType.CONTEXT_VAR)) {
          // A context-variable name is an ordinary property name in key position:
          // `{ body: 'a=1' }` is a fetch option, not a reference to `body`. Same for
          // `me`, `it`, `result`, `event`, `target`, `detail`, `window`, `document`.
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

  /**
   * Member access in the traditional parser's exact shape — nested nodes,
   * `property` an expression node, explicit `computed`. Replaces the flat
   * `propertyAccess` (string property) this parser used to emit, which
   * forced core to carry a parallel evaluator arm for the same meaning.
   */
  private createMemberExpression(
    object: ExpressionNode,
    property: ExpressionNode,
    computed: boolean
  ): MemberExpressionNode {
    return {
      type: 'memberExpression',
      object,
      property,
      computed,
      start: object.start,
      end: this.previous().end,
    };
  }

  /**
   * `#d1's textContent`, with the property an identifier node as core's parser
   * builds it: core's runtime reads `property.name`, so the bare string this
   * emitted read as no property at all (`if #d1's textContent is "d"` was false
   * in every translation that renders the `'s`).
   */
  private createPossessiveExpression(
    object: ExpressionNode,
    property: IdentifierNode
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

  private createAsExpression(expression: ExpressionNode, type: Token): AsExpressionNode {
    return {
      type: 'asExpression',
      expression,
      targetType: this.createIdentifier(type.value, type),
      start: expression.start,
      end: type.end,
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
