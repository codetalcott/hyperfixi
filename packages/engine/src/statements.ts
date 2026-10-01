/**
 * Statement grammar: commands, command lists and the top-level program.
 *
 * There is exactly one command-list rule, and it throws on anything it cannot
 * place — a leftover token is a parse error, never a silently dropped word.
 * Follows upstream `core/kernel.js`.
 */
import type { Cmd, Expr, Feature, Handlers, Program } from './ast';
import { expr } from './expressions';
import type { Parser } from './parser';
import { then1 } from './util';

export interface UnlessNode extends Cmd {
  type: 'unlessStatementModifier';
  command: Cmd;
  condition: Expr;
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
  if (rule) cmd = p.match(t.value) && rule(p, t.value, start);
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
