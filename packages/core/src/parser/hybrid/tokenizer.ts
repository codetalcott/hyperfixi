/**
 * HyperFixi Hybrid Parser - Tokenizer
 *
 * Lexical analyzer for hyperscript syntax.
 * Supports CSS selectors, variables, operators, and keywords.
 */

export type TokenType =
  | 'identifier' | 'number' | 'string' | 'operator' | 'styleProperty'
  | 'selector' | 'localVar' | 'globalVar' | 'symbol' | 'keyword' | 'eof';

export interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

export const KEYWORDS = new Set([
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

export function tokenize(code: string): Token[] {
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

    // HTML selector: <button.class/> - only if followed by a letter (tag name)
    // If followed by space, number, or '=' it's a comparison operator instead
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

    // Possessive 's - check BEFORE string literals to avoid treating as unclosed string
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

    // CSS selectors: #id, .class (but NOT event modifiers like .once, .prevent, .stop, .debounce, .throttle)
    if (code[pos] === '#' || code[pos] === '.') {
      // Check if this is an event modifier (. followed by modifier keyword)
      if (code[pos] === '.') {
        const afterDot = code.slice(pos + 1).match(/^(once|prevent|stop|debounce|throttle)\b/i);
        if (afterDot) {
          // Emit . as a symbol, let the keyword be parsed next
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
    // Array literals start with [ followed by quote, number, :, $, [, or ]
    // Attribute selectors start with [ followed by identifier
    if (code[pos] === '[') {
      // Look ahead to determine if this is an array literal
      let lookahead = pos + 1;
      while (lookahead < code.length && /\s/.test(code[lookahead])) lookahead++;
      const nextChar = code[lookahead] || '';
      const isArrayLiteral = /['"\d\[\]:\$\-]/.test(nextChar) || nextChar === '';

      if (isArrayLiteral) {
        // Emit [ as a symbol for array literal
        tokens.push({ type: 'symbol', value: '[', pos: start });
        pos++;
        continue;
      } else {
        // Attribute selector [attr=value]
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

    // Closing bracket for array literals
    if (code[pos] === ']') {
      tokens.push({ type: 'symbol', value: ']', pos: start });
      pos++;
      continue;
    }

    // Possessive 's (duplicate check for safety)
    if (code.slice(pos, pos + 2) === "'s") {
      tokens.push({ type: 'operator', value: "'s", pos: start });
      pos += 2;
      continue;
    }

    // Multi-char operators
    const twoChar = code.slice(pos, pos + 2);
    if (['==', '!=', '<=', '>=', '&&', '||'].includes(twoChar)) {
      tokens.push({ type: 'operator', value: twoChar, pos: start });
      pos += 2;
      continue;
    }

    // CSS style property: *opacity, *background-color, *display
    if (code[pos] === '*' && /[a-zA-Z]/.test(code[pos + 1] || '')) {
      pos++;
      while (pos < code.length && /[\w-]/.test(code[pos])) pos++;
      tokens.push({ type: 'styleProperty', value: code.slice(start, pos), pos: start });
      continue;
    }

    // Single-char operators and symbols
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
