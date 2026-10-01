/**
 * Runtime values: contexts, symbol scopes, collections, conversions, events.
 * Nothing here parses; `engine.ts` connects parsing to the DOM.
 *
 * Semantics follow upstream _hyperscript's `core/runtime/runtime.js`.
 */
import type { Cmd, Completion, Ctx, Expr, Feature, Handlers, LoopScope, Scope } from './ast';
import { fn, get, isEl, isIterable, isP, obj, set, then1, type MaybeP } from './util';

// ---------------------------------------------------------------------------
// Configuration and host hooks
// ---------------------------------------------------------------------------

export type Conversion = (value: unknown) => unknown;

export interface Config {
  /** Attributes that hold a script. */
  attributes: string;
  defaultTransition: string;
  disableSelector: string;
  /** Strategy `hide` / `show` / `toggle` use when none is named; `display` if unset. */
  defaultHideShowStrategy?: string;
  /** Extra strategies by name. */
  hideShowStrategies: Record<
    string,
    (op: 'hide' | 'show' | 'toggle', elt: HTMLElement, arg?: string) => void
  >;
  /** `fetch` throws when the response status matches one of these. */
  fetchThrowsOn: RegExp[];
}

export const config: Config = {
  attributes: '_, script, data-script',
  defaultTransition: 'all 500ms ease-in',
  disableSelector: '[disable-scripting], [data-disable-scripting]',
  hideShowStrategies: {},
  fetchThrowsOn: [/^4/, /^5/],
};

/** `as <Name>` conversions. The everyday ones are built in; `conversions.ts` adds the rest. */
export const conversions: Record<string, Conversion> = Object.assign(Object.create(null), {
  String: (v: unknown) => String(v),
  Int: (v: unknown) => parseInt(String(v)),
  Float: (v: unknown) => parseFloat(String(v)),
  Number: (v: unknown) => Number(v),
  Fragment: (v: unknown) => toFragment(v),
});

/** Tried before the table, for parameterised names such as `Fixed:2`. */
export const dynamicResolvers: ((name: string, value: unknown) => unknown)[] = [];

/** Set by `engine.ts`, so commands can initialise content they insert. */
export const host = {
  process(_node: unknown): void {},
  /** A scripted element is being initialised, or was found again. Templates use it. */
  enter(_elt: Element): void {},
};

// ---------------------------------------------------------------------------
// Per-element state
// ---------------------------------------------------------------------------

export interface EventQueue {
  queue: Ctx[];
  executing: boolean;
}

export interface ElementData {
  initialized?: boolean;
  scriptHash?: number;
  /** Variable scopes: `elementScope`, plus one per installed behavior. */
  scopes?: Record<string, Record<string, unknown>>;
  /** Functions and namespaces defined by `def` on this element. */
  features?: Record<string, unknown>;
  listeners?: { target: EventTarget; event: string; handler: EventListener }[];
  observers?: { disconnect(): void }[];
  timers?: Set<ReturnType<typeof setTimeout>>;
  eventQueues?: Map<object, EventQueue>;
  originalDisplay?: string;
  /** Property values before the first `transition`, for `to initial`. */
  transitionInitials?: Record<number, unknown>;
  /** The loops of the template rendered into this element. */
  loops?: Record<string, LoopScope>;
}

const store = new WeakMap<object, ElementData>();

export const peekData = (elt: object): ElementData | undefined => store.get(elt);
export const dropData = (elt: object): boolean => store.delete(elt);

export function dataOf(elt: object): ElementData {
  let d = store.get(elt);
  if (!d) store.set(elt, (d = {}));
  return d;
}

// ---------------------------------------------------------------------------
// Reactivity hook
// ---------------------------------------------------------------------------

/**
 * Where reads and writes report to the reactivity module. Every member is a
 * no-op until `reactivity.ts` is registered, so a bundle without `when`, `bind`
 * or `live` pays only for these calls.
 */
export const rx = {
  /** True while an effect is evaluating: reads are then recorded as its dependencies. */
  tracking: false,
  readGlobal(_name: string): void {},
  readElement(_name: string, _element: unknown): void {},
  readProperty(_object: unknown, _name: string): void {},
  readAttribute(_element: unknown, _name: string): void {},
  /** A selector was queried under `root`: any DOM change inside it re-runs the reader. */
  readQuery(_root: Node): void {},
  wroteGlobal(_name: string): void {},
  wroteElement(_name: string, _element: unknown): void {},
  /** A property was assigned, or the object was mutated in place. */
  wroteProperty(_object: unknown): void {},
  stop(_element: Element): void {},
};

