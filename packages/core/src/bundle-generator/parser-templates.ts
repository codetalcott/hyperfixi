/**
 * Parser Templates for Bundle Generation
 *
 * These templates contain self-contained parser code that can be embedded
 * directly into generated bundles, eliminating external parser imports.
 *
 * LITE_PARSER_TEMPLATE: Regex-based parser (~200 lines, ~2 KB gzipped)
 *   - Supports: event handlers, command sequences, simple conditions
 *   - Commands: toggle, add, remove, put, set, log, send, wait, show/hide
 *
 * HYBRID_PARSER_TEMPLATE: Full AST parser (~1100 lines, ~7 KB gzipped)
 *   - Supports: blocks (if/repeat/for/while/fetch), positional expressions
 *   - Full operator precedence, function calls, object/array literals
 */

// =============================================================================
// LITE PARSER TEMPLATE
// =============================================================================

/**
 * Minimal regex-based parser for simple hyperscript patterns.
 * Use when only basic commands are detected (no blocks, no expressions).
 */
export const LITE_PARSER_TEMPLATE = `
// Lite Parser - Regex-based for minimal bundle size

function parseLite(code) {
  const trimmed = code.trim();

  // Handle event handlers: "on click toggle .active"
  const onMatch = trimmed.match(/^on\\s+(\\w+)(?:\\s+from\\s+([^\\s]+))?\\s+(.+)$/i);
  if (onMatch) {
    return {
      type: 'event',
      event: onMatch[1],
      filter: onMatch[2] ? { type: 'selector', value: onMatch[2] } : undefined,
      modifiers: {},
      body: parseCommands(onMatch[3]),
    };
  }

  // Handle "every Nms" event pattern
  const everyMatch = trimmed.match(/^every\\s+(\\d+)(ms|s)?\\s+(.+)$/i);
  if (everyMatch) {
    const ms = everyMatch[2] === 's' ? parseInt(everyMatch[1]) * 1000 : parseInt(everyMatch[1]);
    return {
      type: 'event',
      event: 'interval:' + ms,
      modifiers: {},
      body: parseCommands(everyMatch[3]),
    };
  }

  // Handle "init" pattern
  const initMatch = trimmed.match(/^init\\s+(.+)$/i);
  if (initMatch) {
    return {
      type: 'event',
      event: 'init',
      modifiers: {},
      body: parseCommands(initMatch[1]),
    };
  }

  return { type: 'sequence', commands: parseCommands(trimmed) };
}

function parseCommands(code) {
  const parts = code.split(/\\s+(?:then|and)\\s+/i);
  return parts.map(parseCommand).filter(Boolean);
}

function parseCommand(code) {
  const trimmed = code.trim();
  if (!trimmed) return null;

  let match;

  // toggle .class [on target]
  match = trimmed.match(/^toggle\\s+(\\.\\w+|\\w+)(?:\\s+on\\s+(.+))?$/i);
  if (match) {
    return {
      type: 'command',
      name: 'toggle',
      args: [{ type: 'selector', value: match[1] }],
      target: match[2] ? parseTarget(match[2]) : undefined,
    };
  }

  // add .class [to target]
  match = trimmed.match(/^add\\s+(\\.\\w+|\\w+)(?:\\s+to\\s+(.+))?$/i);
  if (match) {
    return {
      type: 'command',
      name: 'add',
      args: [{ type: 'selector', value: match[1] }],
      target: match[2] ? parseTarget(match[2]) : undefined,
    };
  }

  // remove .class [from target] | remove [target]
  match = trimmed.match(/^remove\\s+(\\.\\w+)(?:\\s+from\\s+(.+))?$/i);
  if (match) {
    return {
      type: 'command',
      name: 'removeClass',
      args: [{ type: 'selector', value: match[1] }],
      target: match[2] ? parseTarget(match[2]) : undefined,
    };
  }
  match = trimmed.match(/^remove\\s+(.+)$/i);
  if (match) {
    return {
      type: 'command',
      name: 'remove',
      args: [],
      target: parseTarget(match[1]),
    };
  }

  // put "content" into target
  match = trimmed.match(/^put\\s+(?:"([^"]+)"|'([^']+)'|(\\S+))\\s+(into|before|after)\\s+(.+)$/i);
  if (match) {
    const content = match[1] || match[2] || match[3];
    return {
      type: 'command',
      name: 'put',
      args: [{ type: 'literal', value: content }],
      modifier: match[4],
      target: parseTarget(match[5]),
    };
  }

  // set target to value | set :var to value
  match = trimmed.match(/^set\\s+(.+?)\\s+to\\s+(.+)$/i);
  if (match) {
    return {
      type: 'command',
      name: 'set',
      args: [parseTarget(match[1]), parseLiteValue(match[2])],
    };
  }

  // log message
  match = trimmed.match(/^log\\s+(.+)$/i);
  if (match) {
    return {
      type: 'command',
      name: 'log',
      args: [parseLiteValue(match[1])],
    };
  }

  // send event [to target]
  match = trimmed.match(/^send\\s+(\\w+)(?:\\s+to\\s+(.+))?$/i);
  if (match) {
    return {
      type: 'command',
      name: 'send',
      args: [{ type: 'literal', value: match[1] }],
      target: match[2] ? parseTarget(match[2]) : undefined,
    };
  }

  // wait Nms | wait Ns
  match = trimmed.match(/^wait\\s+(\\d+)(ms|s)?$/i);
  if (match) {
    const ms = match[2] === 's' ? parseInt(match[1]) * 1000 : parseInt(match[1]);
    return {
      type: 'command',
      name: 'wait',
      args: [{ type: 'literal', value: ms }],
    };
  }

  // show/hide shortcuts
  match = trimmed.match(/^(show|hide)(?:\\s+(.+))?$/i);
  if (match) {
    return {
      type: 'command',
      name: match[1].toLowerCase(),
      args: [],
      target: match[2] ? parseTarget(match[2]) : undefined,
    };
  }

  // Unknown command - try generic parsing
  const parts = trimmed.split(/\\s+/);
  if (parts.length > 0) {
    return {
      type: 'command',
      name: parts[0],
      args: parts.slice(1).map(p => ({ type: 'literal', value: p })),
    };
  }

  return null;
}

function parseTarget(str) {
  const s = str.trim();
  if (s === 'me') return { type: 'identifier', value: 'me' };
  if (s === 'body') return { type: 'identifier', value: 'body' };
  if (s.startsWith('#') || s.startsWith('.') || s.startsWith('[')) {
    return { type: 'selector', value: s };
  }
  if (s.startsWith(':')) {
    return { type: 'variable', name: s, scope: 'local' };
  }
  return { type: 'identifier', value: s };
}

function parseLiteValue(str) {
  const s = str.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return { type: 'literal', value: s.slice(1, -1) };
  }
  if (/^-?\\d+(\\.\\d+)?$/.test(s)) {
    return { type: 'literal', value: parseFloat(s) };
  }
  if (s === 'true') return { type: 'literal', value: true };
  if (s === 'false') return { type: 'literal', value: false };
  if (s === 'null') return { type: 'literal', value: null };
  if (s.startsWith(':')) return { type: 'variable', name: s, scope: 'local' };
  if (s === 'me') return { type: 'identifier', value: 'me' };
  return { type: 'identifier', value: s };
}
`;

