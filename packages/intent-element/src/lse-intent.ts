/**
 * <lse-intent> Custom Element
 *
 * Reads LSE protocol JSON from an inline <script type="application/lse+json">
 * child (or a `src` attribute), validates it, and runs it on the page's
 * hyperscript host: `@hyperfixi/engine` (`hyperfixi-hs.js`) or upstream
 * `_hyperscript`. The node is rendered to English hyperscript by a
 * `LokaScriptSemantic*` bundle and evaluated as ONE script, with the element as
 * `me` (and the event as `event`).
 *
 * The element refuses what it cannot run as written, with an `lse:error` event:
 * an intent that fails validation or a registered schema, an event modifier it
 * does not implement, an action outside its `allow` list, a page with no host
 * or no renderer. It never runs part of an intent. (`plan.ts` holds the rules.)
 *
 * ## When it runs
 *
 * The `trigger` attribute, if present, decides:
 *
 * - `load`      run on connect
 * - `manual`    never run by itself; the caller invokes `.refresh()`
 * - `intersect` run once, when the element scrolls into view
 * - `submit`    run on submit of the closest ancestor `<form>` (preventDefault is called)
 * - any other value: a DOM event name, listened for on the element (case kept)
 *
 * Without the attribute, an event handler (the verbose form, or a command with
 * the `trigger` sugar) runs on its own event; `once` is honored. Anything else
 * runs on connect.
 *
 * ## Trust
 *
 * An intent is code: an `expression` value is hyperscript, and hyperscript can
 * call any JavaScript. By default the element trusts its JSON as much as a page
 * trusts its own `_="…"` attributes. For JSON from anywhere else (an API, a
 * model), name what it may do: `allow="toggle add remove"` runs only those
 * actions, with plain values only (no expressions; one token per selector,
 * reference or bare literal).
 *
 * ## Events (on the element, bubbling)
 *
 * - `lse:validated`  the intent was read and will run on its trigger  (detail: { node, diagnostics })
 * - `lse:executed`   a run finished                                   (detail: { node, script, result })
 * - `lse:error`      a refusal or a failed run                        (detail: { diagnostics, error })
 */

import type { SemanticNode, IRDiagnostic } from '@lokascript/intent';
import { intentRegistry } from './schema-registry.js';
import { droppedValues, planIntent, type IntentPlan } from './plan.js';
import { DEFAULT_TIMEOUT_MS, withTimeout } from './timeout.js';

// ---------------------------------------------------------------------------
// The host and the renderer, looked up when a script runs
// ---------------------------------------------------------------------------

type Renderer = (node: SemanticNode, language: string) => string;

interface HostLike {
  evaluate?: (source: string, context?: Record<string, unknown>) => unknown;
}

function findRenderer(): Renderer | null {
  const override = LSEIntentElement.render;
  if (typeof override === 'function') return override;
  const w = globalThis as Record<string, unknown>;
  for (const key of Object.getOwnPropertyNames(w)) {
    if (!key.startsWith('LokaScriptSemantic')) continue;
    const bundle = w[key] as { render?: unknown } | undefined;
    if (bundle && typeof bundle.render === 'function') return bundle.render as Renderer;
  }
  return null;
}

type Runtime =
  | { evaluate: NonNullable<HostLike['evaluate']>; render: Renderer }
  | { code: 'NO_RUNTIME' | 'NO_RENDERER'; message: string };

function getRuntime(): Runtime {
  const w = globalThis as Record<string, unknown>;
  const host = (w['hyperfixi'] ?? w['_hyperscript']) as HostLike | undefined;
  if (!host || typeof host.evaluate !== 'function') {
    return {
      code: 'NO_RUNTIME',
      message:
        'no hyperscript host on the page: load hyperfixi-hs.js (and a LokaScriptSemantic bundle) before intent-element.',
    };
  }
  const render = findRenderer();
  if (!render) {
    return {
      code: 'NO_RENDERER',
      message:
        'a hyperscript host but no renderer: load a LokaScriptSemantic bundle (browser-en.en.global.js), or set LSEIntentElement.render.',
    };
  }
  return { evaluate: host.evaluate.bind(host), render };
}

