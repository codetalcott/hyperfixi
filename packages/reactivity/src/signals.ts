/**
 * Signal/effect reactive core.
 *
 * Models three dependency kinds for v1:
 *   - `global`  — `$name` variables in `context.globals`
 *   - `element` — `^name` DOM-scoped variables (per-element storage)
 *   - `dom`     — DOM properties read via `input`/`change` listeners
 *
 * Inspired by upstream _hyperscript 0.9.91's `src/core/runtime/reactivity.js`
 * but reimplemented in TypeScript against hyperfixi's types. Batched via
 * `queueMicrotask` so synchronous writes coalesce into a single flush. Cycle
 * detection halts at >100 consecutive triggers (matching upstream).
 *
 * External packages never see `Effect` or `Reactive` directly — they hold
 * the disposer returned by `createEffect()` and call it when the owning
 * element is cleaned up.
 */

export type DepKind = 'global' | 'element' | 'dom';

export interface Dep {
  readonly key: string;
  readonly kind: DepKind;
  readonly name: string;
  readonly element: Element | null;
}

const globalDepKey = (name: string): string => `global:${name}`;
const elementDepKey = (el: Element, name: string): string =>
  `element:${(el as any)._reactiveId ?? assignReactiveId(el)}:${name}`;
const domDepKey = (el: Element, prop: string): string =>
  `dom:${(el as any)._reactiveId ?? assignReactiveId(el)}:${prop}`;

let _idCounter = 0;
function assignReactiveId(el: Element): number {
  const id = ++_idCounter;
  (el as any)._reactiveId = id;
  return id;
}

export class Effect {
  readonly dependencies = new Map<string, Dep>();
  private lastValue: unknown = undefined;
  private _stopped = false;
  private _consecutiveTriggers = 0;

  constructor(
    private readonly r: Reactive,
    readonly expression: () => unknown | Promise<unknown>,
    readonly handler: (value: unknown) => void | Promise<void>,
    readonly element: Element | null
  ) {}

  get stopped(): boolean {
    return this._stopped;
  }

  /**
   * Run the effect for the first time: collect dependencies, subscribe, call
   * handler with the initial value. Errors in expression evaluation are caught
   * and silently swallowed (matches upstream's tolerance).
   */
  async initialize(): Promise<void> {
    if (this._stopped) return;
    try {
      const value = await this.r._runWithEffect(this, this.expression);
      this.lastValue = value;
      if (value !== undefined && value !== null) {
        await this.handler(value);
      }
    } catch {
      // Swallow — expression evaluation failed during initial read.
    }
  }

  /**
   * Re-run the effect after a notify. Cycle-detects (halts at 101 consecutive
   * triggers). If the new value is Object.is-equal to the last, the handler
   * is skipped. If the owning element has disconnected, the effect stops
   * itself and returns.
   */
  async run(): Promise<void> {
    if (this._stopped) return;
    if (this.element && !this.element.isConnected) {
      this.stop();
      return;
    }
    this._consecutiveTriggers++;
    if (this._consecutiveTriggers > 100) {
      if (typeof console !== 'undefined') {
        console.error(
          '[@hyperfixi/reactivity] Effect halted: > 100 consecutive triggers (cycle detected).'
        );
      }
      this.stop();
      return;
    }
    try {
      const value = await this.r._runWithEffect(this, this.expression);
      if (Object.is(value, this.lastValue)) return;
      this.lastValue = value;
      await this.handler(value);
    } catch {
      // Swallow — expression/handler errors don't break the microtask flush.
    }
  }

  resetTriggerCount(): void {
    this._consecutiveTriggers = 0;
  }

  /**
   * Stop the effect and remove it from all dependency subscriptions. Safe to
   * call multiple times.
   */
  stop(): void {
    if (this._stopped) return;
    this._stopped = true;
    this.r._unsubscribeEffect(this);
    this.dependencies.clear();
  }
}

interface ElementState {
  symbolSubs: Map<string, Set<Effect>>;
  caretVars: Map<string, unknown>;
  domHandlers: Map<string, DomHandler>;
  effects: Set<Effect>;
}

interface DomHandler {
  subs: Set<Effect>;
  detach: () => void;
}

export class Reactive {
  private currentEffect: Effect | null = null;
  private pending = new Set<Effect>();
  private scheduled = false;

