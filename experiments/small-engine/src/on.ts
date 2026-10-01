/**
 * The `on` feature: event handlers.
 *
 *   on [every|first] <event>[(args)] [[filter]] [<count> [to <count> | and on]]
 *      [from <target> | elsewhere] [in <selector>] [debounced|throttled at <time>]
 *      [or <event> …] [queue all|first|last|none]
 *      <commands> [catch <name> <commands>] [finally <commands>] [end]
 *
 * Follows upstream `parsetree/features/on.js`. The handler body runs
 * synchronously until a command returns a promise, so `halt the event` takes
 * effect before `dispatchEvent` returns.
 */
import type { Cmd, Ctx, Expr, Feature } from './ast';
import { evalStatic, eventName, expr, unary } from './expressions';
import type { Grammar, Parser } from './parser';
import { dataOf, implicitLoop, makeContext, runList, triggerEvent, type EventQueue } from './runtime';
import { commandList, errorAndFinally, eventArgs, type Handlers } from './statements';
import { get, isP, type MaybeP } from './util';

export interface EventSpec {
  on: string;
  args: string[];
  filter?: Expr;
  from?: Expr;
  inExpr?: Expr;
  elsewhere: boolean;
  startCount?: number;
  endCount?: number;
  unbounded: boolean;
  debounceTime?: number;
  throttleTime?: number;
  mutationSpec?: MutationObserverInit;
  intersectionSpec?: IntersectionObserverInit;
  resizeSpec: boolean;
}

export interface OnFeature extends Feature, Handlers {
  type: 'onFeature';
  displayName: string;
  events: EventSpec[];
  body: Cmd[];
  every: boolean;
  queue: 'all' | 'first' | 'last' | 'none';
}

interface EventState {
  execCount: number;
  debounced?: ReturnType<typeof setTimeout>;
  lastExec?: number;
}

/** Run `f`; call `ok` when it finishes and `fail` if it throws or rejects. */
function settle(f: () => MaybeP<unknown>, ok: () => void, fail: (e: unknown) => void): void {
  let result: MaybeP<unknown>;
  try {
    result = f();
  } catch (e) {
    return fail(e);
  }
  if (isP(result)) result.then(ok, fail);
  else ok();
}

/**
 * Body, then `catch` on an error, then `finally` in every case. An error with
 * no `catch`, or one thrown inside the `catch` block, is reported to `done`.
 */
function runHandler(ctx: Ctx, feature: OnFeature, done: (failure?: { error: unknown }) => void): void {
  let failure: { error: unknown } | undefined;
  const finish = () => done(failure);
  const runFinally = () => {
    const block = feature.finallyHandler;
    if (!block) return finish();
    settle(
      () => runList(block, ctx),
      finish,
      e => {
        console.error(' Exception in finally block: ', e);
        finish();
      }
    );
  };
  const fail = (error: unknown) => {
    failure = { error };
    runFinally();
  };
  settle(
    () => runList(feature.body, ctx),
    runFinally,
    error => {
      const block = feature.errorHandler;
      if (!block || !feature.errorSymbol) return fail(error);
      ctx.locals[feature.errorSymbol] = error;
      settle(() => runList(block, ctx), runFinally, fail);
    }
  );
}

function queueFor(elt: unknown, feature: OnFeature): EventQueue {
  if (typeof elt !== 'object' || elt === null) return { queue: [], executing: false };
  const queues = (dataOf(elt).eventQueues ??= new Map<object, EventQueue>());
  let queue = queues.get(feature);
  if (!queue) queues.set(feature, (queue = { queue: [], executing: false }));
  return queue;
}

/** Start the handler, or queue the event if this handler is still running. */
function execute(ctx: Ctx, feature: OnFeature): void {
  const info = queueFor(ctx.me, feature);
  if (info.executing && !feature.every) {
    if (feature.queue === 'none' || (feature.queue === 'first' && info.queue.length > 0)) return;
    if (feature.queue !== 'all') info.queue.length = 0;
    info.queue.push(ctx);
    return;
  }
  info.executing = true;
  runHandler(ctx, feature, failure => {
    info.executing = false;
    const queued = info.queue.shift();
    if (queued) setTimeout(() => execute(queued, feature), 1);
    if (failure) {
      const { error } = failure;
      console.error(get(error, 'message') ?? error);
      console.error(get(error, 'stack'));
      triggerEvent(ctx.me, 'exception', { error });
    }
  });
}

