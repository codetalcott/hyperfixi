/**
 * HyperFixi Hybrid Parser - Parser Core
 *
 * Recursive descent parser with operator precedence.
 * Supports ~85% of hyperscript syntax.
 */

import type { Token, TokenType } from './tokenizer';
import { tokenize } from './tokenizer';
import type { ASTNode, CommandNode, BlockNode, EventNode, EventModifiers } from './ast-types';
import { normalizeCommand, normalizeEvent } from './aliases';

export class HybridParser {
  private tokens: Token[];
  private pos = 0;

  constructor(code: string) {
    this.tokens = tokenize(code);
  }

  private peek(offset = 0): Token {
    return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)];
  }

  private advance(): Token {
    return this.tokens[this.pos++];
  }

  private match(...values: string[]): boolean {
    const token = this.peek();
    return values.some(v => token.value.toLowerCase() === v.toLowerCase());
  }

  private matchType(...types: TokenType[]): boolean {
    return types.includes(this.peek().type);
  }

  private expect(value: string): Token {
    // Accept exact match or alias that normalizes to the expected value
    if (!this.match(value) && normalizeCommand(this.peek().value) !== value) {
      throw new Error(`Expected '${value}', got '${this.peek().value}'`);
    }
    return this.advance();
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'eof';
  }

  parse(): ASTNode {
    if (this.match('on')) return this.parseEventHandler();
    if (this.match('init')) {
      this.advance();
      return { type: 'event', event: 'init', modifiers: {}, body: this.parseCommandSequence() };
    }
    if (this.match('every')) return this.parseEveryHandler();
    return { type: 'sequence', commands: this.parseCommandSequence() };
  }

  private parseEventHandler(): EventNode {
    this.expect('on');
    const eventName = this.advance().value;
    const modifiers: EventModifiers = {};
    let filter: ASTNode | undefined;

    // Parse event modifiers: .once, .prevent, .stop, .debounce(N), .throttle(N)
    while (this.peek().value === '.') {
      this.advance();
      const mod = this.advance().value.toLowerCase();
      if (mod === 'once') modifiers.once = true as true;
      else if (mod === 'prevent') modifiers.prevent = true as true;
      else if (mod === 'stop') modifiers.stop = true as true;
      else if (mod === 'debounce' || mod === 'throttle') {
        if (this.peek().value === '(') {
          this.advance();
          const num = this.advance().value;
          this.expect(')');
          if (mod === 'debounce') modifiers.debounce = parseInt(num) || 100;
          else modifiers.throttle = parseInt(num) || 100;
        }
      }
    }

    // Parse from clause
    if (this.match('from')) {
      this.advance();
      filter = this.parseExpression();
    }

    return {
      type: 'event',
      event: normalizeEvent(eventName),
      filter,
      modifiers,
      body: this.parseCommandSequence(),
    };
  }

  private parseEveryHandler(): EventNode {
    this.expect('every');
    const interval = this.advance().value;
    return {
      type: 'event',
      event: `interval:${interval}`,
      modifiers: {},
      body: this.parseCommandSequence(),
    };
  }

  private parseCommandSequence(): ASTNode[] {
    const commands: ASTNode[] = [];
    while (!this.isAtEnd() && !this.match('end', 'else')) {
      const cmd = this.parseCommand();
      if (cmd) commands.push(cmd);
      if (this.match('then', 'and')) this.advance();
    }
    return commands;
  }

  private parseCommand(): ASTNode | null {
    // Control flow blocks
    if (this.match('if', 'unless')) return this.parseIf();
    if (this.match('repeat')) return this.parseRepeat();
    if (this.match('for')) return this.parseFor();
    if (this.match('while')) return this.parseWhile();
    if (this.match('fetch')) return this.parseFetchBlock();

    // Commands
    const cmdMap: Record<string, () => CommandNode> = {
      toggle: () => this.parseToggle(),
      add: () => this.parseAdd(),
      remove: () => this.parseRemove(),
      put: () => this.parsePut(),
      append: () => this.parseAppend(),
      set: () => this.parseSet(),
      get: () => this.parseGet(),
      call: () => this.parseCall(),
      log: () => this.parseLog(),
      send: () => this.parseSend(),
      trigger: () => this.parseSend(),
      wait: () => this.parseWait(),
      show: () => this.parseShow(),
      hide: () => this.parseHide(),
      take: () => this.parseTake(),
      increment: () => this.parseIncDec('increment'),
      decrement: () => this.parseIncDec('decrement'),
      focus: () => this.parseFocusBlur('focus'),
      blur: () => this.parseFocusBlur('blur'),
      go: () => this.parseGo(),
      return: () => this.parseReturn(),
      transition: () => this.parseTransition(),
    };

    const normalized = normalizeCommand(this.peek().value);
    if (cmdMap[normalized]) {
      return cmdMap[normalized]();
    }

    if (!this.isAtEnd() && !this.match('then', 'and', 'end', 'else')) {
      this.advance();
    }
    return null;
  }

  // Control flow parsing
  private parseIf(): BlockNode {
    const isUnless = this.match('unless');
    this.advance();
    const condition = this.parseExpression();
    const body = this.parseCommandSequence();
    let elseBody: ASTNode[] | undefined;

    if (this.match('else')) {
      this.advance();
      elseBody = this.parseCommandSequence();
    }
    if (this.match('end')) this.advance();

    return {
      type: 'if',
      condition: isUnless ? { type: 'unary', operator: 'not', operand: condition } : condition,
      body,
      elseBody,
    };
  }

  private parseRepeat(): BlockNode {
    this.expect('repeat');
    let count: ASTNode | undefined;
    if (!this.match('until', 'while', 'forever')) {
      count = this.parseExpression();
      if (this.match('times')) this.advance();
    }
    const body = this.parseCommandSequence();
    if (this.match('end')) this.advance();
    return { type: 'repeat', condition: count, body };
  }

  private parseFor(): BlockNode {
    this.expect('for');
    if (this.match('each')) this.advance();
    const variable = this.advance().value;
    this.expect('in');
    const iterable = this.parseExpression();
    const body = this.parseCommandSequence();
    if (this.match('end')) this.advance();
    return { type: 'for', condition: { type: 'forCondition', variable, iterable }, body };
  }

  private parseWhile(): BlockNode {
    this.expect('while');
    const condition = this.parseExpression();
    const body = this.parseCommandSequence();
    if (this.match('end')) this.advance();
    return { type: 'while', condition, body };
  }

  private parseFetchBlock(): BlockNode {
    this.expect('fetch');
    const url = this.parseExpression();
    let responseType: ASTNode = { type: 'literal', value: 'text' };

    if (this.match('as')) {
      this.advance();
      responseType = this.parseExpression();
    }
    if (this.match('then')) this.advance();

    const body = this.parseCommandSequence();
    return { type: 'fetch', condition: { type: 'fetchConfig', url, responseType }, body };
  }

  // Command parsing
  private parseToggle(): CommandNode {
    this.expect('toggle');
    const what = this.parseExpression();
    let target: ASTNode | undefined;
    if (this.match('on')) {
      this.advance();
      target = this.parseExpression();
    }
    return { type: 'command', name: 'toggle', args: [what], target };
  }

  private parseAdd(): CommandNode {
    this.expect('add');
    const what = this.parseExpression();
    let target: ASTNode | undefined;
    if (this.match('to')) {
      this.advance();
      target = this.parseExpression();
    }
    return { type: 'command', name: 'add', args: [what], target };
  }

  private parseRemove(): CommandNode {
    this.expect('remove');
    if (this.matchType('selector')) {
      const what = this.parseExpression();
      let target: ASTNode | undefined;
      if (this.match('from')) {
        this.advance();
        target = this.parseExpression();
      }
      return { type: 'command', name: 'removeClass', args: [what], target };
    }
    const target = this.parseExpression();
    return { type: 'command', name: 'remove', args: [], target };
  }

  private parsePut(): CommandNode {
    this.expect('put');
    const content = this.parseExpression();
    let modifier = 'into';
    if (this.match('into', 'before', 'after', 'at')) {
      modifier = this.advance().value;
      if (modifier === 'at') {
        const pos = this.advance().value;
        this.expect('of');
        modifier = `at ${pos} of`;
      }
    }
    const target = this.parseExpression();
    return { type: 'command', name: 'put', args: [content], target, modifier };
  }

  private parseAppend(): CommandNode {
    this.expect('append');
    const content = this.parseExpression();
    let target: ASTNode | undefined;
    if (this.match('to')) {
      this.advance();
      target = this.parseExpression();
    }
    return { type: 'command', name: 'append', args: [content], target };
  }

  private parseSet(): CommandNode {
    this.expect('set');
    const target = this.parseExpression();
    if (this.match('to')) {
      this.advance();
      const value = this.parseExpression();
      return { type: 'command', name: 'set', args: [target, value] };
    }
    return { type: 'command', name: 'set', args: [target] };
  }

  private parseGet(): CommandNode {
    this.expect('get');
    return { type: 'command', name: 'get', args: [this.parseExpression()] };
  }

  private parseCall(): CommandNode {
    this.expect('call');
    return { type: 'command', name: 'call', args: [this.parseExpression()] };
  }

  private parseLog(): CommandNode {
    this.expect('log');
    const args: ASTNode[] = [];
    while (!this.isAtEnd() && !this.match('then', 'and', 'end', 'else')) {
      args.push(this.parseExpression());
      if (this.match(',')) this.advance();
      else break;
    }
    return { type: 'command', name: 'log', args };
  }

  private parseSend(): CommandNode {
    this.advance();
    const event = this.advance().value;
    let target: ASTNode | undefined;
    if (this.match('to')) {
      this.advance();
      target = this.parseExpression();
    }
    return { type: 'command', name: 'send', args: [{ type: 'literal', value: event }], target };
  }

  private parseWait(): CommandNode {
    this.expect('wait');
    if (this.match('for')) {
      this.advance();
      const event = this.advance().value;
      let target: ASTNode | undefined;
      if (this.match('from')) {
        this.advance();
        target = this.parseExpression();
      }
      return {
        type: 'command',
        name: 'waitFor',
        args: [{ type: 'literal', value: event }],
        target,
      };
    }
    return { type: 'command', name: 'wait', args: [this.parseExpression()] };
  }

  private parseShow(): CommandNode {
    this.expect('show');
    let target: ASTNode | undefined;
    const modifiers: Record<string, ASTNode> = {};

    // Parse target (stop at when/where/then/and/end/else)
    if (!this.isAtEnd() && !this.match('then', 'and', 'end', 'else', 'when', 'where')) {
      target = this.parseExpression();
    }

    // Parse optional when/where condition
    if (!this.isAtEnd() && this.match('when', 'where')) {
      const keyword = this.advance().value;
      modifiers[keyword] = this.parseExpression();
    }

    return { type: 'command', name: 'show', args: [], target, modifiers };
  }

  private parseHide(): CommandNode {
    this.expect('hide');
    let target: ASTNode | undefined;
    const modifiers: Record<string, ASTNode> = {};

    // Parse target (stop at when/where/then/and/end/else)
    if (!this.isAtEnd() && !this.match('then', 'and', 'end', 'else', 'when', 'where')) {
      target = this.parseExpression();
    }

    // Parse optional when/where condition
    if (!this.isAtEnd() && this.match('when', 'where')) {
      const keyword = this.advance().value;
      modifiers[keyword] = this.parseExpression();
    }

    return { type: 'command', name: 'hide', args: [], target, modifiers };
  }

  private parseTake(): CommandNode {
    this.expect('take');
    const what = this.parseExpression();
    let from: ASTNode | undefined;
    if (this.match('from')) {
      this.advance();
      from = this.parseExpression();
    }
    return { type: 'command', name: 'take', args: [what], target: from };
  }

  private parseIncDec(name: string): CommandNode {
    this.advance();
    const target = this.parseExpression();
    let amount: ASTNode = { type: 'literal', value: 1 };
    if (this.match('by')) {
      this.advance();
      amount = this.parseExpression();
    }
    return { type: 'command', name, args: [target, amount] };
  }

  private parseFocusBlur(name: string): CommandNode {
    this.advance();
    let target: ASTNode | undefined;
    if (!this.isAtEnd() && !this.match('then', 'and', 'end', 'else')) {
      target = this.parseExpression();
    }
    return { type: 'command', name, args: [], target };
  }

  private parseGo(): CommandNode {
    this.expect('go');
    if (this.match('to')) this.advance();
    if (this.match('url')) this.advance();
    const dest = this.parseExpression();
    return { type: 'command', name: 'go', args: [dest] };
  }

  private parseReturn(): CommandNode {
    this.expect('return');
    let value: ASTNode | undefined;
    if (!this.isAtEnd() && !this.match('then', 'and', 'end', 'else')) {
      value = this.parseExpression();
    }
    return { type: 'command', name: 'return', args: value ? [value] : [] };
  }

  // transition <property> to <value> [over <duration>]
  private parseTransition(): CommandNode {
    this.expect('transition');
    let target: ASTNode | undefined;

    // Check for possessive: "transition my opacity" or "transition #el's opacity"
    if (this.match('my', 'its')) {
      const ref = this.advance().value;
      target = { type: 'identifier', value: ref === 'my' ? 'me' : 'it' };
    } else if (this.matchType('selector')) {
      const expr = this.parseExpression();
      if (expr.type === 'possessive') {
        return this.parseTransitionRest(expr.object, expr.property);
      }
      target = expr;
    }

    // Parse property name
    const propToken = this.peek();
    let property: string;
    if (propToken.type === 'styleProperty') {
      property = this.advance().value;
    } else if (propToken.type === 'identifier' || propToken.type === 'keyword') {
      property = this.advance().value;
    } else {
      property = 'opacity';
    }

    return this.parseTransitionRest(target, property);
  }

  private parseTransitionRest(target: ASTNode | undefined, property: string): CommandNode {
    let toValue: ASTNode = { type: 'literal', value: 1 };
    if (this.match('to')) {
      this.advance();
      toValue = this.parseExpression();
    }

    let duration: ASTNode = { type: 'literal', value: 300 };
    if (this.match('over')) {
      this.advance();
      duration = this.parseExpression();
    }

    return {
      type: 'command',
      name: 'transition',
      args: [{ type: 'literal', value: property }, toValue, duration],
      target,
    };
  }

  // Expression parsing with operator precedence
  private parseExpression(): ASTNode {
    return this.parseOr();
  }

  private parseOr(): ASTNode {
    let left = this.parseAnd();
    while (this.match('or', '||')) {
      this.advance();
      left = { type: 'binary', operator: 'or', left, right: this.parseAnd() };
    }
    return left;
  }

  private parseAnd(): ASTNode {
    let left = this.parseEquality();
    while (this.match('and', '&&') && !this.isCommandKeyword(this.peek(1))) {
      this.advance();
      left = { type: 'binary', operator: 'and', left, right: this.parseEquality() };
    }
    return left;
  }

  private isCommandKeyword(token: Token): boolean {
    const cmds = [
      'toggle',
      'add',
      'remove',
      'set',
      'put',
      'log',
      'send',
      'wait',
      'show',
      'hide',
      'increment',
      'decrement',
      'focus',
      'blur',
      'go',
    ];
    return cmds.includes(normalizeCommand(token.value));
  }

  private parseEquality(): ASTNode {
    let left = this.parseComparison();
    while (this.match('==', '!=', 'is', 'matches', 'contains', 'includes', 'has')) {
      const op = this.advance().value;
      if (op.toLowerCase() === 'is' && this.match('not')) {
        this.advance();
        left = { type: 'binary', operator: 'is not', left, right: this.parseComparison() };
      } else {
        left = { type: 'binary', operator: op, left, right: this.parseComparison() };
      }
    }
    return left;
  }

  private parseComparison(): ASTNode {
    let left = this.parseAdditive();
    while (this.match('<', '>', '<=', '>=')) {
      const op = this.advance().value;
      left = { type: 'binary', operator: op, left, right: this.parseAdditive() };
    }
    return left;
  }

  private parseAdditive(): ASTNode {
    let left = this.parseMultiplicative();
    while (this.match('+', '-')) {
      const op = this.advance().value;
      left = { type: 'binary', operator: op, left, right: this.parseMultiplicative() };
    }
    return left;
  }

  private parseMultiplicative(): ASTNode {
    let left = this.parseUnary();
    while (this.match('*', '/', '%')) {
      const op = this.advance().value;
      left = { type: 'binary', operator: op, left, right: this.parseUnary() };
    }
    return left;
  }

  private parseUnary(): ASTNode {
    if (this.match('not', '!')) {
      this.advance();
      return { type: 'unary', operator: 'not', operand: this.parseUnary() };
    }
    if (this.match('-') && this.peek(1).type === 'number') {
      this.advance();
      const num = this.advance();
      return { type: 'literal', value: -parseFloat(num.value) };
    }
    return this.parsePostfix();
  }

  private parsePostfix(): ASTNode {
    let left = this.parsePrimary();

    while (true) {
      if (this.match("'s")) {
        this.advance();
        const next = this.peek();
        const prop = next.type === 'styleProperty' ? this.advance().value : this.advance().value;
        left = { type: 'possessive', object: left, property: prop };
      } else if (this.peek().type === 'styleProperty') {
        const prop = this.advance().value;
        left = { type: 'possessive', object: left, property: prop };
      } else if (this.peek().value === '.') {
        this.advance();
        const prop = this.advance().value;
        left = { type: 'member', object: left, property: prop };
      } else if (this.peek().type === 'selector' && this.peek().value.startsWith('.')) {
        const prop = this.advance().value.slice(1);
        left = { type: 'member', object: left, property: prop };
      } else if (this.peek().value === '(') {
        this.advance();
        const args: ASTNode[] = [];
        while (!this.match(')')) {
          args.push(this.parseExpression());
          if (this.match(',')) this.advance();
        }
        this.expect(')');
        left = { type: 'call', callee: left, args };
      } else if (this.peek().value === '[' && left.type !== 'selector') {
        this.advance();
        const index = this.parseExpression();
        this.expect(']');
        left = { type: 'member', object: left, property: index, computed: true };
      } else {
        break;
      }
    }
    return left;
  }

  private parsePrimary(): ASTNode {
    const token = this.peek();

    if (token.value === '(') {
      this.advance();
      const expr = this.parseExpression();
      this.expect(')');
      return expr;
    }

    if (token.value === '{') return this.parseObjectLiteral();
    if (token.value === '[') return this.parseArrayLiteral();

    if (token.type === 'number') {
      this.advance();
      const val = token.value;
      if (val.endsWith('ms')) return { type: 'literal', value: parseInt(val), unit: 'ms' };
      if (val.endsWith('s')) return { type: 'literal', value: parseFloat(val) * 1000, unit: 'ms' };
      return { type: 'literal', value: parseFloat(val) };
    }

    if (token.type === 'string') {
      this.advance();
      return { type: 'literal', value: token.value.slice(1, -1) };
    }

    if (this.match('true')) {
      this.advance();
      return { type: 'literal', value: true };
    }
    if (this.match('false')) {
      this.advance();
      return { type: 'literal', value: false };
    }
    if (this.match('null')) {
      this.advance();
      return { type: 'literal', value: null };
    }
    if (this.match('undefined')) {
      this.advance();
      return { type: 'literal', value: undefined };
    }

    if (token.type === 'localVar') {
      this.advance();
      return { type: 'variable', name: token.value, scope: 'local' };
    }
    if (token.type === 'globalVar') {
      this.advance();
      return { type: 'variable', name: token.value, scope: 'global' };
    }
    if (token.type === 'selector') {
      this.advance();
      return { type: 'selector', value: token.value };
    }

    // Handle implicit possessive: my value, its value
    if (this.match('my')) {
      this.advance();
      const next = this.peek();
      if ((next.type === 'identifier' || next.type === 'keyword') && !this.isCommandKeyword(next)) {
        const prop = this.advance().value;
        return { type: 'possessive', object: { type: 'identifier', value: 'me' }, property: prop };
      }
      return { type: 'identifier', value: 'me' };
    }
    if (this.match('its')) {
      this.advance();
      const next = this.peek();
      if ((next.type === 'identifier' || next.type === 'keyword') && !this.isCommandKeyword(next)) {
        const prop = this.advance().value;
        return { type: 'possessive', object: { type: 'identifier', value: 'it' }, property: prop };
      }
      return { type: 'identifier', value: 'it' };
    }
    if (this.match('me')) {
      this.advance();
      return { type: 'identifier', value: 'me' };
    }
    if (this.match('it')) {
      this.advance();
      return { type: 'identifier', value: 'it' };
    }
    if (this.match('you')) {
      this.advance();
      return { type: 'identifier', value: 'you' };
    }

    // Positional: the first <li/> or first li
    if (this.match('the', 'a', 'an')) {
      this.advance();
      if (this.match('first', 'last', 'next', 'previous', 'closest', 'parent')) {
        const position = this.advance().value;
        const target = this.parsePositionalTarget();
        return { type: 'positional', position, target };
      }
      return this.parsePrimary();
    }

    if (this.match('first', 'last', 'next', 'previous', 'closest', 'parent')) {
      const position = this.advance().value;
      const target = this.parsePositionalTarget();
      return { type: 'positional', position, target };
    }

    if (token.type === 'identifier' || token.type === 'keyword') {
      this.advance();
      return { type: 'identifier', value: token.value };
    }

    this.advance();
    return { type: 'identifier', value: token.value };
  }

  private parseObjectLiteral(): ASTNode {
    this.expect('{');
    const properties: Array<{ key: string; value: ASTNode }> = [];
    while (!this.match('}')) {
      const key = this.advance().value;
      this.expect(':');
      const value = this.parseExpression();
      properties.push({ key, value });
      if (this.match(',')) this.advance();
    }
    this.expect('}');
    return { type: 'object', properties };
  }

  private parseArrayLiteral(): ASTNode {
    this.expect('[');
    const elements: ASTNode[] = [];
    while (!this.match(']')) {
      elements.push(this.parseExpression());
      if (this.match(',')) this.advance();
    }
    this.expect(']');
    return { type: 'array', elements };
  }

  private parsePositionalTarget(): ASTNode {
    const token = this.peek();
    if (token.type === 'selector') {
      return { type: 'selector', value: this.advance().value };
    }
    if (token.type === 'identifier' || token.type === 'keyword') {
      return { type: 'identifier', value: this.advance().value };
    }
    return this.parseExpression();
  }
}
