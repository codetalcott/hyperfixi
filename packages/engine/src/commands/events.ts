/**
 * `send` / `trigger` and `wait`. Follows upstream `parsetree/commands/events.js`.
 */
import type { Cmd, Expr, NamedArgsNode } from '../ast';
import { eventName, expr, implicitMe, namedArgumentList } from '../expressions';
import type { Grammar } from '../parser';
import { implicitLoop, nullCheck, triggerEvent } from '../runtime';
import { eventArgs } from '../statements';
import { all, get, isTarget, num, obj, then1 } from '../util';

export interface SendNode extends Cmd {
  type: 'sendCommand';
  event: string;
  details?: NamedArgsNode;
  to: Expr;
}

/** `send <event>[(details)] [to <target>]`; `trigger` is the same with `on`. */
export function send(g: Grammar): void {
  g.commands.send = g.commands.trigger = (p, keyword, start) => {
    const event = eventName(p);
    const details = namedArgumentList(p);
    const to = p.match(keyword === 'trigger' ? 'on' : 'to') ? expr(p) : implicitMe(p);
    const toText = p.text(to);
    const node: SendNode = {
      type: 'sendCommand',
      event,
      details,
      to,
      start,
      end: p.endPos(),
      run: ctx =>
        all([to.ev(ctx), details?.ev(ctx)], ([targets, detail]) => {
          nullCheck(targets, toText);
          implicitLoop(targets, target =>
            triggerEvent(target, event, obj(detail) ? detail : {}, ctx.me)
          );
        }),
    };
    return node;
  };
}

export interface WaitNode extends Cmd {
  type: 'waitCommand';
  /** `wait <duration>`. */
  time?: Expr;
  /** `wait for <event>[(args)] or <duration> … [from <source>]`. */
  events?: ({ event: string; args: string[] } | Expr)[];
  from?: Expr;
}

export function wait(g: Grammar): void {
  g.commands.wait = (p, _keyword, start) => {
    const node: WaitNode = { type: 'waitCommand', start, end: start, run: () => {} };
    if (p.match('for')) {
      p.match('a');
      const events: NonNullable<WaitNode['events']> = (node.events = []);
      do {
        const t = p.cur();
        // A number or a parenthesis here is a timeout racing the events.
        if (t.type === 'NUMBER' || (t.op && t.value === '(')) events.push(expr(p));
        else events.push({ event: eventName(p), args: eventArgs(p) });
      } while (p.match('or'));
      const from = (node.from = p.match('from') ? expr(p) : undefined);
      const fromText = from ? p.text(from) : 'me';
      node.run = ctx =>
        then1(from ? from.ev(ctx) : ctx.me, source => {
          if (!isTarget(source)) throw new Error('Not a valid event target: ' + fromText);
          return new Promise<void>(resolve => {
            for (const spec of events) {
              if ('event' in spec) {
                source.addEventListener(
                  spec.event,
                  event => {
                    ctx.result = event;
                    for (const arg of spec.args) {
                      ctx.locals[arg] = get(event, arg) || get(get(event, 'detail'), arg) || null;
                    }
                    resolve();
                  },
                  { once: true }
                );
              } else {
                then1(spec.ev(ctx), ms =>
                  setTimeout(() => {
                    ctx.result = ms;
                    resolve();
                  }, num(ms))
                );
              }
            }
          });
        });
    } else {
      let time: Expr | undefined;
      if (p.match('a')) p.req('tick');
      else time = node.time = expr(p);
      node.run = ctx =>
        then1(
          time?.ev(ctx),
          ms => new Promise<void>(resolve => setTimeout(resolve, time ? num(ms) : 0))
        );
    }
    node.end = p.endPos();
    return node;
  };
}
