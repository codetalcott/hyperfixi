/**
 * Standard Parser Adapter
 *
 * A self-contained parser extracted from hybrid-complete, implementing
 * the ParserAdapter interface for modular bundle composition.
 *
 * Features:
 * - Full recursive descent parser with operator precedence
 * - 22 commands including transition
 * - Block commands (if/else, repeat, for, while, fetch)
 * - Event modifiers (.once, .prevent, .stop, .debounce, .throttle)
 * - Positional expressions (first, last, next, previous, closest, parent)
 * - i18n command aliases
 *
 * Size: ~1,000 lines (~3 KB gzipped)
 */

import type { ASTNode } from '../../types/base-types';
import {
  ParserAdapter,
  ParseResult,
  STANDARD_CAPABILITIES,
  STANDARD_COMMANDS,
} from './parser-adapter';

// ============== KEYWORD ALIASES ==============

const COMMAND_ALIASES: Record<string, string> = {
  flip: 'toggle', switch: 'toggle', display: 'show', reveal: 'show',
  conceal: 'hide', increase: 'increment', decrease: 'decrement',
  fire: 'trigger', dispatch: 'send', navigate: 'go', goto: 'go',
};

const EVENT_ALIASES: Record<string, string> = {
  clicked: 'click', pressed: 'keydown', changed: 'change',
  submitted: 'submit', loaded: 'load',
};

function normalizeCommand(name: string): string {
  const lower = name.toLowerCase();
  return COMMAND_ALIASES[lower] || lower;
}

function normalizeEvent(name: string): string {
  const lower = name.toLowerCase();
  return EVENT_ALIASES[lower] || lower;
}

// ============== TOKENIZER ==============

type TokenType =
  | 'identifier' | 'number' | 'string' | 'operator' | 'styleProperty'
  | 'selector' | 'localVar' | 'globalVar' | 'symbol' | 'keyword' | 'eof';

interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

const KEYWORDS = new Set([
  'on', 'from', 'to', 'into', 'before', 'after', 'in', 'of', 'at', 'with',
  'if', 'else', 'unless', 'end', 'then', 'and', 'or', 'not',
  'repeat', 'times', 'for', 'each', 'while', 'until',
  'toggle', 'add', 'remove', 'put', 'set', 'get', 'call', 'return', 'append',
  'log', 'send', 'trigger', 'wait', 'settle', 'fetch', 'as',
  'show', 'hide', 'take', 'increment', 'decrement', 'focus', 'blur', 'go', 'transition', 'over',
  'the', 'a', 'an', 'my', 'its', 'me', 'it', 'you',
  'first', 'last', 'next', 'previous', 'closest', 'parent',
  'true', 'false', 'null', 'undefined',
  'is', 'matches', 'contains', 'includes', 'exists', 'has',
  'init', 'every', 'by',
]);

