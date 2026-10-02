/**
 * Token stream and grammar registry.
 *
 * `Parser` is the one object every grammar rule receives. It only knows about
 * tokens; the rules themselves live in the registry (`Grammar`), which a bundle
 * fills by registering the commands, features and expression kinds it wants.
 * A rule that is not registered does not exist, so a bundle is a list of imports.
 *
 * Errors throw. A rule either returns its node, returns `undefined` to say
 * "not mine" before consuming anything, or raises a `ParseError`.
 */
import type { Cmd, Expr, Feature } from './ast';
import type { Token } from './tokenizer';

export class ParseError extends Error {
  /** What the author wrote, when a plugin rewrote the script before it was parsed. */
  written?: string;

  constructor(
    message: string,
    readonly token: Token,
    readonly source: string,
    readonly expected?: string[]
  ) {
    super(message);
  }
}

export type CommandRule = (p: Parser, keyword: string, start: number) => Cmd | undefined;
export type FeatureRule = (p: Parser, start: number) => Feature;
export type LeafRule = (p: Parser) => Expr | undefined;
export type ChainRule = (p: Parser, root: Expr) => Expr | undefined;

export interface Grammar {
  commands: Record<string, CommandRule>;
  features: Record<string, FeatureRule>;
  /** Tried in order; the symbol rule goes last so it does not swallow keywords. */
  leaves: LeafRule[];
  /** `.prop`, `'s prop`, `(args)`, `[i]`, `of`, `in`, `as`, `@attr` after a value. */
  indirects: ChainRule[];
  /** Prefix forms: `not`, `no`, `first`, `next`, … */
  unaries: LeafRule[];
  /** `1s`, `10px`, `x:Type`. */
  postfixes: ChainRule[];
  /** `where`, `sorted by`, `mapped to`, … — looser than the indirects. */
  collections: ChainRule[];
  /** A bare call used as a command: `foo()`, `me.focus()`. */
  pseudo?: (p: Parser, start: number) => Cmd | undefined;
  /** `toggle <element>`, with no `between`: not upstream's (`additions.ts`). */
  toggleElement?: (p: Parser, target: Expr, start: number) => Cmd;
}

export const createGrammar = (): Grammar => ({
  commands: Object.create(null),
  features: Object.create(null),
  leaves: [],
  indirects: [],
  unaries: [],
  postfixes: [],
  collections: [],
});

export class Parser {
  private i = 0;
  private follows: string[] = [];
  private readonly eof: Token;
  /** The last token consumed by a match. */
  last: Token;

  constructor(
    readonly g: Grammar,
    readonly tokens: Token[],
    readonly src: string
  ) {
    const end = src.length;
    this.eof = { type: 'EOF', value: '<<<EOF>>>', start: end, end, line: 0, column: 0 };
    this.last = this.eof;
    this.skipWs();
  }

  child(tokens: Token[], src: string): Parser {
    return new Parser(this.g, tokens, src);
  }

  // ----- access ------------------------------------------------------------

  /** The nth token from here; whitespace is skipped unless `ws`. */
  tok(n = 0, ws = false): Token {
    let j = this.i;
    for (;;) {
      if (!ws) while (this.tokens[j]?.type === 'WHITESPACE') j++;
      if (n-- === 0) return this.tokens[j] ?? this.eof;
      j++;
    }
  }

  cur(): Token {
    return this.tokens[this.i] ?? this.eof;
  }

  hasMore(): boolean {
    return this.i < this.tokens.length;
  }

  /** Start offset of the current token — what a rule records as its node's `start`. */
  pos(): number {
    return this.cur().start;
  }

  /** End offset of the last consumed token — a node's `end`. */
  endPos(): number {
    return this.last.end;
  }

  text(node: { start: number; end: number }): string {
    return this.src.substring(node.start, node.end);
  }

  // ----- matching ----------------------------------------------------------

  match(value: string, type = 'IDENTIFIER'): Token | undefined {
    if (this.follows.includes(value)) return;
    const t = this.cur();
    if (t.value === value && t.type === type) return this.consume();
  }

  matchOp(value: string): Token | undefined {
    const t = this.cur();
    if (t.op && t.value === value) return this.consume();
  }