/** A value read through a variable: an in-place change to it (a push, say) re-runs the reader. */
const tracked = (value: unknown): unknown => {
  if (rx.tracking && typeof value === 'object' && value !== null)
    rx.readProperty(value, '__mutation__');
  return value;
};

/** Methods that change their receiver, by constructor name. */
export const mutatingMethods: Record<string, string[]> = {
  Array: ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin'],
  Set: ['add', 'delete', 'clear'],
  Map: ['set', 'delete', 'clear'],
};

/** After calling `target.method(…)`: report the change if the method is a mutating one. */
export function maybeNotify(target: unknown, method: string): void {
  const type = get(get(target, 'constructor'), 'name');
  if (typeof type === 'string' && mutatingMethods[type]?.includes(method)) rx.wroteProperty(target);
}

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

export const getRootNode = (node: unknown): Document | ShadowRoot => {
  if (node instanceof Node) {
    const root = node.getRootNode();
    if (root instanceof Document || root instanceof ShadowRoot) return root;
  }
  return document;
};

export const escapeSelector = (s: string): string => s.replace(/[:&()[\]/]/g, c => '\\' + c);

/** `querySelectorAll`, recorded as a dependency of the effect that is evaluating. */
export function query(root: ParentNode & Node, css: string): NodeListOf<Element> {
  if (rx.tracking) rx.readQuery(root);
  return root.querySelectorAll(css);
}

/** A live query: re-run each time it is iterated, like upstream's ElementCollection. */
export class ElementCollection implements Iterable<Element> {
  constructor(
    private readonly raw: string,
    private readonly relativeTo: unknown,
    private readonly escape = false
  ) {}

  get css(): string {
    return this.escape ? escapeSelector(this.raw) : this.raw;
  }

  get className(): string {
    return this.raw.slice(1);
  }

  get length(): number {
    return this.select().length;
  }

  contains(node: Node): boolean {
    for (const e of this) if (e.contains(node)) return true;
    return false;
  }

  select(): NodeListOf<Element> {
    return query(getRootNode(this.relativeTo), this.css);
  }

  [Symbol.iterator](): Iterator<Element> {
    return this.select()[Symbol.iterator]();
  }
}

export const shouldAutoIterate = (v: unknown): v is Iterable<unknown> =>
  v instanceof ElementCollection ||
  Array.isArray(v) ||
  v instanceof NodeList ||
  v instanceof HTMLCollection ||
  v instanceof FileList;

/** Apply to each member of a collection, or to the value itself. */
export function implicitLoop(value: unknown, f: (v: unknown) => void): void {
  if (shouldAutoIterate(value)) for (const v of value) f(v);
  else f(value);
}

export function forEach(value: unknown, f: (v: unknown) => void): void {
  if (value == null) return;
  if (isIterable(value)) for (const v of value) f(v);
  else f(value);
}

const flatGet = (root: unknown, getter: (o: unknown) => unknown): unknown => {
  if (root == null) return;
  const value = getter(root);
  if (value !== undefined) return value;
  if (shouldAutoIterate(root)) return Array.from(root, getter);
};

export const resolveProperty = (root: unknown, prop: string): unknown => {
  if (rx.tracking) rx.readProperty(root, prop);
  return flatGet(root, o => get(o, prop));
};

export const resolveAttribute = (root: unknown, name: string): unknown => {
  if (rx.tracking) rx.readAttribute(root, name);
  return flatGet(root, o => (isEl(o) ? o.getAttribute(name) : undefined));
};

export const resolveStyle = (root: unknown, prop: string): unknown =>
  flatGet(root, o => get(get(o, 'style'), prop));

export const resolveComputedStyle = (root: unknown, prop: string): unknown =>
  flatGet(root, o => (isEl(o) ? getComputedStyle(o).getPropertyValue(prop) : undefined));