function install(feature: OnFeature, elt: unknown): void {
  if (!(elt instanceof EventTarget)) return;
  const data = dataOf(elt);
  const listeners = (data.listeners ??= []);
  const observers = (data.observers ??= []);
  const timers = (data.timers ??= new Set());

  for (const spec of feature.events) {
    const state: EventState = { execCount: 0 };
    const targets = spec.elsewhere
      ? [document]
      : spec.from
        ? spec.from.ev(makeContext(elt, feature, elt, null))
        : [elt];

    implicitLoop(targets, target => {
      if (!(target instanceof EventTarget)) {
        console.warn("'%s' feature ignored because target does not exists:", feature.displayName, elt);
        return;
      }
      let name = spec.on;
      if (spec.mutationSpec && target instanceof Node) {
        name = 'hyperscript:mutation';
        const observer = new MutationObserver(mutationList =>
          triggerEvent(target, name, { mutationList, observer })
        );
        observer.observe(target, spec.mutationSpec);
        observers.push(observer);
      }
      if (spec.intersectionSpec && target instanceof Element) {
        name = 'hyperscript:intersection';
        const observer = new IntersectionObserver(entries => {
          for (const entry of entries) {
            triggerEvent(target, name, { observer, entry, intersecting: entry.isIntersecting, isIntersecting: entry.isIntersecting, intersectionRatio: entry.intersectionRatio });
          }
        }, spec.intersectionSpec);
        observer.observe(target);
        observers.push(observer);
      }
      // ResizeObserver only watches elements; `on resize from window` is the native event.
      if (spec.resizeSpec && target instanceof Element) {
        name = 'hyperscript:resize';
        const observer = new ResizeObserver(entries => {
          for (const entry of entries) {
            const { width, height } = entry.contentRect;
            triggerEvent(target, name, { width, height, contentRect: entry.contentRect, entry });
          }
        });
        observer.observe(target);
        observers.push(observer);
      }

      const handler = (event: Event) => {
        // A listener on another element is dropped once its owner leaves the document.
        if (elt instanceof Node && target !== elt && !elt.isConnected) {
          target.removeEventListener(name, handler);
          return;
        }
        const ctx = makeContext(elt, feature, elt, event);
        if (spec.elsewhere && elt instanceof Node && event.target instanceof Node && elt.contains(event.target)) return;
        if (spec.from) ctx.result = target;

        for (const arg of spec.args) {
          const fromEvent = get(event, arg);
          if (fromEvent !== undefined) ctx.locals[arg] = fromEvent;
          else if (ctx.detail != null) ctx.locals[arg] = get(ctx.detail, arg);
        }

        if (spec.filter) {
          ctx.meta.context = event;
          try {
            if (!spec.filter.ev(ctx)) return;
          } finally {
            ctx.meta.context = undefined;
          }
        }

        if (spec.inExpr?.css) {
          let match = event.target instanceof Element ? event.target : null;
          while (match && !match.matches(spec.inExpr.css)) match = match.parentElement;
          if (!match) return;
          ctx.result = match;
        }

        state.execCount++;
        if (spec.startCount) {
          const count = state.execCount;
          if (spec.endCount ? count < spec.startCount || count > spec.endCount
            : spec.unbounded ? count < spec.startCount
            : count !== spec.startCount) return;
        }

        if (spec.debounceTime) {
          if (state.debounced) {
            clearTimeout(state.debounced);
            timers.delete(state.debounced);
          }
          timers.add((state.debounced = setTimeout(() => execute(ctx, feature), spec.debounceTime)));
          return;
        }

        if (spec.throttleTime) {
          if (state.lastExec && Date.now() < state.lastExec + spec.throttleTime) return;
          state.lastExec = Date.now();
        }

        execute(ctx, feature);
      };
      target.addEventListener(name, handler);
      listeners.push({ target, event: name, handler });
    });
  }
}