// =============================================================================
// HYBRID PARSER TEMPLATE
// =============================================================================

/**
 * Full recursive descent parser with operator precedence.
 * Use when blocks, positional expressions, or complex features are detected.
 */
export const HYBRID_PARSER_TEMPLATE = `
// Hybrid Parser - Full AST with operator precedence

// Tokenizer
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
  'is', 'matches', 'contains', 'includes', 'exists', 'has', 'init', 'every', 'by',
]);

const COMMAND_ALIASES = {
  flip: 'toggle', switch: 'toggle', display: 'show', reveal: 'show',
  conceal: 'hide', increase: 'increment', decrease: 'decrement',
  fire: 'trigger', dispatch: 'send', navigate: 'go', goto: 'go',
};

const EVENT_ALIASES = {
  clicked: 'click', pressed: 'keydown', changed: 'change',
  submitted: 'submit', loaded: 'load',
};

function normalizeCommand(name) {
  const lower = name.toLowerCase();
  return COMMAND_ALIASES[lower] || lower;
}

function normalizeEvent(name) {
  const lower = name.toLowerCase();
  return EVENT_ALIASES[lower] || lower;
}

function tokenize(code) {
  const tokens = [];
  let pos = 0;

  while (pos < code.length) {
    if (/\\s/.test(code[pos])) { pos++; continue; }
    if (code.slice(pos, pos + 2) === '--') {
      while (pos < code.length && code[pos] !== '\\n') pos++;
      continue;
    }

    const start = pos;

    // HTML selector <tag/>
    if (code[pos] === '<' && /[a-zA-Z]/.test(code[pos + 1] || '')) {
      pos++;
      while (pos < code.length && code[pos] !== '>') pos++;
      if (code[pos] === '>') pos++;
      const val = code.slice(start, pos);
      if (val.endsWith('/>') || val.endsWith('>')) {
        const normalized = val.slice(1).replace(/\\/?>$/, '');
        tokens.push({ type: 'selector', value: normalized, pos: start });
        continue;
      }
    }

    // Possessive 's
    if (code.slice(pos, pos + 2) === "'s" && !/[a-zA-Z]/.test(code[pos + 2] || '')) {
      tokens.push({ type: 'operator', value: "'s", pos: start });
      pos += 2;
      continue;
    }

    // String literals
    if (code[pos] === '"' || code[pos] === "'") {
      const quote = code[pos++];
      while (pos < code.length && code[pos] !== quote) {
        if (code[pos] === '\\\\') pos++;
        pos++;
      }
      pos++;
      tokens.push({ type: 'string', value: code.slice(start, pos), pos: start });
      continue;
    }

    // Numbers with units
    if (/\\d/.test(code[pos]) || (code[pos] === '-' && /\\d/.test(code[pos + 1] || ''))) {
      if (code[pos] === '-') pos++;
      while (pos < code.length && /[\\d.]/.test(code[pos])) pos++;
      if (code.slice(pos, pos + 2) === 'ms') pos += 2;
      else if (code[pos] === 's' && !/[a-zA-Z]/.test(code[pos + 1] || '')) pos++;
      else if (code.slice(pos, pos + 2) === 'px') pos += 2;
      tokens.push({ type: 'number', value: code.slice(start, pos), pos: start });
      continue;
    }

    // Local variable :name
    if (code[pos] === ':') {
      pos++;
      while (pos < code.length && /[\\w]/.test(code[pos])) pos++;
      tokens.push({ type: 'localVar', value: code.slice(start, pos), pos: start });
      continue;
    }

    // Global variable $name
    if (code[pos] === '$') {
      pos++;
      while (pos < code.length && /[\\w]/.test(code[pos])) pos++;
      tokens.push({ type: 'globalVar', value: code.slice(start, pos), pos: start });
      continue;
    }

    // CSS selectors: #id, .class
    if (code[pos] === '#' || code[pos] === '.') {
      if (code[pos] === '.') {
        const afterDot = code.slice(pos + 1).match(/^(once|prevent|stop|debounce|throttle)\\b/i);
        if (afterDot) {
          tokens.push({ type: 'symbol', value: '.', pos: start });
          pos++;
          continue;
        }
      }
      pos++;
      while (pos < code.length && /[\\w-]/.test(code[pos])) pos++;
      tokens.push({ type: 'selector', value: code.slice(start, pos), pos: start });
      continue;
    }

    // Array literal vs Attribute selector
    if (code[pos] === '[') {
      let lookahead = pos + 1;
      while (lookahead < code.length && /\\s/.test(code[lookahead])) lookahead++;
      const nextChar = code[lookahead] || '';
      const isArrayLiteral = /['"\\d\\[\\]:\\$\\-]/.test(nextChar) || nextChar === '';
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

    // Style property *opacity
    if (code[pos] === '*' && /[a-zA-Z]/.test(code[pos + 1] || '')) {
      pos++;
      while (pos < code.length && /[\\w-]/.test(code[pos])) pos++;
      tokens.push({ type: 'styleProperty', value: code.slice(start, pos), pos: start });
      continue;
    }

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

    if (/[a-zA-Z_]/.test(code[pos])) {
      while (pos < code.length && /[\\w-]/.test(code[pos])) pos++;
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

// Parser
class HybridParser {
  constructor(code) {
    this.tokens = tokenize(code);
    this.pos = 0;
  }

  peek(offset = 0) {
    return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)];
  }

  advance() {
    return this.tokens[this.pos++];
  }

  match(...values) {
    const token = this.peek();
    return values.some(v => token.value.toLowerCase() === v.toLowerCase());
  }

  matchType(...types) {
    return types.includes(this.peek().type);
  }

  expect(value) {
    if (!this.match(value) && normalizeCommand(this.peek().value) !== value) {
      throw new Error("Expected '" + value + "', got '" + this.peek().value + "'");
    }
    return this.advance();
  }

  isAtEnd() {
    return this.peek().type === 'eof';
  }

  parse() {
    if (this.match('on')) return this.parseEventHandler();
    if (this.match('init')) {
      this.advance();
      return { type: 'event', event: 'init', modifiers: {}, body: this.parseCommandSequence() };
    }
    if (this.match('every')) return this.parseEveryHandler();
    return { type: 'sequence', commands: this.parseCommandSequence() };
  }

  parseEventHandler() {
    this.expect('on');
    const eventName = this.advance().value;
    const modifiers = {};
    let filter;

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

    return { type: 'event', event: normalizeEvent(eventName), filter, modifiers, body: this.parseCommandSequence() };
  }

  parseEveryHandler() {
    this.expect('every');
    const interval = this.advance().value;
    return { type: 'event', event: 'interval:' + interval, modifiers: {}, body: this.parseCommandSequence() };
  }

  parseCommandSequence() {
    const commands = [];
    while (!this.isAtEnd() && !this.match('end', 'else')) {
      const cmd = this.parseCommand();
      if (cmd) commands.push(cmd);
      if (this.match('then', 'and')) this.advance();
    }
    return commands;
  }

  parseCommand() {
    if (this.match('if', 'unless')) return this.parseIf();
    if (this.match('repeat')) return this.parseRepeat();
    if (this.match('for')) return this.parseFor();
    if (this.match('while')) return this.parseWhile();
    if (this.match('fetch')) return this.parseFetchBlock();

    const cmdMap = {
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
    if (cmdMap[normalized]) return cmdMap[normalized]();

    if (!this.isAtEnd() && !this.match('then', 'and', 'end', 'else')) this.advance();
    return null;
  }

  parseIf() {
    const isUnless = this.match('unless');
    this.advance();
    const condition = this.parseExpression();
    const body = this.parseCommandSequence();
    let elseBody;

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

  parseRepeat() {
    this.expect('repeat');
    let count;
    if (!this.match('until', 'while', 'forever')) {
      count = this.parseExpression();
      if (this.match('times')) this.advance();
    }
    const body = this.parseCommandSequence();
    if (this.match('end')) this.advance();
    return { type: 'repeat', condition: count, body };
  }

  parseFor() {
    this.expect('for');
    if (this.match('each')) this.advance();
    const variable = this.advance().value;
    this.expect('in');
    const iterable = this.parseExpression();
    const body = this.parseCommandSequence();
    if (this.match('end')) this.advance();
    return { type: 'for', condition: { type: 'forCondition', variable, iterable }, body };
  }

  parseWhile() {
    this.expect('while');
    const condition = this.parseExpression();
    const body = this.parseCommandSequence();
    if (this.match('end')) this.advance();
    return { type: 'while', condition, body };
  }

  parseFetchBlock() {
    this.expect('fetch');
    const url = this.parseExpression();
    let responseType = { type: 'literal', value: 'text' };
    if (this.match('as')) {
      this.advance();
      responseType = this.parseExpression();
    }
    if (this.match('then')) this.advance();
    const body = this.parseCommandSequence();
    return { type: 'fetch', condition: { type: 'fetchConfig', url, responseType }, body };
  }

  parseToggle() {
    this.expect('toggle');
    const what = this.parseExpression();
    let target;
    if (this.match('on')) {
      this.advance();
      target = this.parseExpression();
    }
    return { type: 'command', name: 'toggle', args: [what], target };
  }

  parseAdd() {
    this.expect('add');
    const what = this.parseExpression();
    let target;
    if (this.match('to')) {
      this.advance();
      target = this.parseExpression();
    }
    return { type: 'command', name: 'add', args: [what], target };
  }

  parseRemove() {
    this.expect('remove');
    if (this.matchType('selector')) {
      const what = this.parseExpression();
      let target;
      if (this.match('from')) {
        this.advance();
        target = this.parseExpression();
      }
      return { type: 'command', name: 'removeClass', args: [what], target };
    }
    const target = this.parseExpression();
    return { type: 'command', name: 'remove', args: [], target };
  }

  parsePut() {
    this.expect('put');
    const content = this.parseExpression();
    let modifier = 'into';
    if (this.match('into', 'before', 'after', 'at')) {
      modifier = this.advance().value;
      if (modifier === 'at') {
        const pos = this.advance().value;
        this.expect('of');
        modifier = 'at ' + pos + ' of';
      }
    }
    const target = this.parseExpression();
    return { type: 'command', name: 'put', args: [content], target, modifier };
  }

  parseAppend() {
    this.expect('append');
    const content = this.parseExpression();
    let target;
    if (this.match('to')) {
      this.advance();
      target = this.parseExpression();
    }
    return { type: 'command', name: 'append', args: [content], target };
  }

  parseSet() {
    this.expect('set');
    const target = this.parseExpression();
    if (this.match('to')) {
      this.advance();
      const value = this.parseExpression();
      return { type: 'command', name: 'set', args: [target, value] };
    }
    return { type: 'command', name: 'set', args: [target] };
  }

  parseGet() {
    this.expect('get');
    return { type: 'command', name: 'get', args: [this.parseExpression()] };
  }

  parseCall() {
    this.expect('call');
    return { type: 'command', name: 'call', args: [this.parseExpression()] };
  }

  parseLog() {
    this.expect('log');
    const args = [];
    while (!this.isAtEnd() && !this.match('then', 'and', 'end', 'else')) {
      args.push(this.parseExpression());
      if (this.match(',')) this.advance();
      else break;
    }
    return { type: 'command', name: 'log', args };
  }

  parseSend() {
    this.advance();
    const event = this.advance().value;
    let target;
    if (this.match('to')) {
      this.advance();
      target = this.parseExpression();
    }
    return { type: 'command', name: 'send', args: [{ type: 'literal', value: event }], target };
  }

  parseWait() {
    this.expect('wait');
    if (this.match('for')) {
      this.advance();
      const event = this.advance().value;
      let target;
      if (this.match('from')) {
        this.advance();
        target = this.parseExpression();
      }
      return { type: 'command', name: 'waitFor', args: [{ type: 'literal', value: event }], target };
    }
    return { type: 'command', name: 'wait', args: [this.parseExpression()] };
  }

  parseShow() {
    this.expect('show');
    let target;
    const modifiers = {};
    if (!this.isAtEnd() && !this.match('then', 'and', 'end', 'else', 'when', 'where')) {
      target = this.parseExpression();
    }
    if (!this.isAtEnd() && this.match('when', 'where')) {
      const keyword = this.advance().value;
      modifiers[keyword] = this.parseExpression();
    }
    return { type: 'command', name: 'show', args: [], target, modifiers };
  }

  parseHide() {
    this.expect('hide');
    let target;
    const modifiers = {};
    if (!this.isAtEnd() && !this.match('then', 'and', 'end', 'else', 'when', 'where')) {
      target = this.parseExpression();
    }
    if (!this.isAtEnd() && this.match('when', 'where')) {
      const keyword = this.advance().value;
      modifiers[keyword] = this.parseExpression();
    }
    return { type: 'command', name: 'hide', args: [], target, modifiers };
  }

  parseTake() {
    this.expect('take');
    const what = this.parseExpression();
    let from;
    if (this.match('from')) {
      this.advance();
      from = this.parseExpression();
    }
    return { type: 'command', name: 'take', args: [what], target: from };
  }

  parseIncDec(name) {
    this.advance();
    const target = this.parseExpression();
    let amount = { type: 'literal', value: 1 };
    if (this.match('by')) {
      this.advance();
      amount = this.parseExpression();
    }
    return { type: 'command', name, args: [target, amount] };
  }

  parseFocusBlur(name) {
    this.advance();
    let target;
    if (!this.isAtEnd() && !this.match('then', 'and', 'end', 'else')) {
      target = this.parseExpression();
    }
    return { type: 'command', name, args: [], target };
  }

  parseGo() {
    this.expect('go');
    if (this.match('to')) this.advance();
    if (this.match('url')) this.advance();
    const dest = this.parseExpression();
    return { type: 'command', name: 'go', args: [dest] };
  }

  parseReturn() {
    this.expect('return');
    let value;
    if (!this.isAtEnd() && !this.match('then', 'and', 'end', 'else')) {
      value = this.parseExpression();
    }
    return { type: 'command', name: 'return', args: value ? [value] : [] };
  }

  parseTransition() {
    this.expect('transition');
    let target;
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

    const propToken = this.peek();
    let property;
    if (propToken.type === 'styleProperty') {
      property = this.advance().value;
    } else if (propToken.type === 'identifier' || propToken.type === 'keyword') {
      property = this.advance().value;
    } else {
      property = 'opacity';
    }

    return this.parseTransitionRest(target, property);
  }

  parseTransitionRest(target, property) {
    let toValue = { type: 'literal', value: 1 };
    if (this.match('to')) {
      this.advance();
      toValue = this.parseExpression();
    }
    let duration = { type: 'literal', value: 300 };
    if (this.match('over')) {
      this.advance();
      duration = this.parseExpression();
    }
    return { type: 'command', name: 'transition', args: [{ type: 'literal', value: property }, toValue, duration], target };
  }

  parseExpression() { return this.parseOr(); }

  parseOr() {
    let left = this.parseAnd();
    while (this.match('or', '||')) {
      this.advance();
      left = { type: 'binary', operator: 'or', left, right: this.parseAnd() };
    }
    return left;
  }

  parseAnd() {
    let left = this.parseEquality();
    while (this.match('and', '&&') && !this.isCommandKeyword(this.peek(1))) {
      this.advance();
      left = { type: 'binary', operator: 'and', left, right: this.parseEquality() };
    }
    return left;
  }

  isCommandKeyword(token) {
    const cmds = ['toggle', 'add', 'remove', 'set', 'put', 'log', 'send', 'wait', 'show', 'hide', 'increment', 'decrement', 'focus', 'blur', 'go'];
    return cmds.includes(normalizeCommand(token.value));
  }

  parseEquality() {
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

  parseComparison() {
    let left = this.parseAdditive();
    while (this.match('<', '>', '<=', '>=')) {
      const op = this.advance().value;
      left = { type: 'binary', operator: op, left, right: this.parseAdditive() };
    }
    return left;
  }

  parseAdditive() {
    let left = this.parseMultiplicative();
    while (this.match('+', '-')) {
      const op = this.advance().value;
      left = { type: 'binary', operator: op, left, right: this.parseMultiplicative() };
    }
    return left;
  }

  parseMultiplicative() {
    let left = this.parseUnary();
    while (this.match('*', '/', '%')) {
      const op = this.advance().value;
      left = { type: 'binary', operator: op, left, right: this.parseUnary() };
    }
    return left;
  }

  parseUnary() {
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

  parsePostfix() {
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
        const args = [];
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

  parsePrimary() {
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

  parseObjectLiteral() {
    this.expect('{');
    const properties = [];
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

  parseArrayLiteral() {
    this.expect('[');
    const elements = [];
    while (!this.match(']')) {
      elements.push(this.parseExpression());
      if (this.match(',')) this.advance();
    }
    this.expect(']');
    return { type: 'array', elements };
  }

  parsePositionalTarget() {
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
`;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the appropriate parser template based on detected features.
 */
export function getParserTemplate(type: 'lite' | 'hybrid'): string {
  return type === 'lite' ? LITE_PARSER_TEMPLATE : HYBRID_PARSER_TEMPLATE;
}

/**
 * Commands supported by the lite parser.
 */
export const LITE_PARSER_COMMANDS = [
  'toggle',
  'add',
  'remove',
  'put',
  'set',
  'log',
  'send',
  'wait',
  'show',
  'hide',
] as const;

/**
 * Check if a set of commands can be handled by the lite parser.
 */
export function canUseLiteParser(
  commands: string[],
  blocks: string[],
  positional: boolean
): boolean {
  if (blocks.length > 0) return false;
  if (positional) return false;

  const liteCommands = new Set(LITE_PARSER_COMMANDS);
  return commands.every(cmd => liteCommands.has(cmd as (typeof LITE_PARSER_COMMANDS)[number]));
}