export const setAttribute = (target: unknown, name: string, value: unknown): void =>
  implicitLoop(target, elt => {
    if (!isEl(elt)) return;
    if (value == null) elt.removeAttribute(name);
    else elt.setAttribute(name, String(value));
  });

export const setStyle = (target: unknown, prop: string, value: unknown): void =>
  implicitLoop(target, elt => set(get(elt, 'style'), prop, value));

export const setProperty = (target: unknown, prop: string, value: unknown): void =>
  implicitLoop(target, elt => {
    set(elt, prop, value);
    rx.wroteProperty(elt);
  });

// ---------------------------------------------------------------------------
// Value tests
// ---------------------------------------------------------------------------

export function nullCheck(value: unknown, source: string): void {
  if (value == null) throw new Error(`'${source}' is null`);
}

export const isEmpty = (v: unknown): boolean => v == null || get(v, 'length') === 0;

export function doesExist(v: unknown): boolean {
  if (v == null) return false;
  if (shouldAutoIterate(v)) {
    for (const _ of v) return true;
    return false;
  }
  return true;
}

export function typeCheck(value: unknown, typeName: string, nullOk: boolean): boolean {
  if (value == null && nullOk) return true;
  if (Object.prototype.toString.call(value).slice(8, -1) === typeName) return true;
  const ctor = get(globalThis, typeName);
  return fn(ctor) && value instanceof ctor;
}

export function convert(value: unknown, type: string): unknown {
  for (const resolver of dynamicResolvers) {
    const converted = resolver(type, value);
    if (converted !== undefined) return converted;
  }
  if (value == null) return null;
  const conversion = conversions[type];
  if (conversion) return conversion(value);
  throw new Error('Unknown conversion : ' + type);
}

/** Turn a value into nodes to insert: nodes are moved, anything else is parsed as HTML. */
export function toFragment(value: unknown): DocumentFragment {
  const frag = document.createDocumentFragment();
  // Upstream converts a missing value to null before it inserts it, and the DOM writes
  // null as the text "null": `put noSuchVariable into me` shows "null", not "undefined".
  if (value == null) frag.append('null');
  else
    implicitLoop(value, v => {
      if (v instanceof Node) frag.append(v);
      else {
        const template = document.createElement('template');
        // Assigning null to innerHTML clears it.
        template.innerHTML = v === null ? '' : String(v);
        frag.append(template.content);
      }
    });
  return frag;
}

