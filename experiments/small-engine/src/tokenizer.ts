/**
 * Tokenizer. Follows upstream _hyperscript's lexical rules (src/core/tokenizer.js):
 * the same token kinds, the same context rule for `.x` / `#x` (a reference unless
 * the previous character could end a value), and the same string escapes.
 *
 * `template` is the mode used for the inside of a backtick string or a query
 * reference: text is kept verbatim until `$` / `${`, where normal lexing resumes.
 * Upstream's third mode (`"lines"`, for the `render` command) is not implemented.
 */

export interface Token {
  type: string;
  value: string;
  start: number;
  end: number;
  line: number;
  column: number;
  /** An operator or punctuation token. */
  op?: boolean;
  /** A backtick string, or a `.{…}` / `#{…}` reference. */
  template?: boolean;
}

const OPS = new Set(
  '+ - * / . .. \\ : % | ! ? # & $ ; , ( ) < > <= >= == === != !== { } [ ] = ~ ^'.split(' ')
);

const ESCAPES: Record<string, string> = { b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', v: '\v' };

const alpha = (c: string) => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
const digit = (c: string) => c >= '0' && c <= '9';
const space = (c: string) => c === ' ' || c === '\t' || c === '\r' || c === '\n';
const cssChar = (c: string) => alpha(c) || digit(c) || c === '-' || c === '_' || c === ':';
const identChar = (c: string) => alpha(c) || digit(c) || c === '_' || c === '$';

export function tokenize(src: string, template = false): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  let column = 0;
  let line = 1;
  let last = '<START>';
  let braces = 0;

  const cur = () => src.charAt(pos);
  const at = (offset: number) => src.charAt(pos + offset);
  const eat = () => {
    last = src.charAt(pos++);
    if (last === '\n') {
      line++;
      column = 0;
    } else column++;
    return last;
  };
  const make = (type: string): Token => ({ type, value: '', start: pos, end: pos + 1, line, column });
  const done = (token: Token, value: string) => {
    token.value = value;
    token.end = pos;
    return token;
  };
  const eatWhile = (test: (c: string) => boolean) => {
    let value = '';
    while (cur() && test(cur())) value += eat();
    return value;
  };
  const inTemplate = () => template && braces === 0;
  // `.x` after a value is a property access, not a class reference.
  const afterValue = () => alpha(last) || digit(last) || ')"\'`}]'.includes(last);

  const reference = (type: string, keepBrace: boolean) => {
    const token = make(type);
    let value = eat();
    if (cur() === '{') {
      token.template = true;
      value += eat();
      value += eatWhile(c => c !== '}');
      if (cur() !== '}') throw new Error('Unterminated ' + (keepBrace ? 'class' : 'id') + ' reference');
      const brace = eat();
      if (keepBrace) value += brace;
    } else if (keepBrace) {
      while (cssChar(cur()) || cur() === '\\') {
        if (cur() === '\\') eat();
        value += eat();
      }
    } else value += eatWhile(cssChar);
    return done(token, value);
  };

  const string = () => {
    const token = make('STRING');
    const quote = eat();
    token.template = quote === '`';
    let value = '';
    while (cur() && cur() !== quote) {
      if (cur() === '\\') {
        eat();
        const next = eat();
        if (next in ESCAPES) value += ESCAPES[next];
        else if (token.template && next === '$') value += '\\$';
        else if (next === 'x') {
          const hex = cur() && at(1) ? parseInt(eat() + eat(), 16) : NaN;
          if (Number.isNaN(hex)) {
            throw new Error(`Invalid hexadecimal escape at [Line: ${token.line}, Column: ${token.column}]`);
          }
          value += String.fromCharCode(hex);
        } else value += next;
      } else value += eat();
    }
    if (cur() !== quote) {
      throw new Error(`Unterminated string at [Line: ${token.line}, Column: ${token.column}]`);
    }
    eat();
    return done(token, value);
  };

  const identifier = () => {
    const token = make('IDENTIFIER');
    let value = eat() + eatWhile(identChar);
    if (cur() === '!' && value === 'beep') value += eat();
    return done(token, value);
  };

  const templateIdentifier = () => {
    const token = make('IDENTIFIER');
    let value = eat();
    let escaped = value === '\\';
    if (escaped) value = '';
    while (identChar(cur()) || '\\{}'.includes(cur() || ' ')) {
      if (cur() === '$' && !escaped) break;
      if (cur() === '\\') {
        escaped = true;
        eat();
      } else {
        escaped = false;
        value += eat();
      }
    }
    return done(token, value);
  };

  const number = () => {
    const token = make('NUMBER');
    let value = eat() + eatWhile(digit);
    if (cur() === '.' && digit(at(1))) value += eat();
    value += eatWhile(digit);
    if (cur() === 'e' || cur() === 'E') {
      if (digit(at(1))) value += eat();
      else if (at(1) === '-') value += eat() + eat();
    }
    return done(token, value + eatWhile(digit));
  };

  const op = () => {
    const token = make('OP');
    token.op = true;
    let value = eat();
    while (cur() && OPS.has(value + cur())) value += eat();
    return done(token, value);
  };

  const attributeRef = () => {
    const token = make('ATTRIBUTE_REF');
    let value = eat();
    if (value === '[') {
      value += eatWhile(c => c !== ']');
      if (cur() === ']') value += eat();
    } else {
      value += eatWhile(cssChar);
      if (cur() === '=') {
        value += eat();
        if (cur() === '"' || cur() === "'") value += string().value;
        else if (identChar(cur())) value += identifier().value;
      }
    }
    return done(token, value);
  };

  // A quote after an identifier or a reference is the possessive `'s`, not a string.
  const quoteStartsString = () => {
    const prev = tokens.at(-1);
    if (!prev) return true;
    if (prev.type === 'IDENTIFIER' || prev.type === 'CLASS_REF' || prev.type === 'ID_REF') return false;
    return !(prev.op && (prev.value === '>' || prev.value === ')'));
  };

  const isComment = () => {
    const c = cur();
    const end = at(2);
    return (c === '-' || c === '/') && at(1) === c && (space(end) || end === '' || end === c);
  };

  while (pos < src.length) {
    const c = cur();
    const next = at(1);
    if (isComment()) {
      eatWhile(ch => ch !== '\r' && ch !== '\n');
      eat();
    } else if (space(c)) {
      tokens.push(done(make('WHITESPACE'), eatWhile(space)));
    } else if (!afterValue() && c === '.' && (alpha(next) || next === '{' || next === '-')) {
      tokens.push(reference('CLASS_REF', true));
    } else if (!afterValue() && c === '#' && (alpha(next) || next === '{')) {
      tokens.push(reference('ID_REF', false));
    } else if (c === '@' || (c === '[' && next === '@')) {
      tokens.push(attributeRef());
    } else if (c === '*' && alpha(next)) {
      const token = make('STYLE_REF');
      tokens.push(done(token, eat() + eatWhile(ch => alpha(ch) || ch === '-')));
    } else if (inTemplate() && (alpha(c) || c === '\\')) {
      tokens.push(templateIdentifier());
    } else if (!inTemplate() && (alpha(c) || c === '_' || c === '$')) {
      tokens.push(identifier());
    } else if (digit(c)) {
      tokens.push(number());
    } else if (!inTemplate() && (c === '"' || c === '`')) {
      tokens.push(string());
    } else if (!inTemplate() && c === "'") {
      tokens.push(quoteStartsString() ? string() : op());
    } else if (OPS.has(c)) {
      if (last === '$' && c === '{') braces++;
      if (c === '}') braces--;
      tokens.push(op());
    } else if (inTemplate() || c === '`') {
      const token = make('RESERVED');
      tokens.push(done(token, eat()));
    } else {
      throw new Error('Unknown token: ' + c + ' ');
    }
  }
  return tokens;
}