// ---------------------------------------------------------------------------
// The trigger attribute
// ---------------------------------------------------------------------------

type TriggerSpec =
  | { kind: 'load' }
  | { kind: 'manual' }
  | { kind: 'intersect' }
  | { kind: 'submit'; once: boolean }
  | { kind: 'event'; eventName: string; once: boolean };

function parseTriggerValue(value: string, once: boolean): TriggerSpec {
  const name = value.trim();
  switch (name.toLowerCase()) {
    case '':
    case 'load':
      return { kind: 'load' };
    case 'manual':
      return { kind: 'manual' };
    case 'intersect':
      return { kind: 'intersect' };
    case 'submit':
      return { kind: 'submit', once };
    default:
      // As written: DOM event names are case-sensitive (`myEvent`).
      return { kind: 'event', eventName: name, once };
  }
}

// ---------------------------------------------------------------------------
// <lse-intent>
// ---------------------------------------------------------------------------

export class LSEIntentElement extends HTMLElement {
  static observedAttributes = ['src', 'disabled', 'trigger', 'allow'];

  /**
   * The renderer that turns a node into English hyperscript for a host's `evaluate`.
   * Defaults to the `render` of whichever `LokaScriptSemantic*` bundle the page loaded.
   */
  static render: ((node: SemanticNode, language: string) => string) | null = null;

  private _plan: IntentPlan | null = null;
  private _planDiagnostics: IRDiagnostic[] = [];
  private _runDiagnostics: IRDiagnostic[] = [];
  private _abortController: AbortController | null = null;
  private _triggerCleanup: (() => void) | null = null;
  private _initInFlight = false;
  private _initPending = false;
  /** Counts reads of the JSON: a read that is no longer the latest is dropped. */
  private _generation = 0;
  private _parsed: (() => void) | null = null;

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  connectedCallback(): void {
    // Created by the HTML parser from a start tag, the element connects before
    // its children exist: with the scripts loaded ahead of the markup there was
    // no JSON to read yet, and the element did nothing, without a word. Wait
    // for the document then.
    if (
      document.readyState === 'loading' &&
      !this.hasAttribute('src') &&
      !this.querySelector('script[type="application/lse+json"]')
    ) {
      const parsed = (): void => {
        this._parsed = null;
        if (this.isConnected) void this._initialize();
      };
      this._parsed = parsed;
      document.addEventListener('DOMContentLoaded', parsed, { once: true });
      return;
    }
    void this._initialize();
  }

  disconnectedCallback(): void {
    if (this._parsed) document.removeEventListener('DOMContentLoaded', this._parsed);
    this._parsed = null;
    this._generation++;
    this._abortController?.abort();
    this._abortController = null;
    this._tearDownTrigger();
  }

  attributeChangedCallback(): void {
    // Before connect (or before the document is parsed), connectedCallback
    // reads the final attributes once.
    if (!this.isConnected || this._parsed) return;
    void this._initialize();
  }

  // ── Public accessors ───────────────────────────────────────────────────────

  /** The node read from the JSON, or null if there is none or it was refused. */
  get node(): SemanticNode | null {
    return this._plan?.node ?? null;
  }

  /** Diagnostics of the last read and the last run, as a copy. */
  get diagnostics(): readonly IRDiagnostic[] {
    return [...this._planDiagnostics, ...this._runDiagnostics];
  }

  /**
   * Read the JSON again and run it now, whatever the trigger. For
   * `trigger="manual"`, and after changing the inline JSON. A `disabled`
   * element does nothing.
   */
  async refresh(): Promise<void> {
    if (this.hasAttribute('disabled')) return;
    const plan = await this._prepare();
    if (plan) await this._execute(plan);
  }

  // ── Private: initialization and trigger dispatch ───────────────────────────