/** Replace each target element with the value (a node is cloned per target), then initialise it. */
export function replaceInDom(target: unknown, value: unknown): void {
  implicitLoop(target, elt => {
    if (!isEl(elt)) return;
    const parent = elt.parentElement;
    elt.replaceWith(value instanceof Node ? value.cloneNode(true) : toFragment(value));
    if (parent) host.process(parent);
  });
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export function triggerEvent(
  target: unknown,
  name: string,
  detail: Record<string, unknown> = {},
  sender?: unknown
): boolean {
  if (!(target instanceof EventTarget)) return true;
  detail.sender = sender;
  const event = Object.assign(
    new Event(name, { bubbles: true, cancelable: true, composed: true }),
    {
      detail,
    }
  );
  return target.dispatchEvent(event);
}

// ---------------------------------------------------------------------------
// Contexts and symbol scopes
// ---------------------------------------------------------------------------

/** The scope an element keeps for its own script, or for one installed behavior. */
export const scopeOf = (elt: object, name = 'elementScope'): Record<string, unknown> =>
  ((dataOf(elt).scopes ??= {})[name] ??= {});

/**
 * Names every script can read without declaring them. Locals inherit from this
 * object, so a context costs nothing extra and a local of the same name wins.
 */
export const ambient: Record<string, unknown> = Object.create(null, {
  selection: { get: () => getSelection()?.toString(), enumerable: true },
  clipboard: {
    get: () => navigator.clipboard.readText(),
    set: (value: unknown) => void navigator.clipboard.writeText(String(value)),
  },
});

export function makeContext(
  owner: unknown,
  feature: Feature | undefined,
  me: unknown,
  event: unknown
): Ctx {
  const detail = get(event, 'detail');
  const locals: Record<string, unknown> = Object.create(ambient);
  // Functions defined on the owner or an ancestor are visible as plain names.
  for (let elt = isEl(owner) ? owner : null; elt; elt = elt.parentElement) {
    Object.assign(locals, peekData(elt)?.features);
  }
  return {
    meta: { owner, feature },
    locals,
    me,
    you: undefined,
    result: undefined,
    beingTested: null,
    event,
    target: get(event, 'target') ?? null,
    detail: detail ?? null,
    sender: get(detail, 'sender') ?? null,
    body: typeof document === 'undefined' ? null : document.body,
  };
}

/** Define `path.name` globally (for the body or no element) or on an element's own features. */
export function assignToNamespace(
  elt: unknown,
  path: string[],
  name: string,
  value: unknown
): void {
  let root: unknown =
    elt == null || elt === document.body || !obj(elt) ? globalThis : (dataOf(elt).features ??= {});
  for (const part of path) {
    if (get(root, part) == null) set(root, part, {});
    root = get(root, part);
  }
  set(root, name, value);
}

/** Names that read the context itself rather than a local variable. */
const RESERVED = ['meta', 'it', 'result', 'locals', 'event', 'target', 'detail', 'sender', 'body'];

const elementScope = (ctx: Ctx): Record<string, unknown> => {
  const owner = ctx.meta.owner;
  const behavior = ctx.meta.feature?.behavior;
  return obj(owner) ? scopeOf(owner, behavior ? behavior + 'Scope' : undefined) : {};
};

/** `^name`: the nearest ancestor that has the variable, honouring `dom-scope`. */
function inherited(
  name: string,
  ctx: Ctx,
  start: unknown
): { value: unknown; element: Element | null } {
  let elt = isEl(start) ? start : isEl(ctx.meta.owner) ? ctx.meta.owner : null;
  while (elt) {
    const scope = peekData(elt)?.scopes?.elementScope;
    if (scope && name in scope) return { value: scope[name], element: elt };
    const domScope = elt.getAttribute('dom-scope');
    if (domScope === 'isolated') break;
    const closest = domScope?.match(/^closest\s+(.+)/);
    const parentOf = domScope?.match(/^parent\s+of\s+(.+)/);
    if (closest) elt = elt.parentElement?.closest(closest[1]) ?? null;
    else if (parentOf) elt = elt.closest(parentOf[1])?.parentElement ?? null;
    else elt = elt.parentElement;
  }
  return { value: undefined, element: null };
}

export function resolveSymbol(name: string, ctx: Ctx, scope?: Scope, target?: unknown): unknown {
  if (name === 'me' || name === 'my' || name === 'I') return ctx.me;
  if (name === 'it' || name === 'its') return ctx.beingTested ?? ctx.result;
  if (name === 'result') return ctx.result;
  if (name === 'you' || name === 'your' || name === 'yourself') return ctx.you;
  const owner = ctx.meta.owner;
  const global = () => {
    if (rx.tracking) rx.readGlobal(name);
    return tracked(get(globalThis, name));
  };
  if (scope === 'global') return global();
  if (scope === 'element') {
    if (rx.tracking) rx.readElement(name, owner);
    return tracked(elementScope(ctx)[name]);
  }
  if (scope === 'inherited') {
    const found = inherited(name, ctx, target);
    if (rx.tracking) rx.readElement(name, found.element ?? (isEl(target) ? target : owner));
    return tracked(found.value);
  }

  // Inside an `on …[filter]`, bare names read the event and its detail first.
  const filterContext = ctx.meta.context;
  if (filterContext != null) {
    const fromEvent = get(filterContext, name);
    if (fromEvent !== undefined) return fromEvent;
    const fromDetail = get(get(filterContext, 'detail'), name);
    if (fromDetail !== undefined) return fromDetail;
  }
  const local = RESERVED.includes(name) ? get(ctx, name) : ctx.locals[name];
  if (local !== undefined) return local;
  const fromElement = elementScope(ctx)[name];
  if (fromElement !== undefined) {
    if (rx.tracking) rx.readElement(name, owner);
    return tracked(fromElement);
  }
  // Found or not, the read is recorded as a global so the first write is noticed.
  return global();
}

export function setSymbol(
  name: string,
  ctx: Ctx,
  scope: Scope | undefined,
  value: unknown,
  target?: unknown
): void {
  if (scope === 'global') {
    set(globalThis, name, value);
    rx.wroteGlobal(name);
  } else if (scope === 'element') {
    elementScope(ctx)[name] = value;
    rx.wroteElement(name, ctx.meta.owner);
  } else if (scope === 'inherited') {
    const found = inherited(name, ctx, target).element;
    const owner = found ?? (isEl(target) ? target : ctx.meta.owner);
    if (obj(owner)) scopeOf(owner)[name] = value;
    rx.wroteElement(name, owner);
  } else if (!RESERVED.includes(name) && ctx.locals[name] !== undefined) {
    ctx.locals[name] = value;
  } else if (elementScope(ctx)[name] !== undefined) {
    elementScope(ctx)[name] = value;
    rx.wroteElement(name, ctx.meta.owner);
  } else if (!RESERVED.includes(name)) {
    ctx.locals[name] = value;
  } else set(ctx, name, value);
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

/**
 * Run commands in order. Synchronous commands run in this call; the first one
 * that returns a promise makes the rest continue when it settles. A command that
 * returns a signal (`return`, `break`, `continue`) stops the list and hands the
 * signal to whoever called it.
 */
export function runList(cmds: Cmd[], ctx: Ctx, from = 0): MaybeP<Completion> {
  for (let i = from; i < cmds.length; i++) {
    const result = cmds[i].run(ctx);
    if (isP(result)) return result.then(signal => signal || runList(cmds, ctx, i + 1));
    if (result) return result;
  }
}

/** `try { f() } catch (e) { rescue(e) }` for a value that may be a promise. */
export function guard<T>(f: () => MaybeP<T>, rescue: (e: unknown) => MaybeP<T>): MaybeP<T> {
  try {
    const result = f();
    return isP(result) ? result.then(undefined, rescue) : result;
  } catch (e) {
    return rescue(e);
  }
}

/**
 * Run the body of a handler or function: the body, its `catch` block on an
 * error, and its `finally` block in every case. An error with no `catch`, or
 * one thrown inside the `catch` block, propagates — thrown if everything so far
 * was synchronous, as a rejection otherwise.
 */
export function runBlock(ctx: Ctx, body: Cmd[], handlers: Handlers): MaybeP<Completion> {
  const { errorSymbol, errorHandler, finallyHandler } = handlers;
  const main = () =>
    guard(
      () =>
        then1(runList(body, ctx), signal => {
          const kind = get(signal, 'k');
          if (kind === 'break' || kind === 'continue') {
            throw new Error(`Command \`${kind}\` cannot be used outside of a \`repeat\` loop.`);
          }
          return signalOf(signal);
        }),
      error => {
        if (!errorHandler || !errorSymbol) throw error;
        ctx.locals[errorSymbol] = error;
        return runList(errorHandler, ctx);
      }
    );
  if (!finallyHandler) return main();
  const cleanUp = () =>
    guard(
      () => then1(runList(finallyHandler, ctx), () => {}),
      error => console.error(' Exception in finally block: ', error)
    );
  return guard(
    () => then1(main(), signal => then1(cleanUp(), () => signalOf(signal))),
    error =>
      then1(cleanUp(), () => {
        throw error;
      })
  );
}

/** Narrow what came back from a command list to a completion. */
export const signalOf = (v: unknown): Completion => {
  const kind = get(v, 'k');
  if (kind === 'return') return { k: 'return', value: get(v, 'value') };
  if (kind === 'break' || kind === 'continue') return { k: kind };
};

/**
 * Evaluate a `when` clause once per target with `it` bound to the target, then
 * apply `yes` to the targets that passed and `no` to the rest. The result is the
 * list that passed.
 */
export function implicitLoopWhen(
  targets: unknown,
  when: Expr,
  ctx: Ctx,
  yes: (elt: unknown) => void,
  no: (elt: unknown) => void
): MaybeP<void> {
  const elements: unknown[] = [];
  implicitLoop(targets, elt => elements.push(elt));
  const conditions = elements.map(elt => {
    ctx.beingTested = elt;
    return when.ev(ctx);
  });
  ctx.beingTested = null;
  const apply = (results: unknown[]) => {
    ctx.result = elements.filter((elt, i) => {
      (results[i] ? yes : no)(elt);
      return results[i];
    });
  };
  return conditions.some(isP) ? Promise.all(conditions).then(apply) : apply(conditions);
}
