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
  /**
   * The raw source. Kept because `js … end` must be sliced from it verbatim —
   * the tokenizer reads a JS body as hyperscript and mangles regexes, template
   * literals and single quotes. Same approach as the full parser's
   * `parseJsCommand`, which slices between token offsets for the same reason.
   */
  private source: string;

  constructor(code: string) {
    this.source = code;
    this.tokens = tokenize(code);
  }

  /**
   * Command keyword → parse rule. Built once per parse rather than once per
   * command, and the single place the parser's command set is written down:
   * `isCommandKeyword()` reads these keys instead of carrying its own copy.
   *
   * MUST stay in sync with `bundle-generator/parser-templates.ts`'s
   * `HYBRID_PARSER_TEMPLATE` — core's `generateBundle()` imports this file
   * while the vite-plugin's generator embeds that template, so a name in only
   * one of them makes the reachable command set depend on which generator the
   * user went through. Gated by `capability-emission.test.ts` §3.
   */
  private readonly cmdMap: Record<string, () => CommandNode> = {
    toggle: () => this.parseToggle(),
    add: () => this.parseAdd(),
    remove: () => this.parseRemove(),
    put: () => this.parsePut(),
    append: () => this.parseInsertion('append'),
    prepend: () => this.parseInsertion('prepend'),
    set: () => this.parseSet(),
    get: () => this.parseGet(),
    call: () => this.parseCall(),
    log: () => this.parseLog(),
    send: () => this.parseSend('to'),
    // `trigger <event> on <target>` — same node as `send`, per the runtime,
    // where `trigger` is a consolidation alias sharing `send`'s implementation.
    // The target marker differs, which is why it is a parameter and not a
    // second entry pointing at the same rule (that dropped the target).
    trigger: () => this.parseSend('on'),
    wait: () => this.parseWait(),
    show: () => this.parseShow(),
    hide: () => this.parseHide(),
    take: () => this.parseTake(),
    empty: () => this.parseEmpty(),
    increment: () => this.parseIncDec('increment'),
    decrement: () => this.parseIncDec('decrement'),
    focus: () => this.parseFocusBlur('focus'),
    blur: () => this.parseFocusBlur('blur'),
    go: () => this.parseGo(),
    return: () => this.parseReturn(),
    transition: () => this.parseTransition(),
    halt: () => this.parseHalt(),
    copy: () => this.parseCopy(),
    beep: () => this.parseBeep(),
    push: () => this.parseUrlCommand('push'),
    replace: () => this.parseUrlCommand('replace'),
    morph: () => this.parseMorph(),
    js: () => this.parseJs(),
    throw: () => this.parseThrow(),
    break: () => this.parseBare('break'),
    continue: () => this.parseBare('continue'),
    exit: () => this.parseBare('exit'),
  };

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
      if (mod === 'once') modifiers.once = true as const;
      else if (mod === 'prevent') modifiers.prevent = true as const;
      else if (mod === 'stop') modifiers.stop = true as const;
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

    // Commands — dispatch table is the `cmdMap` field (see its doc comment).
    const normalized = normalizeCommand(this.peek().value);
    if (this.cmdMap[normalized]) {
      return this.cmdMap[normalized]();
    }

    // `catch`/`finally` open error blocks only the full AST parser understands.
    // The skip fallback below used to swallow them one token at a time, so the
    // CATCH BODY joined the success-path sequence and ran on every success —
    // `put 'Request failed' into #out` overwriting a successful render. Silent
    // and destructive.
    //
    // Reject loudly instead. Every consumer of this parser has an error boundary
    // that logs the offending code (browser-bundle-hybrid-complete.ts and the
    // other bundle entries console.error it), so the cost is an inert element
    // and an actionable message — a strictly better failure than running the
    // error path on success.
    // The message is deliberately terse — it costs bundle bytes in the smallest
    // bundles we ship, and the error boundary already logs the offending code,
    // so it only needs the keyword and the remedy.
    if (this.match('catch', 'finally')) {
      throw new Error(`'${this.peek().value}' needs the full parser (use hyperfixi.js)`);
    }

    // A WORD at command position that no rule claims is a command this bundle
    // does not ship. Reject it the same way, naming the remedy: the skip
    // fallback below used to drop it one token at a time, so `make a <div/>`
    // in a hybrid bundle ran as NOTHING and logged nothing — measured 2026-09-04
    // by the bundle-compatibility row that now pins this. Stray non-word
    // tokens (a bare `@`) still skip.
    const stray = this.peek();
    if (
      !this.isAtEnd() &&
      (stray.type === 'identifier' || stray.type === 'keyword') &&
      !this.match('then', 'and', 'end', 'else')
    ) {
      throw new Error(`'${stray.value}' needs the full parser (use hyperfixi.js)`);
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

  /**
   * A naked URL — `fetch /api/data …`, `fetch https://x/y …` — the way upstream
   * reads one: everything up to the next whitespace, verbatim. The tokenizer
   * splits `/api/data` into `/`, `api`, `/`, `data`, and `parseExpression` used
   * to return the first `/` as the URL; the skip fallback then dropped the rest
   * silently, so every unquoted `fetch /path` in a hybrid bundle fetched `/`.
   * Measured 2026-09-04 when the fallback stopped being silent.
   */
  private parseNakedUrl(): ASTNode | null {
    const tok = this.peek();
    const isSlash = tok.type === 'operator' && tok.value === '/';
    const isScheme =
      (tok.value === 'http' || tok.value === 'https') &&
      this.source.slice(tok.pos + tok.value.length, tok.pos + tok.value.length + 3) === '://';
    if (!isSlash && !isScheme) return null;
    let end = tok.pos;
    while (end < this.source.length && !/\s/.test(this.source[end])) end++;
    while (!this.isAtEnd() && this.peek().pos < end) this.advance();
    return { type: 'literal', value: this.source.slice(tok.pos, end) };
  }

  private parseFetchBlock(): BlockNode {
    this.expect('fetch');
    const url = this.parseNakedUrl() ?? this.parseExpression();
    let responseType: ASTNode = { type: 'literal', value: 'text' };
    let options: ASTNode | undefined;
    let method: ASTNode | undefined;

    // Check for object literal directly after URL (no 'with' keyword)
    // e.g., fetch /url {method:"POST"}
    if (this.match('{')) {
      this.pos--; // back up so parseExpression handles the full object
      options = this.parseExpression();
    }

    // Parse 'via', 'as' and 'with' in any order
    for (let i = 0; i < 3; i++) {
      if (this.match('via') && !method) {
        this.advance();
        method = this.parseExpression();
        continue;
      }
      if (this.match('as')) {
        this.advance();
        // Skip optional articles 'a'/'an'
        if (this.match('a') || this.match('an')) this.advance();
        responseType = this.parseExpression();
        continue;
      }
      if (this.match('with') && !options) {
        this.advance();
        options = this.parseExpression();
        continue;
      }
      break;
    }

    if (this.match('then')) this.advance();

    const body = this.parseCommandSequence();
    return {
      type: 'fetch',
      condition: { type: 'fetchConfig', url, responseType, options, method },
      body,
    };
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
    // Discriminate on the selector's SIGIL, not merely on the token type.
    // `#id` and `<tag/>` are also `selector` tokens, so the old type-only test
    // sent `remove #t` down the class branch: `getClassName` sliced the sigil
    // off and the bundle removed a class named `t` from `me` instead of
    // removing the element. The full parser yields a `remove` node for
    // `remove #t` (its own hover doc is `remove #temp`), so this was a silent
    // divergence between the two parsers on ordinary code.
    //
    // `@attr` stays on the class branch deliberately: attribute removal has no
    // template, and routing it to element removal would turn a wrong-class bug
    // into a destructive one. Recorded as a known gap rather than widened here.
    if (this.matchType('selector') && /^[.@]/.test(this.peek().value)) {
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

  /** `append`/`prepend <content> [to <target>]` — identical shape, both ends. */
  private parseInsertion(name: 'append' | 'prepend'): CommandNode {
    this.expect(name);
    const content = this.parseExpression();
    let target: ASTNode | undefined;
    if (this.match('to')) {
      this.advance();
      target = this.parseExpression();
    }
    return { type: 'command', name, args: [content], target };
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

  /**
   * `send <event> to <target>` / `trigger <event> on <target>`.
   *
   * Both emit a `send` node — the runtime registers `trigger` as a
   * consolidation alias sharing `send`'s implementation, so the bundle
   * generator carries one template for both. The marker is a parameter
   * because it is the ONLY difference: `trigger` used to reuse this rule with
   * `to` hardcoded, which parsed the event name and then silently abandoned
   * `on #target`, leaving the dispatch to land on `me`.
   */
  private parseSend(marker: 'to' | 'on'): CommandNode {
    this.advance();
    const first = this.advance();
    let event = first.value;
    // A colon-qualified name — `send custom:event to #t` — tokenizes as
    // `custom` + localVar `:event`. Rejoin the adjacent pieces; the old code
    // took `custom` and the skip fallback swallowed `:event to #t`, so the
    // event went out under the wrong name and to `me`. Measured 2026-09-04.
    let end = first.pos + first.value.length;
    while (!this.isAtEnd() && this.peek().type === 'localVar' && this.peek().pos === end) {
      const piece = this.advance();
      event += piece.value;
      end = piece.pos + piece.value.length;
    }
    let target: ASTNode | undefined;
    if (this.match(marker)) {
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

  // ---------------------------------------------------------------------------
  // Rules restoring the commands the capability list advertised but this parser
  // could not reach (Finding 13). Every one already had a working template in
  // `bundle-generator/templates.ts`; only the parse rule was missing, so the
  // emitted `case` label was dead and the user's source silently no-opped.
  // ---------------------------------------------------------------------------

  /** `empty [<target>]` — clears children. Defaults to `me`. */
  private parseEmpty(): CommandNode {
    this.expect('empty');
    let target: ASTNode | undefined;
    if (!this.isAtEnd() && !this.match('then', 'and', 'end', 'else')) {
      target = this.parseExpression();
    }
    return { type: 'command', name: 'empty', args: [], target };
  }

  /** `copy <value>` — clipboard write. */
  private parseCopy(): CommandNode {
    this.expect('copy');
    return { type: 'command', name: 'copy', args: [this.parseExpression()] };
  }

  /**
   * `beep[!] [<value>, …]` — debug echo.
   *
   * Upstream spells it `beep!`; hyperfixi accepts both (see the tier list's
   * note on the same nuance). The `!` is consumed here because the tokenizer
   * emits it as a separate operator, and `parseUnary` would otherwise read it
   * as logical negation of the first argument.
   */
  private parseBeep(): CommandNode {
    this.advance();
    if (this.match('!')) this.advance();
    const args: ASTNode[] = [];
    while (!this.isAtEnd() && !this.match('then', 'and', 'end', 'else')) {
      args.push(this.parseExpression());
      if (this.match(',')) this.advance();
      else break;
    }
    return { type: 'command', name: 'beep', args };
  }

  /**
   * `push|replace url <url> [with title <title>]` — History API navigation.
   *
   * The `url` keyword is consumed here rather than left for the executor, the
   * way `parseGo` already does it. Note `push-url` / `replace-url` are NOT
   * source spellings — the full parser rejects both — they exist only as
   * bundle-config aliases resolving to these templates.
   */
  private parseUrlCommand(name: 'push' | 'replace'): CommandNode {
    this.advance();
    if (this.match('url')) this.advance();
    const url = this.parseExpression();
    const modifiers: Record<string, ASTNode> = {};
    if (this.match('with')) {
      this.advance();
      if (this.match('title')) {
        this.advance();
        modifiers.title = this.parseExpression();
      }
    }
    return { type: 'command', name, args: [url], modifiers };
  }

  /** `morph [over] <target> with|to|into <content>` — all four connectives the full parser takes. */
  private parseMorph(): CommandNode {
    this.expect('morph');
    let modifier: string | undefined;
    if (this.match('over')) {
      this.advance();
      modifier = 'over';
    }
    const target = this.parseExpression();
    if (this.match('with', 'to', 'into')) this.advance();
    const content = this.parseExpression();
    return { type: 'command', name: 'morph', args: [content], target, modifier };
  }

  /**
   * `js[(<params>)] <raw JavaScript> end`.
   *
   * The body is sliced from the ORIGINAL SOURCE between token offsets, never
   * reassembled from tokens — the tokenizer reads it as hyperscript, which
   * mangles regexes, template literals and possessive-looking quotes. This
   * mirrors the full parser's `parseJsCommand`.
   *
   * Known limit: the terminator scan matches the `end` TOKEN, so `end` inside a
   * JS *string* is safe (the tokenizer keeps a string as one token, quotes
   * included) but a bare JS identifier named `end` would cut the body early.
   * The full parser's `findJsEndBoundary` handles that; replicating it is not
   * worth the bytes in a bundle this size.
   */
  private parseJs(): CommandNode {
    this.advance();
    if (this.match('(')) {
      while (!this.isAtEnd() && !this.match(')')) this.advance();
      if (this.match(')')) this.advance();
    }
    const start = this.peek().pos;
    while (!this.isAtEnd() && !this.match('end')) this.advance();
    const stop = this.peek().pos;
    if (this.match('end')) this.advance();
    const code = this.source.slice(start, stop).trim();
    return { type: 'command', name: 'js', args: [{ type: 'literal', value: code }] };
  }

  /** `throw <value>` */
  private parseThrow(): CommandNode {
    this.expect('throw');
    let value: ASTNode | undefined;
    if (!this.isAtEnd() && !this.match('then', 'and', 'end', 'else')) {
      value = this.parseExpression();
    }
    return { type: 'command', name: 'throw', args: value ? [value] : [] };
  }

  /** `break` / `continue` / `exit` — bare control-flow signals, no arguments. */
  private parseBare(name: 'break' | 'continue' | 'exit'): CommandNode {
    this.advance();
    return { type: 'command', name, args: [] };
  }

  private parseHalt(): CommandNode {
    this.expect('halt');
    // Skip optional 'the'
    if (this.match('the')) this.advance();
    // Skip optional 'event' or 'default'
    if (this.match('event', 'default')) this.advance();
    return { type: 'command', name: 'halt', args: [] };
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

  /**
   * Does this token start a command rather than continue an expression?
   *
   * Used in two places with different stakes: terminating an `and` chain
   * (`toggle .x and add .y`), and refusing to read a command name as a
   * possessive property (`my show`).
   *
   * This is a deliberate SUBSET of `cmdMap`'s keys, not a second copy of it —
   * asserted as a subset in `capability-emission.test.ts` §4 so it cannot
   * name something the parser does not dispatch. It is not the full set
   * because several of the newer keys are ordinary English or JS words
   * (`copy`, `empty`, `push`, `replace`, `break`) that appear as property
   * names and operands; promoting them here would change expression parsing,
   * which is a separate decision from command reachability. The cost is that
   * `… and break` reads `break` as an operand; `then` is the canonical
   * separator and is handled by `parseCommandSequence` directly.
   */
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

    // values of <target> — collects form values as FormData
    if (this.match('values')) {
      this.advance();
      if (this.match('of')) {
        this.advance();
        const target = this.parseExpression();
        return { type: 'valuesOf', target };
      }
      // Not followed by 'of', treat as identifier
      return { type: 'identifier', value: token.value };
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