  /**
   * One initialization at a time. A call during one marks a re-run, so the
   * final attribute and JSON state is what ends up wired.
   */
  private async _initialize(): Promise<void> {
    if (this._initInFlight) {
      // What is being read is out of date: drop it (a pending fetch included).
      this._initPending = true;
      this._generation++;
      this._abortController?.abort();
      return;
    }
    this._initInFlight = true;
    try {
      await this._doInitialize();
      while (this._initPending) {
        this._initPending = false;
        await this._doInitialize();
      }
    } finally {
      this._initInFlight = false;
    }
  }

  private async _doInitialize(): Promise<void> {
    this._tearDownTrigger();
    if (this.hasAttribute('disabled')) return;

    const plan = await this._prepare();
    // Disconnected while a fetch was pending: disconnectedCallback has cleaned up.
    if (!plan || !this.isConnected) return;

    const spec = this._triggerFor(plan);
    switch (spec.kind) {
      case 'load':
        await this._execute(plan);
        return;
      case 'manual':
        return;
      case 'intersect':
        this._wireIntersect(plan);
        return;
      case 'submit':
        this._wireSubmit(plan, spec.once);
        return;
      case 'event':
        this._wireEvent(plan, spec.eventName, spec.once);
        return;
    }
  }

  private _triggerFor(plan: IntentPlan): TriggerSpec {
    const once = plan.trigger?.once ?? false;
    const attr = this.getAttribute('trigger');
    if (attr !== null) return parseTriggerValue(attr, once);
    if (plan.trigger) return parseTriggerValue(plan.trigger.event, once);
    return { kind: 'load' };
  }

  // ── Private: trigger wiring ────────────────────────────────────────────────

  private _tearDownTrigger(): void {
    this._triggerCleanup?.();
    this._triggerCleanup = null;
  }

  private _wireEvent(plan: IntentPlan, eventName: string, once: boolean): void {
    const handler = (event: Event): void => void this._execute(plan, event);
    this.addEventListener(eventName, handler, { once });
    this._triggerCleanup = () => this.removeEventListener(eventName, handler);
  }

  private _wireSubmit(plan: IntentPlan, once: boolean): void {
    const form = this.closest('form');
    if (!form) {
      this._refuse([
        {
          severity: 'error',
          code: 'NO_ANCESTOR_FORM',
          message: 'trigger="submit" needs an ancestor <form>; there is none.',
        },
      ]);
      return;
    }
    const handler = (event: Event): void => {
      // Synchronously, so the form does not navigate while the script runs.
      event.preventDefault();
      void this._execute(plan, event);
    };
    form.addEventListener('submit', handler, { once });
    this._triggerCleanup = () => form.removeEventListener('submit', handler);
  }