  matchType(...types: string[]): Token | undefined {
    if (types.includes(this.cur().type)) return this.consume();
  }

  matchAny(...values: string[]): Token | undefined {
    for (const value of values) {
      const t = this.match(value);
      if (t) return t;
    }
  }

  matchAnyOp(...values: string[]): Token | undefined {
    for (const value of values) {
      const t = this.matchOp(value);
      if (t) return t;
    }
  }

  req(value: string): Token {
    return this.match(value) ?? this.expected(value);
  }

  reqOp(value: string): Token {
    return this.matchOp(value) ?? this.expected(value);
  }

  reqType(...types: string[]): Token {
    return this.matchType(...types) ?? this.expected(...types);
  }

  /** Is the nth token from here this identifier (or this `type`)? Consumes nothing. */
  peek(value: string, n = 0, type = 'IDENTIFIER'): Token | undefined {
    const t = this.tok(n);
    if (t.value === value && t.type === type) return t;
  }

  // ----- consuming ---------------------------------------------------------

  consume(): Token {
    if (!this.hasMore()) return this.eof;
    this.last = this.tokens[this.i++];
    this.skipWs();
    return this.last;
  }

  private skipWs(): void {
    while (this.tokens[this.i]?.type === 'WHITESPACE') this.i++;
  }

  /** Raw tokens (whitespace included) up to a token with this value or type. */
  consumeUntil(value?: string, type?: string): Token[] {
    const out: Token[] = [];
    let t = this.cur();
    while (
      (type == null || t.type !== type) &&
      (value == null || t.value !== value) &&
      t.type !== 'EOF'
    ) {
      out.push(t);
      this.i++;
      t = this.cur();
    }
    this.skipWs();
    return out;
  }

  /** The whitespace just before the current token, if any. */
  lastWs(): string {
    const t = this.tokens[this.i - 1];
    return t?.type === 'WHITESPACE' ? t.value : '';
  }

  // ----- follow set: words a nested rule must leave for its caller ----------

  pushFollow(...words: string[]): number {
    this.follows.push(...words);
    return words.length;
  }

  popFollow(count = 1): void {
    this.follows.length -= count;
  }

  /** Parse with `words` reserved for the caller, e.g. the `to` of `set x to y`. */
  withFollow<T>(words: string[], f: () => T): T {
    const count = this.pushFollow(...words);
    try {
      return f();
    } finally {
      this.popFollow(count);
    }
  }

  /** Parse with no reserved words — inside parentheses the outer rule's words are free again. */
  withoutFollows<T>(f: () => T): T {
    const saved = this.follows;
    this.follows = [];
    try {
      return f();
    } finally {
      this.follows = saved;
    }
  }

  // ----- errors ------------------------------------------------------------

  err(message?: string, expected?: string[]): never {
    const token = this.cur();
    throw new ParseError(message ?? 'Unexpected Token : ' + token.value, token, this.src, expected);
  }

  expected(...expected: string[]): never {
    this.err(
      expected.length === 1
        ? `Expected '${expected[0]}' but found '${this.cur().value}'`
        : 'Expected one of: ' + expected.map(e => `'${e}'`).join(', '),
      expected
    );
  }

  // ----- statement boundaries ------------------------------------------------

  commandStart(token: Token): boolean {
    return token.value in this.g.commands;
  }

  featureStart(token: Token): boolean {
    return token.value in this.g.features;
  }

  commandBoundary(token: Token): boolean {
    return (
      ['end', 'then', 'else', 'otherwise', ')'].includes(token.value) ||
      this.commandStart(token) ||
      this.featureStart(token) ||
      token.type === 'EOF'
    );
  }
}

/** One error, with the offending line and a caret under the token. */
export function formatError(e: ParseError): string {
  const lines = e.source.split('\n');
  const index = e.token.line ? e.token.line - 1 : lines.length - 1;
  const line = lines[index] ?? '';
  const column = e.token.line ? e.token.column : Math.max(0, line.length - 1);
  const gutter = String(index + 1).length;
  const pad = ' '.repeat(gutter + 5 + column);
  return (
    `  ${index + 1} | ${line}\n` +
    pad +
    '^'.repeat(Math.max(1, e.token.value.length)) +
    '\n' +
    pad +
    e.message +
    '\n'
  );
}
