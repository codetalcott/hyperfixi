/**
 * `repeat` / `for`, `break`, `continue`, `tell`. Follows upstream
 * `parsetree/commands/controlflow.js`.
 */
import type { Cmd, Completion, Ctx, Expr, Signal } from '../ast';
import { eventName, expr } from '../expressions';
import type { Grammar } from '../parser';
import { runList, signalOf } from '../runtime';
import { commandList } from '../statements';
import { all, get, isIterable, isP, isTarget, num, obj, then1, type MaybeP } from '../util';

export interface RepeatNode extends Cmd {
  type: 'repeatCommand';
  /** `for x in <expression>`; `repeat in <expression>` binds `it`. */
  identifier?: string;
  indexIdentifier?: string;
  expression?: Expr;
  times?: Expr;
  /** `while <cond>` or `until <cond>`; `bottomTested` when it follows the body. */
  condition?: Expr;
  until: boolean;
  bottomTested: boolean;
  forever: boolean;
  /** `until event <name> [from <source>]`. */
  event?: string;
  from?: Expr;
  body: Cmd[];
  elseBranch?: Cmd[];
}

/** Run `iteration` until it returns a result; stays synchronous while iterations do. */
function loop<T extends object>(iteration: () => MaybeP<T | undefined>): MaybeP<T> {
  for (;;) {
    const result = iteration();
    if (isP(result)) return result.then(value => value ?? loop(iteration));
    if (result) return result;
  }
}

const iteratorOf = (value: unknown): Iterator<unknown> | AsyncIterator<unknown> | undefined => {
  if (!value) return;
  if (obj(value) && Symbol.asyncIterator in Object(value)) {
    const make = Reflect.get(Object(value), Symbol.asyncIterator);
    return typeof make === 'function' ? Reflect.apply(make, value, []) : undefined;
  }
  return (isIterable(value) ? value : Object.keys(Object(value)))[Symbol.iterator]();
};