  private _wireIntersect(plan: IntentPlan): void {
    if (typeof IntersectionObserver === 'undefined') {
      this._refuse([
        {
          severity: 'error',
          code: 'NO_INTERSECTION_OBSERVER',
          message: 'trigger="intersect" needs IntersectionObserver, which this environment lacks.',
        },
      ]);
      return;
    }
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      void this._execute(plan);
    });
    observer.observe(this);
    this._triggerCleanup = () => observer.disconnect();
  }

  // ── Private: prepare + execute ─────────────────────────────────────────────

  /**
   * Read and plan the JSON. Emits `lse:validated` and returns the plan, or
   * emits `lse:error` and returns null.
   */
  private async _prepare(): Promise<IntentPlan | null> {
    this._plan = null;
    this._planDiagnostics = [];
    this._runDiagnostics = [];
    this._showError(false);

    const generation = ++this._generation;
    const raw = await this._readJSON();
    // A newer read started (the attributes changed, or refresh() was called
    // again) while this one waited: the newer one reports.
    if (generation !== this._generation) return null;
    if (raw === undefined) return null;

    const allow = this.getAttribute('allow');
    const plan = planIntent(raw, {
      schemaFor: action => intentRegistry.get(action),
      ...(allow !== null ? { allow: new Set(allow.split(/[\s,]+/).filter(Boolean)) } : {}),
    });
    if (!plan.ok) {
      this._refuse(plan.diagnostics);
      return null;
    }
    this._plan = plan;
    this._planDiagnostics = plan.diagnostics;
    this._emit('lse:validated', { node: plan.node, diagnostics: [...plan.diagnostics] });
    return plan;
  }

  /** A refusal: nothing runs, and the page is told. */
  private _refuse(diagnostics: IRDiagnostic[], error: Error | null = null): void {
    this._plan = null;
    this._planDiagnostics = diagnostics;
    this._showError(true);
    this._emit('lse:error', { diagnostics: [...diagnostics], error });
  }

  /**
   * Run the plan as one script. Emits `lse:executed`, or `lse:error` when there
   * is no host or renderer, the node does not render, the script fails, or it
   * is still running after `timeout` milliseconds (it is not interrupted).
   */
  private async _execute(plan: IntentPlan, event?: Event): Promise<void> {
    const fail = (code: string, message: string, error: Error | null = null): void => {
      this._runDiagnostics = [{ severity: 'error', code, message }];
      this._showError(true);
      this._emit('lse:error', { diagnostics: [...this.diagnostics], error });
    };
    this._runDiagnostics = [];

    const runtime = getRuntime();
    if ('code' in runtime) return fail(runtime.code, runtime.message);

    let script: string;
    try {
      script = runtime.render(plan.body, 'en');
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      return fail('RENDER_ERROR', error.message, error);
    }

    const dropped = droppedValues(plan.body, script);
    if (dropped.length > 0) {
      return fail(
        'RENDER_DROPPED_VALUE',
        `the rendered script (${script}) lacks ${dropped.join(', ')}: the renderer has no place for a role this intent uses`
      );
    }

    const timeoutMs = parseInt(this.getAttribute('timeout') ?? '', 10) || DEFAULT_TIMEOUT_MS;
    const context: Record<string, unknown> = { me: this };
    if (event) context['event'] = event;
    const run = await withTimeout(() => runtime.evaluate(script, context), timeoutMs);
    if (!run.ok) {
      return fail(
        run.timedOut ? 'EXECUTION_TIMEOUT' : 'EXECUTION_ERROR',
        run.error?.message ?? 'Unknown execution error',
        run.error ?? null
      );
    }
    this._showError(false);
    this._emit('lse:executed', { node: plan.node, script, result: run.result });
  }

  /** The intent's JSON; undefined when there is none or it could not be read (reported). */
  private async _readJSON(): Promise<unknown> {
    const src = this.getAttribute('src');
    if (src) {
      this._abortController?.abort();
      this._abortController = new AbortController();
      try {
        const response = await fetch(src, { signal: this._abortController.signal });
        if (!response.ok) {
          this._fetchError(`Failed to fetch ${src}: HTTP ${response.status}`);
          return undefined;
        }
        return (await response.json()) as unknown;
      } catch (err) {
        // Aborted: the element was disconnected, or `src` changed.
        if (err instanceof Error && err.name === 'AbortError') return undefined;
        const error = err instanceof Error ? err : undefined;
        this._fetchError(`Failed to fetch ${src}${error ? ': ' + error.message : ''}`, error);
        return undefined;
      }
    }

    const script = this.querySelector('script[type="application/lse+json"]');
    if (!script) {
      this._refuse([
        {
          severity: 'error',
          code: 'NO_INTENT',
          message:
            'no intent to read: <lse-intent> needs a src attribute or a <script type="application/lse+json"> child.',
        },
      ]);
      return undefined;
    }
    try {
      return JSON.parse(script.textContent ?? '') as unknown;
    } catch {
      this._refuse([
        { severity: 'error', code: 'INVALID_JSON', message: 'Inline JSON is not valid JSON' },
      ]);
      return undefined;
    }
  }

  private _fetchError(message: string, error?: Error): void {
    this._refuse([{ severity: 'error', code: 'FETCH_ERROR', message }], error ?? null);
  }

  /** Show or hide the child marked `slot="error"`, if there is one. */
  private _showError(shown: boolean): void {
    const marked = this.querySelector('[slot="error"]');
    if (marked instanceof HTMLElement) marked.style.display = shown ? '' : 'none';
  }

  private _emit(type: string, detail: Record<string, unknown>): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }
}
