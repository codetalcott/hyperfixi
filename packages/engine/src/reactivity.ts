/**
 * Reactivity: effects that re-run when what they read changes, and the three
 * features built on them — `when … changes`, `live`, `bind`.
 *
 * While an effect evaluates, the runtime reports every variable, property,
 * attribute and DOM query it reads (through `rx` in `runtime.ts`); those become
 * the effect's dependencies. Writes schedule the dependent effects for the next
 * microtask.
 * Follows upstream `core/runtime/reactivity.js` and `parsetree/features/{when,live,bind}.js`.
 */
import type { Cmd, Ctx, Expr, Feature } from './ast';
import { expr } from './expressions';
import type { Grammar } from './parser';
import {
  dataOf,
  guard,
  makeContext,
  resolveAttribute,
  resolveProperty,
  runList,
  rx,
  triggerEvent,
} from './runtime';
import { commandList } from './statements';
import { get, isEl, then1 } from './util';

// ---------------------------------------------------------------------------
// Effects
// ---------------------------------------------------------------------------

type Dependency =
  | { type: 'global'; name: string }
  | { type: 'element'; name: string; element: object }
  | { type: 'attribute'; name: string; element: Element }
  | { type: 'property'; object: object }
  | { type: 'query'; root: Node };

interface ObjectState {
  id: number;
  /** Element-scoped variable name → effects reading it. */
  symbols?: Map<string, Set<Effect>>;
}

type Subscriptions<K> = Map<K, Set<Effect>>;

const states = new WeakMap<object, ObjectState>();
/** Global variable name → effects reading it. */
const globals: Subscriptions<string> = new Map();
/** `<attribute>:<element id>` → effects reading that attribute. */
const attributes: Subscriptions<string> = new Map();
/** Object id → effects reading any property of it. */
const properties: Subscriptions<number> = new Map();
/** Query root → effects that queried under it. */
const queries: Subscriptions<Node> = new Map();
const pending = new Set<Effect>();
const owned = new WeakMap<Element, Set<Effect>>();
let nextId = 0;
let current: Effect | undefined;
let scheduled = false;

function stateOf(object: object): ObjectState {
  let state = states.get(object);
  if (!state) states.set(object, (state = { id: ++nextId }));
  return state;
}

const isObject = (v: unknown): v is object => typeof v === 'object' && v !== null;

/** Run `read` with its reads recorded as dependencies of `effect`. */
function tracking(effect: Effect, read: () => unknown): unknown {
  const outer = current;
  current = effect;
  rx.tracking = true;
  try {
    return read();
  } finally {
    current = outer;
    rx.tracking = outer !== undefined;
  }
}

class Effect {
  dependencies = new Map<string, Dependency>();
  stopped = false;
  private last: unknown;
  private triggers = 0;

  constructor(
    private readonly expression: () => unknown,
    private readonly handler: (value: unknown) => void,
    readonly element?: Element
  ) {}

  /** Evaluate with tracking on. Returns false if the expression threw. */
  private evaluate(): boolean {
    try {
      this.next = tracking(this, this.expression);
      return true;
    } catch (e) {
      console.error('Error in reactive expression:', e);
      return false;
    }
  }

  private next: unknown;

  private handle(value: unknown): void {
    try {
      this.handler(value);
    } catch (e) {
      console.error('Error in reactive handler:', e);
    }
  }

  /** First run. A null value is "nothing yet", so the other side of a `bind` can go first. */
  initialize(): void {
    if (this.evaluate()) this.last = this.next;
    subscribe(this);
    if (this.last != null) this.handle(this.last);
  }

  run(): void {
    if (++this.triggers > 100) {
      console.error(
        'Reactivity loop detected: an effect triggered 100 consecutive times without settling. ' +
          'This usually means an effect is modifying a variable it also depends on.',
        this.element ?? this
      );
      return;
    }
    unsubscribe(this);
    const before = this.dependencies;
    this.dependencies = new Map();
    // Keep what it depended on if it threw, so a later change can try again.
    const ok = this.evaluate();
    if (!ok) this.dependencies = before;
    subscribe(this);
    if (ok && !Object.is(this.next, this.last)) {
      this.last = this.next;
      this.handle(this.next);
    }
  }