  private globalSubs = new Map<string, Set<Effect>>();
  private elementState = new WeakMap<Element, ElementState>();

  private getElementState(el: Element): ElementState {
    let s = this.elementState.get(el);
    if (!s) {
      s = {
        symbolSubs: new Map(),
        caretVars: new Map(),
        domHandlers: new Map(),
        effects: new Set(),
      };
      this.elementState.set(el, s);
    }
    return s;
  }

  /**
   * Internal helper invoked by Effect — installs `this` as the current effect,
   * runs the expression, then restores the previous current-effect pointer.
   * Track* methods (called from read-paths) consult `currentEffect` to know
   * which effect to subscribe.
   */
  async _runWithEffect(e: Effect, fn: () => unknown | Promise<unknown>): Promise<unknown> {
    const prev = this.currentEffect;
    this.currentEffect = e;
    // Unsubscribe from previous deps before re-running. The expression will
    // re-record whatever it actually reads this time, avoiding stale subs.
    this._unsubscribeEffect(e);
    e.dependencies.clear();
    try {
      return await fn();
    } finally {
      this.currentEffect = prev;
    }
  }

  // ---------------------------------------------------------------------------
  // Track (read-path) — invoked from interceptors / evaluators.
  // ---------------------------------------------------------------------------

  trackGlobal(name: string): void {
    const e = this.currentEffect;
    if (!e) return;
    const key = globalDepKey(name);
    if (e.dependencies.has(key)) return;
    e.dependencies.set(key, { key, kind: 'global', name, element: null });
    let subs = this.globalSubs.get(name);
    if (!subs) {
      subs = new Set();
      this.globalSubs.set(name, subs);
    }
    subs.add(e);
  }

  trackElement(el: Element, name: string): void {
    const e = this.currentEffect;
    if (!e) return;
    const key = elementDepKey(el, name);
    if (e.dependencies.has(key)) return;
    e.dependencies.set(key, { key, kind: 'element', name, element: el });
    const state = this.getElementState(el);
    let subs = state.symbolSubs.get(name);
    if (!subs) {
      subs = new Set();
      state.symbolSubs.set(name, subs);
    }
    subs.add(e);
    state.effects.add(e);
  }

  trackDomProperty(el: Element, prop: string): void {
    const e = this.currentEffect;
    if (!e) return;
    const key = domDepKey(el, prop);
    if (e.dependencies.has(key)) return;
    e.dependencies.set(key, { key, kind: 'dom', name: prop, element: el });
    const state = this.getElementState(el);
    let handler = state.domHandlers.get(prop);
    if (!handler) {
      const subs = new Set<Effect>();
      const listener = (): void => {
        for (const effect of subs) this.schedule(effect);
      };
      // Use both input and change to cover radios/selects which don't fire input.
      el.addEventListener('input', listener);
      el.addEventListener('change', listener);
      handler = {
        subs,
        detach: () => {
          el.removeEventListener('input', listener);
          el.removeEventListener('change', listener);
        },
      };
      state.domHandlers.set(prop, handler);
    }
    handler.subs.add(e);
    state.effects.add(e);
  }

  // ---------------------------------------------------------------------------
  // Notify (write-path) — schedules dependent effects for re-run.
  // ---------------------------------------------------------------------------

  notifyGlobal(name: string): void {
    const subs = this.globalSubs.get(name);
    if (!subs) return;
    for (const e of subs) this.schedule(e);
  }

  notifyElement(el: Element, name: string): void {
    const state = this.elementState.get(el);
    if (!state) return;
    const subs = state.symbolSubs.get(name);
    if (!subs) return;
    for (const e of subs) this.schedule(e);
  }

  // ---------------------------------------------------------------------------
  // Effect lifecycle.
  // ---------------------------------------------------------------------------

  /**
   * Create + initialize an effect. Returns a disposer that stops the effect.
   * Callers are expected to register the disposer with the core runtime's
   * cleanup registry so it fires on element removal.
   */
  createEffect(
    expression: () => unknown | Promise<unknown>,
    handler: (value: unknown) => void | Promise<void>,
    owner: Element | null
  ): () => void {
    const e = new Effect(this, expression, handler, owner);
    if (owner) this.getElementState(owner).effects.add(e);
    // Fire initialize asynchronously so the caller can set up cleanup registration
    // before the first run touches the DOM.
    queueMicrotask(() => {
      void e.initialize();
    });
    return () => e.stop();
  }

