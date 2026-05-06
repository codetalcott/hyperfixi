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

/**
 * Whether reactive debug logging is enabled. Mirrors the core convention:
 * `localStorage.setItem('hyperfixi:debug', '*')` enables, anything else (or no
 * `localStorage`) disables. Cheap call — no caching, since users toggle this
 * interactively in the console.
 */
function debugEnabled(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem('hyperfixi:debug') !== null;
  } catch {
    return false;
  }
}

function debugWarn(message: string, err: unknown): void {
  if (!debugEnabled()) return;
  if (typeof console === 'undefined') return;
  console.warn(`[@hyperfixi/reactivity] ${message}`, err);
}

export interface Dep {
  readonly key: string;
  readonly kind: DepKind;
  readonly name: string;
  readonly element: Element | null;
}

const globalDepKey = (name: string): string => `global:${name}`;
const elementDepKey = (el: Element, name: string): string => `element:${reactiveIdFor(el)}:${name}`;
const domDepKey = (el: Element, prop: string): string => `dom:${reactiveIdFor(el)}:${prop}`;

// WeakMap-based id assignment so we don't monkey-patch DOM nodes. Ids are
// per-process and only used to construct stable string keys for an effect's
// per-effect dependency dedup map.
const _reactiveIds = new WeakMap<Element, number>();
let _idCounter = 0;
function reactiveIdFor(el: Element): number {
  const existing = _reactiveIds.get(el);
  if (existing !== undefined) return existing;
  const id = ++_idCounter;
  _reactiveIds.set(el, id);
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
    } catch (err) {
      // Swallow — expression evaluation failed during initial read. Surface
      // via debug log so users diagnosing "my effect never fires" can see why.
      debugWarn('effect.initialize failed', err);
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
    } catch (err) {
      // Swallow — expression/handler errors don't break the microtask flush.
      debugWarn('effect.run failed', err);
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
   * Whether `el` is a `dom-scope="isolated"` boundary. Walks of `^var`
   * lookups stop at boundary elements that don't define the var, so nested
   * components don't accidentally read or write each other's state.
   */
  private isIsolationBoundary(el: Element): boolean {
    return typeof el.getAttribute === 'function' && el.getAttribute('dom-scope') === 'isolated';
  }

  /**
   * Walk up the DOM tree from `lookupRoot`, returning the first element whose
   * state has `name` defined. Stops at any `dom-scope="isolated"` boundary
   * that doesn't itself define the var. Returns `null` if no owner is found.
   */
  private findCaretOwner(lookupRoot: Element, name: string): Element | null {
    let el: Element | null = lookupRoot;
    while (el) {
      const state = this.elementState.get(el);
      if (state && state.caretVars.has(name)) return el;
      if (this.isIsolationBoundary(el)) return null;
      el = el.parentElement;
    }
    return null;
  }

  /**
   * Read a DOM-scoped variable. Walks up from `lookupRoot`, tracking each
   * element visited as an `element` dep (so writes at any ancestor notify
   * dependent effects). Stops at any `dom-scope="isolated"` boundary that
   * doesn't itself define the var.
   */
  readCaret(lookupRoot: Element, name: string): unknown {
    let el: Element | null = lookupRoot;
    while (el) {
      this.trackElement(el, name);
      const state = this.elementState.get(el);
      if (state && state.caretVars.has(name)) {
        return state.caretVars.get(name);
      }
      if (this.isIsolationBoundary(el)) return undefined;
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
    try {
      while (this.pending.size > 0) {
        const batch = Array.from(this.pending);
        this.pending.clear();
        for (const e of batch) {
          if (e.stopped) continue;
          await e.run();
          // If the effect's run did not synchronously re-schedule itself, its
          // trigger count is reset. Self-rescheduling (a real cycle) keeps the
          // counter climbing toward the 100 cap. Long-lived effects that fire
          // sporadically (e.g. user-input bindings) stay alive forever.
          if (!this.pending.has(e)) e.resetTriggerCount();
        }
      }
    } finally {
      this.scheduled = false;
    }
  }
}

// Module singleton. One reactive graph per process; mirrors upstream's
// `runtime.reactivity` pattern.
export const reactive = new Reactive();