  settled(): void {
    this.triggers = 0;
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    unsubscribe(this);
    pending.delete(this);
  }
}

function schedule(effect: Effect): void {
  if (effect.stopped) return;
  pending.add(effect);
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    const batch = Array.from(pending);
    pending.clear();
    for (const queued of batch) {
      if (queued.stopped) continue;
      // An effect dies with its element.
      if (queued.element && !queued.element.isConnected) queued.stop();
      else queued.run();
    }
    // The loop guard counts only runs that keep cascading.
    if (pending.size === 0) for (const done of batch) done.settled();
  });
}

const scheduleAll = (effects?: Set<Effect>) => effects?.forEach(schedule);

// One observer and one pair of delegated listeners serve every attribute, property and
// query dependency. They are attached while any such dependency exists, and only then.

/** Re-run the effects that queried under a root containing one of these nodes. */
function scheduleQueries(changed: Iterable<Node>): void {
  for (const [root, effects] of queries) {
    for (const node of changed) {
      if (root.contains(node)) {
        scheduleAll(effects);
        break;
      }
    }
  }
}

let observer: MutationObserver | undefined;

function observe(): void {
  observer ??= new MutationObserver(mutations => {
    const changed = new Set<Node>();
    for (const mutation of mutations) {
      if (mutation.type === 'attributes') {
        const state = states.get(mutation.target);
        if (state) scheduleAll(attributes.get(`${mutation.attributeName}:${state.id}`));
      }
      changed.add(mutation.target);
    }
    scheduleQueries(changed);
  });
  // Observing again replaces the earlier observation; adding the same listener is a no-op.
  observer.observe(document, { attributes: true, childList: true, subtree: true });
  document.addEventListener('input', edited, true);
  document.addEventListener('change', edited, true);
}

/** A form control's value changes without any script writing it. */
function edited(event: Event): void {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const state = states.get(target);
  if (state) scheduleAll(properties.get(state.id));
  scheduleQueries([target]);
}

function add<K>(subscriptions: Subscriptions<K>, key: K, effect: Effect): void {
  let effects = subscriptions.get(key);
  if (!effects) subscriptions.set(key, (effects = new Set()));
  effects.add(effect);
}

function drop<K>(subscriptions: Subscriptions<K>, key: K, effect: Effect): void {
  const effects = subscriptions.get(key);
  effects?.delete(effect);
  if (effects?.size === 0) subscriptions.delete(key);
}

/** Add or drop an effect under each of its dependencies. True if any of them is DOM state. */
function link(effect: Effect, apply: typeof add): boolean {
  let dom = false;
  for (const dep of effect.dependencies.values()) {
    if (dep.type === 'global') apply(globals, dep.name, effect);
    else if (dep.type === 'element')
      apply((stateOf(dep.element).symbols ??= new Map()), dep.name, effect);
    else {
      dom = true;
      if (dep.type === 'query') apply(queries, dep.root, effect);
      else if (dep.type === 'property') apply(properties, stateOf(dep.object).id, effect);
      else apply(attributes, `${dep.name}:${stateOf(dep.element).id}`, effect);
    }
  }
  return dom;
}

function subscribe(effect: Effect): void {
  // An effect that reads only variables never starts the observer.
  if (link(effect, add)) observe();
}

function unsubscribe(effect: Effect): void {
  link(effect, drop);
  if (observer && !attributes.size && !properties.size && !queries.size) {
    observer.disconnect();
    document.removeEventListener('input', edited, true);
    document.removeEventListener('change', edited, true);
  }
}

/** Run `handler` with the value of `expression` now, and again whenever that value changes. */
export function createEffect(
  expression: () => unknown,
  handler: (value: unknown) => void,
  element?: Element
): () => void {
  const effect = new Effect(expression, handler, element);
  effect.initialize();
  if (element) {
    if (!owned.has(element)) owned.set(element, new Set());
    owned.get(element)?.add(effect);
  }
  return () => effect.stop();
}