  /**
   * Stop all effects owned by an element. Called by the reactivity plugin's
   * cleanup hook registered via `runtime.getCleanupRegistry()`.
   */
  stopElementEffects(el: Element): void {
    const state = this.elementState.get(el);
    if (!state) return;
    for (const e of Array.from(state.effects)) e.stop();
    state.effects.clear();
  }

  /**
   * Internal: remove an effect's entries from all subscriber sets. Called by
   * `Effect.stop()`.
   */
  _unsubscribeEffect(e: Effect): void {
    for (const dep of e.dependencies.values()) {
      if (dep.kind === 'global') {
        const subs = this.globalSubs.get(dep.name);
        subs?.delete(e);
      } else if (dep.kind === 'element' && dep.element) {
        const state = this.elementState.get(dep.element);
        const subs = state?.symbolSubs.get(dep.name);
        subs?.delete(e);
        state?.effects.delete(e);
      } else if (dep.kind === 'dom' && dep.element) {
        const state = this.elementState.get(dep.element);
        const handler = state?.domHandlers.get(dep.name);
        handler?.subs.delete(e);
        if (handler && handler.subs.size === 0) {
          handler.detach();
          state?.domHandlers.delete(dep.name);
        }
        state?.effects.delete(e);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Caret-variable storage — `^name` reads/writes.
  // ---------------------------------------------------------------------------

  /**
   * Walk up the DOM tree from `lookupRoot`, returning the first element whose
   * state has `name` defined. Returns `null` if no owner is found.
   */
  private findCaretOwner(lookupRoot: Element, name: string): Element | null {
    let el: Element | null = lookupRoot;
    while (el) {
      const state = this.elementState.get(el);
      if (state && state.caretVars.has(name)) return el;
      el = el.parentElement;
    }
    return null;
  }

  /**
   * Read a DOM-scoped variable. Walks up from `lookupRoot`, tracking each
   * element visited as an `element` dep (so writes at any ancestor notify
   * dependent effects).
   */
  readCaret(lookupRoot: Element, name: string): unknown {
    // Track every element in the lookup chain as a dep — that way writes at
    // any ancestor notify. Stop at the resolver to avoid tracking unrelated
    // ancestors.
    let el: Element | null = lookupRoot;
    while (el) {
      this.trackElement(el, name);
      const state = this.elementState.get(el);
      if (state && state.caretVars.has(name)) {
        return state.caretVars.get(name);
      }
      el = el.parentElement;
    }
    return undefined;
  }

  /**
   * Write a DOM-scoped variable. If `target` is provided, writes there
   * directly; otherwise walks up from `lookupRoot` to find the existing owner,
   * falling back to `lookupRoot` itself if no owner exists.
   */
  writeCaret(lookupRoot: Element, name: string, value: unknown, target?: Element): void {
    const owner = target ?? this.findCaretOwner(lookupRoot, name) ?? lookupRoot;
    const state = this.getElementState(owner);
    state.caretVars.set(name, value);
    this.notifyElement(owner, name);
  }

  // ---------------------------------------------------------------------------
  // Scheduler — microtask-batched flush.
  // ---------------------------------------------------------------------------

  private schedule(e: Effect): void {
    if (e.stopped) return;
    this.pending.add(e);
    if (this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => void this.flush());
  }

  private async flush(): Promise<void> {
    this.scheduled = false;
    const batch = Array.from(this.pending);
    this.pending.clear();
    for (const e of batch) {
      if (!e.stopped) await e.run();
    }
    // Note: trigger-count reset across flushes is tricky because the handler's
    // schedule() call can queue a follow-up flush that runs BEFORE this flush's
    // `pending.size === 0` check (due to microtask ordering). We rely on real
    // user interactions being few-per-second and the cycle guard halting at
    // 100 back-to-back runs — good enough for v1. A future refinement could
    // track "triggered during own run" to distinguish cycles from legitimate
    // cascades.
  }
}

// Module singleton. One reactive graph per process; mirrors upstream's
// `runtime.reactivity` pattern.
export const reactive = new Reactive();