/** A quoted string, or bare text up to the next whitespace. */
function stringLike(p: Parser): string {
  const quoted = p.matchType('STRING');
  if (quoted) return quoted.value;
  return p
    .consumeUntil(undefined, 'WHITESPACE')
    .map(t => t.value)
    .join('');
}

function mutationSpec(p: Parser): MutationObserverInit {
  if (!p.match('of')) {
    return { attributes: true, characterData: true, childList: true, attributeOldValue: true, characterDataOldValue: true };
  }
  const spec: MutationObserverInit = {};
  do {
    if (p.match('anything')) Object.assign(spec, { attributes: true, subtree: true, characterData: true, childList: true });
    else if (p.match('childList')) spec.childList = true;
    else if (p.match('attributes')) spec.attributes = true;
    else if (p.match('subtree')) spec.subtree = true;
    else if (p.match('characterData')) spec.characterData = true;
    else if (p.cur().type === 'ATTRIBUTE_REF') {
      const attribute = p.consume().value;
      if (!attribute.startsWith('@')) p.err('Only shorthand attribute references are allowed here');
      (spec.attributeFilter ??= []).push(attribute.substring(1));
    } else p.err('Unknown mutation config specification');
  } while (p.match('or'));
  if (spec.attributes || spec.attributeFilter) spec.attributeOldValue = true;
  if (spec.characterData) spec.characterDataOldValue = true;
  return spec;
}

function intersectionSpec(p: Parser): IntersectionObserverInit {
  const spec: IntersectionObserverInit = {};
  if (p.match('with')) {
    const root = evalStatic(expr(p));
    if (root instanceof Element) spec.root = root;
  }
  if (p.match('having')) {
    do {
      if (p.match('margin')) spec.rootMargin = stringLike(p);
      else if (p.match('threshold')) spec.threshold = Number(evalStatic(expr(p)));
      else p.err('Unknown intersection config specification');
    } while (p.match('and'));
  }
  return spec;
}

function eventSpec(p: Parser, first: boolean): EventSpec {
  const on = eventName(p);
  const args = eventArgs(p);
  let filter: Expr | undefined;
  if (p.matchOp('[')) {
    filter = expr(p);
    p.reqOp(']');
  }

  let startCount: number | undefined;
  let endCount: number | undefined;
  let unbounded = false;
  if (first) startCount = 1;
  else if (p.cur().type === 'NUMBER') {
    startCount = parseInt(p.consume().value);
    if (p.match('to')) endCount = parseInt(p.consume().value);
    else if (p.match('and')) {
      unbounded = true;
      p.req('on');
    }
  }

  const spec: EventSpec = { on, args, filter, startCount, endCount, unbounded, elsewhere: false, resizeSpec: on === 'resize' };
  if (on === 'intersection') spec.intersectionSpec = intersectionSpec(p);
  else if (on === 'mutation') spec.mutationSpec = mutationSpec(p);

  if (p.match('from')) {
    if (p.match('elsewhere')) spec.elsewhere = true;
    else spec.from = p.withFollow(['or'], () => expr(p));
  }
  if (!spec.from && !spec.elsewhere && p.match('elsewhere')) spec.elsewhere = true;
  if (p.match('in')) spec.inExpr = unary(p);

  const time = () => {
    p.req('at');
    return Number(evalStatic(unary(p)));
  };
  if (p.match('debounced')) spec.debounceTime = time();
  else if (p.match('throttled')) spec.throttleTime = time();
  return spec;
}

export function on(g: Grammar): void {
  g.features.on = (p, start) => {
    const every = !!p.match('every');
    const first = !every && !!p.match('first');
    const events: EventSpec[] = [];
    do events.push(eventSpec(p, first));
    while (p.match('or'));

    let queue: OnFeature['queue'] = 'last';
    if (!every && p.match('queue')) {
      if (p.match('all')) queue = 'all';
      else if (p.match('first')) queue = 'first';
      else if (p.match('none')) queue = 'none';
      else p.req('last');
    }

    const body = commandList(p);
    const feature: OnFeature = {
      type: 'onFeature',
      displayName: 'on ' + events.map(e => e.on).join(' or '),
      events,
      body,
      every,
      queue,
      ...errorAndFinally(p),
      start,
      end: p.endPos(),
      install: target => install(feature, target),
    };
    return feature;
  };
}