function connect(): void {
  rx.readGlobal = name =>
    void current?.dependencies.set('symbol:global:' + name, { type: 'global', name });
  rx.readElement = (name, element) => {
    if (isObject(element)) {
      current?.dependencies.set(`symbol:element:${name}:${stateOf(element).id}`, {
        type: 'element',
        name,
        element,
      });
    }
  };
  rx.readProperty = object => {
    if (isObject(object) && !get(object, '_hsSkipTracking')) {
      current?.dependencies.set('property:' + stateOf(object).id, { type: 'property', object });
    }
  };
  rx.readAttribute = (element, name) => {
    if (isEl(element)) {
      current?.dependencies.set(`attribute:${name}:${stateOf(element).id}`, {
        type: 'attribute',
        name,
        element,
      });
    }
  };
  rx.wroteGlobal = name => scheduleAll(globals.get(name));
  rx.wroteElement = (name, element) => {
    if (isObject(element)) scheduleAll(states.get(element)?.symbols?.get(name));
  };
  rx.readQuery = root =>
    void current?.dependencies.set('query:' + stateOf(root).id, { type: 'query', root });
  rx.wroteProperty = object => {
    const state = isObject(object) && !get(object, '_hsSkipTracking') && states.get(object);
    if (state) scheduleAll(properties.get(state.id));
  };
  rx.stop = element => {
    owned.get(element)?.forEach(effect => effect.stop());
    owned.delete(element);
  };
}

// ---------------------------------------------------------------------------
// when … changes
// ---------------------------------------------------------------------------

export interface WhenFeature extends Feature {
  type: 'whenFeature';
  watched: Expr[];
  body: Cmd[];
}

const report = (target: unknown) => (error: unknown) => {
  console.error(get(error, 'message') ?? error);
  triggerEvent(target, 'exception', { error });
};

function when(g: Grammar): void {
  g.features.when = (p, start) => {
    const watched: Expr[] = [];
    do watched.push(p.withFollow(['or'], () => expr(p)));
    while (p.match('or'));
    for (const e of watched) {
      if (e.type === 'symbol' && 'scope' in e && e.scope === 'local' && e.name) {
        p.err(
          `Cannot watch local variable '${e.name}'. Local variables are not reactive. ` +
            `Use '$${e.name}' (global) or ':${e.name}' (element-scoped) instead.`
        );
      }
    }
    p.req('changes');
    const body = commandList(p);
    const feature: WhenFeature = {
      type: 'whenFeature',
      displayName: 'when ... changes',
      watched,
      body,
      start,
      end: p.endPos(),
      install: target =>
        queueMicrotask(() => {
          const context = () => makeContext(target, feature, target, null);
          for (const e of watched) {
            createEffect(
              () => e.ev(context()),
              value => {
                const ctx = context();
                ctx.result = value;
                guard(() => then1(runList(body, ctx), () => {}), report(target));
              },
              isEl(target) ? target : undefined
            );
          }
        }),
    };
    return feature;
  };
}

// ---------------------------------------------------------------------------
// live
// ---------------------------------------------------------------------------

export interface LiveFeature extends Feature {
  type: 'liveFeature';
  body: Cmd[];
}

/** `live <commands>`: run the commands now and again whenever anything they read changes. */
function live(g: Grammar): void {
  g.features.live = (p, start) => {
    const body = commandList(p);
    const feature: LiveFeature = {
      type: 'liveFeature',
      displayName: 'live',
      body,
      start,
      end: p.endPos(),
      install: target =>
        queueMicrotask(() =>
          createEffect(
            () => void runList(body, makeContext(target, feature, target, null)),
            () => {},
            isEl(target) ? target : undefined
          )
        ),
    };
    return feature;
  };
}

// ---------------------------------------------------------------------------
// bind
// ---------------------------------------------------------------------------

export interface BindFeature extends Feature {
  type: 'bindFeature';
  left: Expr;
  right: Expr;
}

interface Side {
  /** Set when the side is a form control or other element with a natural value. */
  element?: Element;
  writable: boolean;
  read(): unknown;
  write(value: unknown): void;
}

/** The property a `bind` to a bare element reads and writes. */
function valueProperty(element: Element): string {
  if (element instanceof HTMLInputElement) {
    const type = element.getAttribute('type') ?? 'text';
    return type === 'checkbox'
      ? 'checked'
      : type === 'number' || type === 'range'
        ? 'valueAsNumber'
        : 'value';
  }
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)
    return 'value';
  const editable = element.getAttribute('contenteditable');
  if (editable !== null && editable !== 'false') return 'textContent';
  if (element.tagName.includes('-') && 'value' in element) return 'value';
  throw new Error(
    `bind cannot auto-detect a property for <${element.tagName.toLowerCase()}>. ` +
      "Use an explicit property (e.g. 'bind $var to #el's value')."
  );
}