function tokenize(code: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;

  while (pos < code.length) {
    if (/\s/.test(code[pos])) { pos++; continue; }

    // Comments
    if (code.slice(pos, pos + 2) === '--') {
      while (pos < code.length && code[pos] !== '\n') pos++;
      continue;
    }

    const start = pos;

    // HTML selector: <button.class/>
    if (code[pos] === '<' && /[a-zA-Z]/.test(code[pos + 1] || '')) {
      pos++;
      while (pos < code.length && code[pos] !== '>') pos++;
      if (code[pos] === '>') pos++;
      const val = code.slice(start, pos);
      if (val.endsWith('/>') || val.endsWith('>')) {
        const normalized = val.slice(1).replace(/\/?>$/, '');
        tokens.push({ type: 'selector', value: normalized, pos: start });
        continue;
      }
    }

    // Possessive 's - check BEFORE string literals
    if (code.slice(pos, pos + 2) === "'s" && !/[a-zA-Z]/.test(code[pos + 2] || '')) {
      tokens.push({ type: 'operator', value: "'s", pos: start });
      pos += 2;
      continue;
    }

    // String literals
    if (code[pos] === '"' || code[pos] === "'") {
      const quote = code[pos++];
      while (pos < code.length && code[pos] !== quote) {
        if (code[pos] === '\\') pos++;
        pos++;
      }
      pos++;
      tokens.push({ type: 'string', value: code.slice(start, pos), pos: start });
      continue;
    }

    // Numbers with units
    if (/\d/.test(code[pos]) || (code[pos] === '-' && /\d/.test(code[pos + 1] || ''))) {
      if (code[pos] === '-') pos++;
      while (pos < code.length && /[\d.]/.test(code[pos])) pos++;
      if (code.slice(pos, pos + 2) === 'ms') pos += 2;
      else if (code[pos] === 's' && !/[a-zA-Z]/.test(code[pos + 1] || '')) pos++;
      else if (code.slice(pos, pos + 2) === 'px') pos += 2;
      tokens.push({ type: 'number', value: code.slice(start, pos), pos: start });
      continue;
    }

    // Local variable :name
    if (code[pos] === ':') {
      pos++;
      while (pos < code.length && /[\w]/.test(code[pos])) pos++;
      tokens.push({ type: 'localVar', value: code.slice(start, pos), pos: start });
      continue;
    }

    // Global variable $name
    if (code[pos] === '$') {
      pos++;
      while (pos < code.length && /[\w]/.test(code[pos])) pos++;
      tokens.push({ type: 'globalVar', value: code.slice(start, pos), pos: start });
      continue;
    }

    // CSS selectors: #id, .class (but NOT event modifiers)
    if (code[pos] === '#' || code[pos] === '.') {
      if (code[pos] === '.') {
        const afterDot = code.slice(pos + 1).match(/^(once|prevent|stop|debounce|throttle)\b/i);
        if (afterDot) {
          tokens.push({ type: 'symbol', value: '.', pos: start });
          pos++;
          continue;
        }
      }
      pos++;
      while (pos < code.length && /[\w-]/.test(code[pos])) pos++;
      tokens.push({ type: 'selector', value: code.slice(start, pos), pos: start });
      continue;
    }

    // Array literal vs Attribute selector
    if (code[pos] === '[') {
      let lookahead = pos + 1;
      while (lookahead < code.length && /\s/.test(code[lookahead])) lookahead++;
      const nextChar = code[lookahead] || '';
      const isArrayLiteral = /['"\d\[\]:\$\-]/.test(nextChar) || nextChar === '';

      if (isArrayLiteral) {
        tokens.push({ type: 'symbol', value: '[', pos: start });
        pos++;
        continue;
      } else {
        pos++;
        let depth = 1;
        while (pos < code.length && depth > 0) {
          if (code[pos] === '[') depth++;
          if (code[pos] === ']') depth--;
          pos++;
        }
        tokens.push({ type: 'selector', value: code.slice(start, pos), pos: start });
        continue;
      }
    }

    if (code[pos] === ']') {
      tokens.push({ type: 'symbol', value: ']', pos: start });
      pos++;
      continue;
    }

    // Multi-char operators
    const twoChar = code.slice(pos, pos + 2);
    if (['==', '!=', '<=', '>=', '&&', '||'].includes(twoChar)) {
      tokens.push({ type: 'operator', value: twoChar, pos: start });
      pos += 2;
      continue;
    }

    // CSS style property: *opacity
    if (code[pos] === '*' && /[a-zA-Z]/.test(code[pos + 1] || '')) {
      pos++;
      while (pos < code.length && /[\w-]/.test(code[pos])) pos++;
      tokens.push({ type: 'styleProperty', value: code.slice(start, pos), pos: start });
      continue;
    }

    // Single-char operators
    if ('+-*/%<>!'.includes(code[pos])) {
      tokens.push({ type: 'operator', value: code[pos], pos: start });
      pos++;
      continue;
    }

    if ('()[]{},.'.includes(code[pos])) {
      tokens.push({ type: 'symbol', value: code[pos], pos: start });
      pos++;
      continue;
    }

    // Identifiers and keywords
    if (/[a-zA-Z_]/.test(code[pos])) {
      while (pos < code.length && /[\w-]/.test(code[pos])) pos++;
      const value = code.slice(start, pos);
      const type = KEYWORDS.has(value.toLowerCase()) ? 'keyword' : 'identifier';
      tokens.push({ type, value, pos: start });
      continue;
    }

    pos++;
  }

  tokens.push({ type: 'eof', value: '', pos: code.length });
  return tokens;
}

// ============== AST TYPES ==============

interface StandardASTNode { type: string; [key: string]: unknown; }

interface CommandNode extends StandardASTNode {
  type: 'command';
  name: string;
  args: StandardASTNode[];
  target?: StandardASTNode;
  modifier?: string;
}

interface BlockNode extends StandardASTNode {
  type: 'if' | 'repeat' | 'for' | 'while' | 'fetch';
  condition?: StandardASTNode;
  body: StandardASTNode[];
  elseBody?: StandardASTNode[];
}

interface EventModifiers {
  once?: boolean;
  prevent?: boolean;
  stop?: boolean;
  debounce?: number;
  throttle?: number;
}

interface EventNode extends StandardASTNode {
  type: 'event';
  event: string;
  filter?: StandardASTNode;
  modifiers: EventModifiers;
  body: StandardASTNode[];
}

// ============== PARSER ==============

class StandardParserImpl {
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
    if (!this.match(value) && normalizeCommand(this.peek().value) !== value) {
      throw new Error(`Expected '${value}', got '${this.peek().value}'`);
    }
    return this.advance();
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'eof';
  }

  parse(): StandardASTNode {
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
    let filter: StandardASTNode | undefined;

    // Parse event modifiers
    while (this.peek().value === '.') {
      this.advance();
      const mod = this.advance().value.toLowerCase();
      if (mod === 'once') modifiers.once = true;
      else if (mod === 'prevent') modifiers.prevent = true;
      else if (mod === 'stop') modifiers.stop = true;
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

  private parseCommandSequence(): StandardASTNode[] {
    const commands: StandardASTNode[] = [];
    while (!this.isAtEnd() && !this.match('end', 'else')) {
      const cmd = this.parseCommand();
      if (cmd) commands.push(cmd);
      if (this.match('then', 'and')) this.advance();
    }
    return commands;
  }

  private parseCommand(): StandardASTNode | null {
    if (this.match('if', 'unless')) return this.parseIf();
    if (this.match('repeat')) return this.parseRepeat();
    if (this.match('for')) return this.parseFor();
    if (this.match('while')) return this.parseWhile();
    if (this.match('fetch')) return this.parseFetchBlock();

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

  // Control flow
  private parseIf(): BlockNode {
    const isUnless = this.match('unless');
    this.advance();
    const condition = this.parseExpression();
    const body = this.parseCommandSequence();
    let elseBody: StandardASTNode[] | undefined;

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
    let count: StandardASTNode | undefined;
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
    let responseType: StandardASTNode = { type: 'literal', value: 'text' };

    if (this.match('as')) {
      this.advance();
      responseType = this.parseExpression();
    }
    if (this.match('then')) this.advance();

    const body = this.parseCommandSequence();
    return { type: 'fetch', condition: { type: 'fetchConfig', url, responseType }, body };
  }

  // Commands
  private parseToggle(): CommandNode {
    this.expect('toggle');
    const what = this.parseExpression();
    let target: StandardASTNode | undefined;
    if (this.match('on')) { this.advance(); target = this.parseExpression(); }
    return { type: 'command', name: 'toggle', args: [what], target };
  }

  private parseAdd(): CommandNode {
    this.expect('add');
    const what = this.parseExpression();
    let target: StandardASTNode | undefined;
    if (this.match('to')) { this.advance(); target = this.parseExpression(); }
    return { type: 'command', name: 'add', args: [what], target };
  }

  private parseRemove(): CommandNode {
    this.expect('remove');
    if (this.matchType('selector')) {
      const what = this.parseExpression();
      let target: StandardASTNode | undefined;
      if (this.match('from')) { this.advance(); target = this.parseExpression(); }
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
    let target: StandardASTNode | undefined;
    if (this.match('to')) { this.advance(); target = this.parseExpression(); }
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
    const args: StandardASTNode[] = [];
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
    let target: StandardASTNode | undefined;
    if (this.match('to')) { this.advance(); target = this.parseExpression(); }
    return { type: 'command', name: 'send', args: [{ type: 'literal', value: event }], target };
  }

  private parseWait(): CommandNode {
    this.expect('wait');
    if (this.match('for')) {
      this.advance();
      const event = this.advance().value;
      let target: StandardASTNode | undefined;
      if (this.match('from')) { this.advance(); target = this.parseExpression(); }
      return { type: 'command', name: 'waitFor', args: [{ type: 'literal', value: event }], target };
    }
    return { type: 'command', name: 'wait', args: [this.parseExpression()] };
  }

  private parseShow(): CommandNode {
    this.expect('show');
    let target: StandardASTNode | undefined;
    if (!this.isAtEnd() && !this.match('then', 'and', 'end', 'else')) {
      target = this.parseExpression();
    }
    return { type: 'command', name: 'show', args: [], target };
  }

  private parseHide(): CommandNode {
    this.expect('hide');
    let target: StandardASTNode | undefined;
    if (!this.isAtEnd() && !this.match('then', 'and', 'end', 'else')) {
      target = this.parseExpression();
    }
    return { type: 'command', name: 'hide', args: [], target };
  }

  private parseTake(): CommandNode {
    this.expect('take');
    const what = this.parseExpression();
    let from: StandardASTNode | undefined;
    if (this.match('from')) { this.advance(); from = this.parseExpression(); }
    return { type: 'command', name: 'take', args: [what], target: from };
  }

  private parseIncDec(name: string): CommandNode {
    this.advance();
    const target = this.parseExpression();
    let amount: StandardASTNode = { type: 'literal', value: 1 };
    if (this.match('by')) { this.advance(); amount = this.parseExpression(); }
    return { type: 'command', name, args: [target, amount] };
  }

  private parseFocusBlur(name: string): CommandNode {
    this.advance();
    let target: StandardASTNode | undefined;
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
    let value: StandardASTNode | undefined;
    if (!this.isAtEnd() && !this.match('then', 'and', 'end', 'else')) {
      value = this.parseExpression();
    }
    return { type: 'command', name: 'return', args: value ? [value] : [] };
  }

  private parseTransition(): CommandNode {
    this.expect('transition');
    let target: StandardASTNode | undefined;

    if (this.match('my', 'its')) {
      const ref = this.advance().value;
      target = { type: 'identifier', value: ref === 'my' ? 'me' : 'it' };
    } else if (this.matchType('selector')) {
      const expr = this.parseExpression();
      if (expr.type === 'possessive') {
        return this.parseTransitionRest(expr.object as StandardASTNode, expr.property as string);
      }
      target = expr;
    }

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

  private parseTransitionRest(target: StandardASTNode | undefined, property: string): CommandNode {
    let toValue: StandardASTNode = { type: 'literal', value: 1 };
    if (this.match('to')) {
      this.advance();
      toValue = this.parseExpression();
    }

    let duration: StandardASTNode = { type: 'literal', value: 300 };
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
  private parseExpression(): StandardASTNode { return this.parseOr(); }

  private parseOr(): StandardASTNode {
    let left = this.parseAnd();
    while (this.match('or', '||')) {
      this.advance();
      left = { type: 'binary', operator: 'or', left, right: this.parseAnd() };
    }
    return left;
  }

  private parseAnd(): StandardASTNode {
    let left = this.parseEquality();
    while (this.match('and', '&&') && !this.isCommandKeyword(this.peek(1))) {
      this.advance();
      left = { type: 'binary', operator: 'and', left, right: this.parseEquality() };
    }
    return left;
  }

  private isCommandKeyword(token: Token): boolean {
    const cmds = ['toggle', 'add', 'remove', 'set', 'put', 'log', 'send', 'wait', 'show', 'hide', 'increment', 'decrement', 'focus', 'blur', 'go'];
    return cmds.includes(normalizeCommand(token.value));
  }

  private parseEquality(): StandardASTNode {
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

  private parseComparison(): StandardASTNode {
    let left = this.parseAdditive();
    while (this.match('<', '>', '<=', '>=')) {
      const op = this.advance().value;
      left = { type: 'binary', operator: op, left, right: this.parseAdditive() };
    }
    return left;
  }

  private parseAdditive(): StandardASTNode {
    let left = this.parseMultiplicative();
    while (this.match('+', '-')) {
      const op = this.advance().value;
      left = { type: 'binary', operator: op, left, right: this.parseMultiplicative() };
    }
    return left;
  }

  private parseMultiplicative(): StandardASTNode {
    let left = this.parseUnary();
    while (this.match('*', '/', '%')) {
      const op = this.advance().value;
      left = { type: 'binary', operator: op, left, right: this.parseUnary() };
    }
    return left;
  }

  private parseUnary(): StandardASTNode {
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

  private parsePostfix(): StandardASTNode {
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
      } else if (this.peek().type === 'selector' && (this.peek().value as string).startsWith('.')) {
        const prop = (this.advance().value as string).slice(1);
        left = { type: 'member', object: left, property: prop };
      } else if (this.peek().value === '(') {
        this.advance();
        const args: StandardASTNode[] = [];
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

  private parsePrimary(): StandardASTNode {
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

    if (this.match('true')) { this.advance(); return { type: 'literal', value: true }; }
    if (this.match('false')) { this.advance(); return { type: 'literal', value: false }; }
    if (this.match('null')) { this.advance(); return { type: 'literal', value: null }; }
    if (this.match('undefined')) { this.advance(); return { type: 'literal', value: undefined }; }

    if (token.type === 'localVar') { this.advance(); return { type: 'variable', name: token.value, scope: 'local' }; }
    if (token.type === 'globalVar') { this.advance(); return { type: 'variable', name: token.value, scope: 'global' }; }
    if (token.type === 'selector') { this.advance(); return { type: 'selector', value: token.value }; }

    // Implicit possessive: my value, its value
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
    if (this.match('me')) { this.advance(); return { type: 'identifier', value: 'me' }; }
    if (this.match('it')) { this.advance(); return { type: 'identifier', value: 'it' }; }
    if (this.match('you')) { this.advance(); return { type: 'identifier', value: 'you' }; }

    // Positional
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

  private parseObjectLiteral(): StandardASTNode {
    this.expect('{');
    const properties: Array<{ key: string; value: StandardASTNode }> = [];
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

  private parseArrayLiteral(): StandardASTNode {
    this.expect('[');
    const elements: StandardASTNode[] = [];
    while (!this.match(']')) {
      elements.push(this.parseExpression());
      if (this.match(',')) this.advance();
    }
    this.expect(']');
    return { type: 'array', elements };
  }

  private parsePositionalTarget(): StandardASTNode {
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

// ============== PARSER ADAPTER ==============

/**
 * Standard Parser implementing ParserAdapter interface
 */
export class StandardParser implements ParserAdapter {
  readonly tier = 'standard' as const;
  readonly name = 'HyperFixi Standard Parser v1.0';
  readonly capabilities = STANDARD_CAPABILITIES;

  private supportedCommands = new Set(STANDARD_COMMANDS);

  parse(code: string): ParseResult {
    // Handle empty input
    if (!code || code.trim() === '') {
      return {
        success: false,
        error: {
          message: 'Cannot parse empty input',
          position: 0,
          line: 1,
          column: 1,
        },
      };
    }

    try {
      const parser = new StandardParserImpl(code);
      const node = parser.parse();
      return {
        success: true,
        node: node as ASTNode,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: { message },
      };
    }
  }

  supportsCommand(name: string): boolean {
    return this.supportedCommands.has(normalizeCommand(name) as typeof STANDARD_COMMANDS[number]);
  }

  getSupportedCommands(): string[] {
    return [...STANDARD_COMMANDS];
  }
}

/**
 * Factory function for creating StandardParser
 */
export function createStandardParser(): ParserAdapter {
  return new StandardParser();
}

// Export tokenizer for potential reuse
export { tokenize, normalizeCommand, normalizeEvent };
