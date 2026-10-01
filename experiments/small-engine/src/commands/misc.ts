/**
 * `log`, `call` / `get`, and the pseudo-command (`foo()` or `me.focus()` used as
 * a statement). Follows upstream `basic.js`, `execution.js`, `pseudoCommand.js`.
 */
import type { Cmd, Expr } from '../ast';
import { call as callFunction, expr, implicitMe, primary } from '../expressions';
import type { Grammar } from '../parser';
import { nullCheck } from '../runtime';
import { all, fn, get, then1 } from '../util';

export interface LogNode extends Cmd {
  type: 'logCommand';
  values: Expr[];
  /** `log x with console.warn`. */
  logger?: Expr;
}

export function log(g: Grammar): void {
  g.commands.log = (p, _keyword, start) => {
    const values = [expr(p)];
    while (p.matchOp(',')) values.push(expr(p));
    const logger = p.match('with') ? expr(p) : undefined;
    const node: LogNode = {
      type: 'logCommand',
      values,
      logger,
      start,
      end: p.endPos(),
      run: ctx =>
        all([logger?.ev(ctx), ...values.map(v => v.ev(ctx))], ([out, ...vals]) => {
          if (fn(out)) out(...vals);
          else console.log(...vals);
        }),
    };
    return node;
  };
}

export interface GetNode extends Cmd {
  type: 'getCommand';
  value: Expr;
}

/** `get <expr>` / `call <function call>`: evaluate and keep the value as `it`. */
export function get_(g: Grammar): void {
  g.commands.get = g.commands.call = (p, keyword, start) => {
    const value = expr(p);
    if (keyword === 'call' && value.type !== 'functionCall') p.err('Must be a function invocation');
    const node: GetNode = {
      type: 'getCommand',
      value,
      start,
      end: p.endPos(),
      run: ctx =>
        then1(value.ev(ctx), v => {
          ctx.result = v;
        }),
    };
    return node;
  };
}

export interface PseudoNode extends Cmd {
  type: 'pseudoCommand';
  value: Expr;
  /** `reload() the location`: the call's receiver, written after it. */
  target?: Expr;
}

export function pseudoCommand(g: Grammar): void {
  g.pseudo = (p, start) => {
    const next = p.tok(1);
    if (!(next.op && (next.value === '.' || next.value === '('))) return;
    const value = primary(p);
    if (value.type !== 'functionCall') p.err('Pseudo-commands must be function calls');
    // Only a bare call, `name(args)`, can take a receiver after it.
    const callee = value.root;
    const args = 'args' in value && Array.isArray(value.args) ? value.args : [];
    let target: Expr | undefined;
    if (callee && !callee.root) {
      if (p.matchAny('the', 'to', 'on', 'with', 'into', 'from', 'at')) target = expr(p);
      else if (p.match('me')) target = implicitMe(p);
    }
    const method = callee?.name ?? '';
    const targetText = target ? p.text(target) : '';
    const valueText = p.text(value);
    const receiver = target;
    const node: PseudoNode = {
      type: 'pseudoCommand',
      value,
      target,
      start,
      end: p.endPos(),
      run: ctx => {
        if (!receiver) {
          return then1(value.ev(ctx), v => {
            ctx.result = v;
          });
        }
        return all([receiver.ev(ctx), ...args.map((a: Expr) => a.ev(ctx))], ([owner, ...vals]) => {
          nullCheck(owner, targetText);
          ctx.result = callFunction(get(owner, method), owner, vals, ctx, valueText);
        });
      },
    };
    return node;
  };
}

export interface AskNode extends Cmd {
  type: 'askCommand' | 'answerCommand';
  message: Expr;
  /** `answer … with <a> or <b>`: the two choices of a confirmation. */
  choices?: [Expr, Expr];
}

/** `ask <message>` prompts; `answer <message> [with <a> or <b>]` alerts or confirms. */
export function askAnswer(g: Grammar): void {
  g.commands.ask = (p, _keyword, start) => {
    const message = expr(p);
    const node: AskNode = {
      type: 'askCommand',
      message,
      start,
      end: p.endPos(),
      run: ctx =>
        then1(message.ev(ctx), text => {
          ctx.result = prompt(String(text));
        }),
    };
    return node;
  };
  g.commands.answer = (p, _keyword, start) => {
    const message = expr(p);
    let choices: [Expr, Expr] | undefined;
    if (p.match('with')) {
      const first = p.withFollow(['or'], () => expr(p));
      p.req('or');
      choices = [first, expr(p)];
    }
    const node: AskNode = {
      type: 'answerCommand',
      message,
      choices,
      start,
      end: p.endPos(),
      run: ctx =>
        all([message.ev(ctx), choices?.[0].ev(ctx), choices?.[1].ev(ctx)], ([text, yes, no]) => {
          if (choices) ctx.result = confirm(String(text)) ? yes : no;
          else alert(String(text));
        }),
    };
    return node;
  };
}

/** `breakpoint`: stop in the debugger. */
export function breakpoint(g: Grammar): void {
  g.commands.breakpoint = (p, _keyword, start) => ({
    type: 'breakpointCommand',
    start,
    end: p.endPos(),
    run: () => {
      // eslint-disable-next-line no-debugger
      debugger;
    },
  });
}
