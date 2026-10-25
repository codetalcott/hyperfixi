/**
 * Statement grammar: commands, command lists and the top-level program.
 *
 * There is exactly one command-list rule, and it throws on anything it cannot
 * place — a leftover token is a parse error, never a silently dropped word.
 * Follows upstream `core/kernel.js`.
 */
import type { Cmd, Expr, Feature, Handlers, Program } from './ast';
import { expr } from './expressions';
import { ParseError, type CommandRule, type Parser } from './parser';
import { then1 } from './util';

export interface UnlessNode extends Cmd {
  type: 'unlessStatementModifier';
  command: Cmd;
  condition: Expr;
}

/**
 * A command's own rule and, when it fails to parse, the fallbacks registered for its keyword.
 * A fallback's reading counts only if it reads at least as far as the rule did before failing:
 * one that stops short (`toggle .a` of `toggle .a for`) is not a better reading of the rule's
 * own form. The error reported is the one that got furthest, and the rule's when they tie.
 */
function withFallbacks(p: Parser, rule: CommandRule, keyword: string, start: number) {
  const fallbacks = p.g.fallbacks[keyword];
  if (!fallbacks) return rule(p, keyword, start);
  const mark = p.mark();
  try {
    return rule(p, keyword, start);
  } catch (e) {
    if (!(e instanceof ParseError)) throw e;
    let error = e;
    for (const fallback of fallbacks) {
      p.reset(mark);
      try {
        const cmd = fallback(p, keyword, start);
        if (cmd && p.pos() >= e.token.start) return cmd;
      } catch (f) {
        if (!(f instanceof ParseError)) throw f;
        if (f.token.start > error.token.start) error = f;
      }
    }
    throw error;
  }
}

export function command(p: Parser): Cmd | undefined {
  const start = p.pos();
  if (p.matchOp('(')) {
    const grouped = command(p) ?? p.err('Expected command');
    p.reqOp(')');
    return grouped;
  }
  const t = p.cur();
  const rule = p.g.commands[t.value];
  let cmd: Cmd | undefined;
  if (rule) cmd = p.match(t.value) && withFallbacks(p, rule, t.value, start);
  else if (t.type === 'IDENTIFIER') cmd = p.g.pseudo?.(p, start);
  if (!cmd || !p.match('unless')) return cmd;

  // `<command> unless <condition>`
  const inner = cmd;
  const condition = expr(p);
  const unless: UnlessNode = {
    type: 'unlessStatementModifier',
    command: inner,
    condition,
    start,
    end: p.endPos(),
    run: ctx => then1(condition.ev(ctx), skip => (skip ? undefined : inner.run(ctx))),
  };
  return unless;
}

/** Commands, optionally separated by `then`, up to the first token that starts none. */
export function commandList(p: Parser): Cmd[] {
  const list: Cmd[] = [];
  while (p.hasMore()) {
    const cmd = command(p);
    if (!cmd) break;
    list.push(cmd);
    p.match('then');
  }
  return list;
}

export function feature(p: Parser): Feature {
  const start = p.pos();
  if (p.matchOp('(')) {
    const grouped = feature(p);
    p.reqOp(')');
    return grouped;
  }
  const t = p.cur();
  const rule = p.g.features[t.value];
  if (!rule || !p.match(t.value)) return p.err('Expected feature');
  return rule(p, start);
}

/** The script of one element: features, each optionally closed by `end`. */
export function program(p: Parser): Program {
  const start = p.pos();
  const features: Feature[] = [];
  while (p.hasMore()) {
    const t = p.cur();
    if (p.featureStart(t) || t.value === '(') {
      features.push(feature(p));
      p.match('end');
    } else if (t.value === 'end') break;
    else p.err();
  }
  return { type: 'hyperscript', features, start, end: p.endPos() };
}

/** `catch <name> <commands>` and `finally <commands>` after a handler body. */
export function errorAndFinally(p: Parser): Handlers {
  const handlers: Handlers = {};
  if (p.match('catch')) {
    handlers.errorSymbol = p.reqType('IDENTIFIER').value;
    handlers.errorHandler = commandList(p);
  }
  if (p.match('finally')) handlers.finallyHandler = commandList(p);
  return handlers;
}

/** `(a, b)` after an event name: fields to copy from the event into locals. */
export function eventArgs(p: Parser): string[] {
  const args: string[] = [];
  const second = p.tok(1).value;
  const third = p.tok(2).value;
  if (p.cur().value === '(' && (second === ')' || third === ',' || third === ')')) {
    p.matchOp('(');
    do args.push(p.reqType('IDENTIFIER').value);
    while (p.matchOp(','));
    p.reqOp(')');
  }
  return args;
}