function elementSide(element: Element): Side {
  if (element instanceof HTMLInputElement && element.type === 'radio') {
    // A radio button stands for its own value: it reads as that value when checked.
    return {
      element,
      writable: true,
      read: () => (resolveProperty(element, 'checked') ? element.value : undefined),
      write: value => (element.checked = value === element.value),
    };
  }
  const property = valueProperty(element);
  return {
    element,
    writable: true,
    read: () => {
      const value = resolveProperty(element, property);
      // An empty number input reads as NaN; treat it as no value.
      return property === 'valueAsNumber' && Number.isNaN(value) ? null : value;
    },
    write: value => void Reflect.set(element, property, value),
  };
}

/** Write a bound value: a boolean toggles a class or a boolean attribute. */
function assign(target: Expr, ctx: Ctx, value: unknown): void {
  const elt = ctx.you || ctx.me;
  if (target.type === 'classRef' && 'className' in target && typeof target.className === 'string') {
    if (isEl(elt)) elt.classList.toggle(target.className, !!value);
  } else if (target.type === 'attributeRef' && typeof value === 'boolean' && target.name) {
    if (!isEl(elt)) return;
    if (target.name.startsWith('aria-')) elt.setAttribute(target.name, String(value));
    else elt.toggleAttribute(target.name, value);
  } else then1(target.lhs?.(ctx), lhs => target.put?.(ctx, lhs, value));
}

function expressionSide(e: Expr, target: unknown, feature: Feature): Side {
  const context = () => makeContext(target, feature, target, null);
  if (e.type === 'classRef' && 'className' in e && typeof e.className === 'string') {
    const name = e.className;
    return {
      writable: true,
      read: () => {
        // Reading the class attribute is what makes a class change re-run the effect.
        resolveAttribute(target, 'class');
        return isEl(target) && target.classList.contains(name);
      },
      write: value => void (isEl(target) && target.classList.toggle(name, !!value)),
    };
  }
  return {
    writable: e.type === 'attributeRef' || !!e.put,
    read: () => e.ev(context()),
    write: value => assign(e, context(), value),
  };
}

function bind(g: Grammar): void {
  g.features.bind = (p, start) => {
    const left = p.withFollow(['and', 'with', 'to'], () => expr(p));
    if (!p.matchAny('and', 'with', 'to')) p.expected('and', 'with', 'to');
    const right = expr(p);
    const feature: BindFeature = {
      type: 'bindFeature',
      displayName: 'bind',
      left,
      right,
      start,
      end: p.endPos(),
      install: target =>
        queueMicrotask(() => {
          const owner = isEl(target) ? target : undefined;
          const side = (e: Expr): Side => {
            const value = e.ev(makeContext(target, feature, target, null));
            return isEl(value) ? elementSide(value) : expressionSide(e, target, feature);
          };
          try {
            const a = side(left);
            const b = side(right);
            if (!a.writable && !b.writable)
              throw new Error('bind requires at least one writable side');
            // The left side wins the first exchange: its effect is created second.
            if (a.writable) createEffect(b.read, a.write, owner);
            if (b.writable) createEffect(a.read, b.write, owner);
            // A form reset changes values without events; re-sync after it.
            for (const [from, to] of [
              [a, b],
              [b, a],
            ]) {
              const form = from.element?.closest('form');
              if (!form || !owner) continue;
              const handler = () => setTimeout(() => owner.isConnected && to.write(from.read()), 0);
              form.addEventListener('reset', handler);
              (dataOf(owner).listeners ??= []).push({ target: form, event: 'reset', handler });
            }
          } catch (e) {
            console.error(get(e, 'message') ?? e);
          }
        }),
    };
    return feature;
  };
}

/** Registers `when`, `live` and `bind`, and switches dependency tracking on. */
export function reactivity(g: Grammar): void {
  connect();
  when(g);
  live(g);
  bind(g);
}
