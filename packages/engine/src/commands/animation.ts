/**
 * `transition`, `settle`, `start a view transition`. Follows upstream
 * `parsetree/commands/animations.js`.
 */
import type { Cmd, Completion, Ctx, Expr } from '../ast';
import { expr, implicitMe } from '../expressions';
import type { Grammar } from '../parser';
import { config, dataOf, implicitLoop, nullCheck, runList, signalOf } from '../runtime';
import { commandList } from '../statements';
import { all, get, isEl, isIterable, then1 } from '../util';

/**
 * Resolve when the element's transition ends, or after `grace` ms if none
 * started. `begin` runs once the listeners are in place.
 */
const transitionDone = (elt: Element, grace: number, begin?: () => void) =>
  new Promise<void>(resolve => {
    let started = false;
    elt.addEventListener('transitionstart', () => (started = true), { once: true });
    elt.addEventListener('transitionend', () => resolve(), { once: true });
    setTimeout(() => started || resolve(), grace);
    begin?.();
  });

export interface SettleNode extends Cmd {
  type: 'settleCommand';
  target: Expr;
}

/** `settle [<target>]`: wait for a running CSS transition to finish. */
export function settle(g: Grammar): void {
  g.commands.settle = (p, _keyword, start) => {
    const target = p.commandBoundary(p.cur()) ? implicitMe(p) : expr(p);
    const targetText = p.text(target);
    const node: SettleNode = {
      type: 'settleCommand',
      target,
      start,
      end: p.endPos(),
      run: ctx =>
        then1(target.ev(ctx), value => {
          nullCheck(value, targetText);
          const elements = isEl(value)
            ? [value]
            : isIterable(value)
              ? Array.from(value).filter(isEl)
              : [];
          return Promise.all(elements.map(e => transitionDone(e, 500))).then(() => {});
        }),
    };
    return node;
  };
}

export interface TransitionNode extends Cmd {
  type: 'transitionCommand';
  properties: Expr[];
  from: (Expr | undefined)[];
  /** A value, or `'initial'` for what the property was before the first transition. */
  to: (Expr | 'initial')[];
  over?: Expr;
  using?: Expr;
}

/** `transition <property> [from <value>] to <value> … [over <time> | using <css transition>]`. */
export function transition(g: Grammar): void {
  g.commands.transition = (p, _keyword, start) => {
    const properties: Expr[] = [];
    const from: (Expr | undefined)[] = [];
    const to: (Expr | 'initial')[] = [];
    do {
      properties.push(p.withFollow(['from', 'to'], () => expr(p)));
      from.push(p.match('from') ? expr(p) : undefined);
      p.req('to');
      to.push(p.match('initial') ? 'initial' : expr(p));
    } while (!p.commandBoundary(p.cur()) && p.cur().value !== 'over' && p.cur().value !== 'using');
    const over = p.match('over') ? expr(p) : undefined;
    const using = !over && p.match('using') ? expr(p) : undefined;
    const owner = properties[0].root;
    const ownerText = owner ? p.text(owner) : '';

    /** Write each property that has a value, through the property expression's own `put`. */
    const write = (ctx: Ctx, values: unknown[]) =>
      properties.forEach((property, i) => {
        if (values[i] != null)
          then1(property.lhs?.(ctx), lhs => property.put?.(ctx, lhs, values[i]));
      });

    const node: TransitionNode = {
      type: 'transitionCommand',
      properties,
      from,
      to,
      over,
      using,
      start,
      end: p.endPos(),
      run: ctx =>
        all(
          [
            owner ? owner.ev(ctx) : ctx.me,
            over?.ev(ctx),
            using?.ev(ctx),
            all(
              from.map(f => f?.ev(ctx)),
              v => v
            ),
            all(
              to.map(t => (t === 'initial' ? undefined : t.ev(ctx))),
              v => v
            ),
          ],
          ([target, duration, css, starts, ends]) => {
            if (owner) nullCheck(target, ownerText);
            const waits: Promise<void>[] = [];
            implicitLoop(target, elt => {
              if (!(elt instanceof HTMLElement)) return;
              const before = elt.style.transition;
              elt.style.transition = duration
                ? `all ${duration}ms ease-in`
                : css
                  ? String(css)
                  : config.defaultTransition;
              const initials = (dataOf(elt).transitionInitials ??= {});
              properties.forEach((property, i) => {
                if (!(i in initials)) initials[i] = property.ev(ctx);
              });
              if (Array.isArray(starts)) write(ctx, starts);
              const targets = to.map((t, i) =>
                t === 'initial' ? initials[i] : get(ends, String(i))
              );
              waits.push(
                // The end values go in on the next tick, so the start values are painted first.
                transitionDone(elt, 100, () => setTimeout(() => write(ctx, targets), 0)).then(
                  () => {
                    elt.style.transition = before;
                  }
                )
              );
            });
            return Promise.all(waits).then(() => {});
          }
        ),
    };
    return node;
  };
}

export interface ViewTransitionNode extends Cmd {
  type: 'viewTransitionCommand';
  body: Cmd[];
  transitionType?: string;
}

/**
 * `start [a] view transition [using "<type>"] <commands> end`. The body runs as
 * the transition's update; leaving it early (`return`, `halt`, `break`) skips
 * the transition.
 */
export function viewTransition(g: Grammar): void {
  g.commands.start = (p, _keyword, start) => {
    p.match('a');
    p.req('view');
    p.req('transition');
    p.match('using');
    const transitionType = p.matchType('STRING')?.value;
    const body = commandList(p);
    if (p.hasMore()) p.req('end');
    let running = false;
    const node: ViewTransitionNode = {
      type: 'viewTransitionCommand',
      body,
      transitionType,
      start,
      end: p.endPos(),
      run: ctx => {
        if (!document.startViewTransition) return runList(body, ctx);
        if (running) throw new Error('A view transition is already in progress');
        running = true;
        let bodyDone = () => {};
        const update = () => new Promise<void>(resolve => (bodyDone = resolve));
        const started = transitionType
          ? document.startViewTransition({ update, types: [transitionType] })
          : document.startViewTransition(update);
        const finish = (signal: Completion): Completion | Promise<Completion> => {
          running = false;
          bodyDone();
          if (!signal) return started.finished.then(() => undefined);
          console.warn(
            'hyperscript: view transition skipped due to early exit (return, halt, or break)'
          );
          started.finished.catch(() => {});
          started.skipTransition();
          return signal;
        };
        // One tick, so the browser has captured the old state before the body changes it.
        return new Promise<void>(resolve => setTimeout(resolve, 0))
          .then(() => runList(body, ctx))
          .then(signal => finish(signalOf(signal)));
      },
    };
    return node;
  };
}