export function repeat(g: Grammar): void {
  g.commands.repeat = g.commands.for = (p, keyword, start) => {
    const node: RepeatNode = {
      type: 'repeatCommand',
      until: false,
      bottomTested: false,
      forever: false,
      body: [],
      start,
      end: start,
      run: () => {},
    };
    if (keyword === 'for' || p.match('for')) {
      const identifier = (node.identifier = p.reqType('IDENTIFIER').value);
      p.req('in');
      node.expression = expr(p);
      // A `where` clause in the collection sees each item under the loop variable's name.
      for (let walk: Expr | undefined = node.expression; walk; walk = walk.root) {
        if (walk.type === 'collectionExpression') walk.varName = identifier;
      }
    } else if (p.match('in')) {
      node.identifier = 'it';
      node.expression = expr(p);
    } else if (p.match('while')) {
      node.condition = expr(p);
    } else if (p.match('until')) {
      node.until = true;
      if (p.match('event')) {
        node.event = eventName(p);
        if (p.match('from')) node.from = expr(p);
      } else node.condition = expr(p);
    } else if (!p.commandBoundary(p.cur()) && p.cur().value !== 'forever') {
      node.times = expr(p);
      p.req('times');
    } else {
      p.match('forever');
      node.forever = true;
    }

    if (p.match('index')) node.indexIdentifier = p.reqType('IDENTIFIER').value;
    else if (p.match('indexed')) {
      p.req('by');
      node.indexIdentifier = p.reqType('IDENTIFIER').value;
    }

    const body = (node.body = commandList(p));
    if (node.forever && p.hasMore()) {
      const word = p.match('until') ?? p.match('while');
      if (word) {
        node.forever = false;
        node.bottomTested = true;
        node.until = word.value === 'until';
        node.condition = expr(p);
      }
    }
    if (p.match('else')) node.elseBranch = commandList(p);
    if (p.hasMore()) p.req('end');
    node.end = p.endPos();

    const {
      identifier,
      indexIdentifier,
      expression,
      times,
      condition,
      until,
      bottomTested,
      forever,
      event,
      from,
      elseBranch,
    } = node;
    type Done = { signal: Completion };

    node.run = ctx =>
      all([expression?.ev(ctx), from?.ev(ctx)], ([collection, source]) => {
        const iterator = iteratorOf(collection) ?? (elseBranch ? [][Symbol.iterator]() : undefined);
        let index = 0;
        let iterated = false;
        let fired = false;
        if (event) {
          const target = source || ctx.me;
          if (isTarget(target))
            target.addEventListener(event, () => (fired = true), { once: true });
        }

        const finish = (): MaybeP<Done> =>
          !iterated && elseBranch
            ? then1(runList(elseBranch, ctx), signal => ({ signal: signalOf(signal) }))
            : { signal: undefined };

        const body_ = (value: unknown): MaybeP<Done | undefined> => {
          const current = index++;
          iterated = true;
          if (collection && identifier) ctx.result = ctx.locals[identifier] = value;
          else ctx.result = current;
          if (indexIdentifier) ctx.locals[indexIdentifier] = current;
          // In a template, mark where this iteration's output starts (see `templates.ts`).
          const template = ctx.meta.template;
          if (template && collection) {
            const slot = `${identifier}_${start}`;
            template.loops[slot] ??= { identifier, indexIdentifier, source: collection };
            template.out.push(`<!--hs-scope:${slot}:${current}-->`);
          }
          return then1(runList(body, ctx), signal => {
            const kind = get(signal, 'k');
            if (kind === 'break') return { signal: undefined };
            if (kind === 'return') return { signal: signalOf(signal) };
            // A loop waiting on an event yields between passes so the event can arrive.
            if (event) return new Promise<undefined>(resolve => setTimeout(resolve, 0));
          });
        };

        const iteration = (): MaybeP<Done | undefined> =>
          all([condition?.ev(ctx), times?.ev(ctx)], ([test, count]) => {
            if (bottomTested && index === 0) return body_(undefined);
            if (forever) return body_(undefined);
            if (until) return (event ? !fired : test !== true) ? body_(undefined) : finish();
            if (condition) return test ? body_(undefined) : finish();
            if (count) return index < num(count) ? body_(undefined) : finish();
            if (!iterator) return finish();
            return then1(iterator.next(), step =>
              get(step, 'done') ? finish() : body_(get(step, 'value'))
            );
          });

        return then1(loop(iteration), done => signalOf(get(done, 'signal')));
      });
    return node;
  };
}

/** `break` and `continue`: signals the enclosing loop acts on. */
export function loopControl(g: Grammar): void {
  for (const k of ['break', 'continue'] as const) {
    const signal: Signal = { k };
    g.commands[k] = (p, _keyword, start) => ({
      type: `${k}Command`,
      start,
      end: p.endPos(),
      run: () => signal,
    });
  }
}

export interface TellNode extends Cmd {
  type: 'tellCommand';
  value: Expr;
  body: Cmd[];
}

/** `tell <targets> <commands> [end]`: run the body once per target, with `you` bound to it. */
export function tell(g: Grammar): void {
  g.commands.tell = (p, _keyword, start) => {
    const value = expr(p);
    const body = commandList(p);
    if (p.hasMore() && !p.featureStart(p.cur())) p.req('end');
    const each = (ctx: Ctx, targets: unknown[], i: number): MaybeP<Completion> => {
      for (; i < targets.length; i++) {
        ctx.you = targets[i];
        const result = runList(body, ctx);
        if (isP(result))
          return result.then(signal => signalOf(signal) ?? each(ctx, targets, i + 1));
        if (result) return result;
      }
    };
    const node: TellNode = {
      type: 'tellCommand',
      value,
      body,
      start,
      end: p.endPos(),
      run: ctx =>
        then1(value.ev(ctx), v => {
          const targets =
            v == null ? [] : Array.isArray(v) ? v : v instanceof NodeList ? Array.from(v) : [v];
          const you = ctx.you;
          return then1(each(ctx, targets, 0), signal => {
            ctx.you = you;
            return signalOf(signal);
          });
        }),
    };
    return node;
  };
}
