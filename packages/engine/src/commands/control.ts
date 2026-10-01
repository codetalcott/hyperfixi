/**
 * `if`, `halt`, `return`, `exit`, `throw`. Follows upstream
 * `parsetree/commands/controlflow.js` and `basic.js`.
 */
import type { Cmd, Expr, Signal } from '../ast';
import { expr } from '../expressions';
import type { Grammar } from '../parser';
import { runList } from '../runtime';
import { command, commandList } from '../statements';
import { then1 } from '../util';

export interface IfNode extends Cmd {
  type: 'ifCommand';
  condition: Expr;
  trueBranch: Cmd[];
  falseBranch?: Cmd[];
}

/**
 * `if <condition> [then] <commands> [else|otherwise <commands>] [end]`.
 * The block runs to `end` (or `else`, or the end of the script) wherever the
 * lines break; `else if` on one line chains without needing its own `end`.
 */
export function ifCommand(g: Grammar): void {
  g.commands.if = (p, _keyword, start) => {
    const condition = expr(p);
    p.match('then');
    const trueBranch = commandList(p);
    let falseBranch: Cmd[] | undefined;
    let chained = false;
    const otherwise = p.match('else') ?? p.match('otherwise');
    if (otherwise) {
      chained = p.peek('if')?.line === otherwise.line;
      if (chained) {
        const nested = command(p);
        falseBranch = nested ? [nested] : [];
      } else falseBranch = commandList(p);
    }
    if (p.hasMore() && !chained) p.req('end');
    const node: IfNode = {
      type: 'ifCommand',
      condition,
      trueBranch,
      falseBranch,
      start,
      end: p.endPos(),
      run: ctx =>
        then1(condition.ev(ctx), yes =>
          yes ? runList(trueBranch, ctx) : falseBranch && runList(falseBranch, ctx)
        ),
    };
    return node;
  };
}

/** `exit`, and `halt` without `the event`: leave the handler; a function returns null. */
const EXIT: Signal = { k: 'return', value: null };

export interface HaltNode extends Cmd {
  type: 'haltCommand';
  /** `halt the event`: stop the event but keep running the handler. */
  keepExecuting: boolean;
  bubbling: boolean;
  haltDefault: boolean;
}

export function halt(g: Grammar): void {
  g.commands.halt = (p, _keyword, start) => {
    let keepExecuting = false;
    if (p.match('the')) {
      p.req('event');
      if (p.matchOp("'")) p.req('s');
      keepExecuting = true;
    }
    const bubbling = !!p.match('bubbling');
    const haltDefault = !bubbling && !!p.match('default');
    const node: HaltNode = {
      type: 'haltCommand',
      keepExecuting,
      bubbling,
      haltDefault,
      start,
      end: p.endPos(),
      run: ctx => {
        const event = ctx.event;
        if (event instanceof Event) {
          if (!haltDefault) event.stopPropagation();
          if (!bubbling) event.preventDefault();
        }
        if (!keepExecuting) return EXIT;
      },
    };
    return node;
  };
}

export interface ReturnNode extends Cmd {
  type: 'returnCommand' | 'exitCommand';
  value?: Expr;
}

export function returnCommand(g: Grammar): void {
  g.commands.return = (p, _keyword, start) => {
    const value = p.commandBoundary(p.cur()) ? undefined : expr(p);
    const node: ReturnNode = {
      type: 'returnCommand',
      value,
      start,
      end: p.endPos(),
      run: ctx =>
        then1(value ? value.ev(ctx) : null, v => {
          ctx.meta.returned = true;
          ctx.meta.returnValue = v;
          const signal: Signal = { k: 'return', value: v };
          return signal;
        }),
    };
    return node;
  };
  g.commands.exit = (p, _keyword, start) => {
    const node: ReturnNode = { type: 'exitCommand', start, end: p.endPos(), run: () => EXIT };
    return node;
  };
}

export interface ThrowNode extends Cmd {
  type: 'throwCommand';
  value: Expr;
}

export function throwCommand(g: Grammar): void {
  g.commands.throw = (p, _keyword, start) => {
    const value = expr(p);
    const node: ThrowNode = {
      type: 'throwCommand',
      value,
      start,
      end: p.endPos(),
      run: ctx =>
        then1(value.ev(ctx), v => {
          throw v;
        }),
    };
    return node;
  };
}
