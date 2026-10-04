/**
 * <lse-intent> Custom Element
 *
 * Accepts LSE protocol JSON via an inline <script type="application/lse+json">
 * child (or a `src` attribute), validates it, and executes it on the page's hyperscript
 * host according to a declarative trigger model. The host is `@hyperfixi/engine`
 * (`hyperfixi-hs.js`) or upstream `_hyperscript`, which run the node rendered to English
 * hyperscript by a `LokaScriptSemantic*` bundle. Degrades gracefully when there is no host
 * or no renderer.
 *
 * ## Trigger modes
 *
 * The `trigger` attribute controls when validation + execution fires:
 *
 * - `load`      (default) — fire immediately on `connectedCallback`
 * - `click`     — fire on click anywhere inside the element
 * - `submit`    — fire on submit of the closest ancestor `<form>`; preventDefault is called synchronously
 * - `intersect` — fire when the element scrolls into view (IntersectionObserver; one-shot)
 * - `manual`    — never fire automatically; caller must invoke `.refresh()`
 * - (any other value) — treated as a DOM event name, wired via addEventListener on the element
 *
 * If no `trigger` attribute is set, the element inspects the JSON wire-format
 * `trigger.event` sugar field (protocol/spec/wire-format.md lines 441–474) and
 * uses it as the event name. If neither is present, defaults to `load`.
 *
 * @example
 * ```html
 * <!-- Load on connect (default) -->
 * <lse-intent>
 *   <script type="application/lse+json">
 *     {"action":"toggle","roles":{"patient":{"type":"selector","value":".active"}}}
 *   </script>
 * </lse-intent>
 *
 * <!-- Fire on click -->
 * <lse-intent trigger="click">
 *   <button slot="trigger">Toggle</button>
 *   <script type="application/lse+json">
 *     {"action":"toggle","roles":{"patient":{"type":"selector","value":".active"}}}
 *   </script>
 * </lse-intent>
 *
 * <!-- Auto-wire from JSON trigger.event sugar -->
 * <lse-intent>
 *   <button>Toggle</button>
 *   <script type="application/lse+json">
 *     {"action":"toggle","roles":{"patient":{"type":"selector","value":".active"}},"trigger":{"event":"click"}}
 *   </script>
 * </lse-intent>
 *
 * <!-- Manual (caller drives refresh) -->
 * <lse-intent trigger="manual" id="my-intent">...</lse-intent>
 * <script>document.getElementById('my-intent').refresh()</script>
 *
 * <!-- Fetch from URL, fire on intersect -->
 * <lse-intent src="/intents/toggle-sidebar.json" trigger="intersect"></lse-intent>
 * ```
 *
 * Events dispatched on the element:
 * - `lse:validated`  — after schema check, before execution  (detail: { node, diagnostics })
 * - `lse:executed`   — after successful execution             (detail: { node, result })
 * - `lse:error`      — on validation or execution failure     (detail: { diagnostics, error })
 */

import { fromProtocolJSON, validateProtocolJSON } from '@lokascript/intent';
import type { SemanticNode, IRDiagnostic, CommandSchema, SemanticValue } from '@lokascript/intent';
import { intentRegistry } from './schema-registry.js';
import { sandboxed } from './sandbox.js';

// ---------------------------------------------------------------------------
// Runtime bridge — resolved lazily so the element works without a hyperscript host
// ---------------------------------------------------------------------------

/**
 * How a prepared node runs. The host is a hyperscript engine in upstream `_hyperscript`'s
 * shape — `@hyperfixi/engine` (`hyperfixi-hs.js`, `window.hyperfixi` / `window._hyperscript`)
 * or upstream itself — with `evaluate(source, context)`. The node is rendered to English
 * hyperscript text (`toggle .active on #sidebar`) and evaluated with the element as `me`.
 * The renderer is `@lokascript/semantic`'s `render(node, 'en')`, read from whichever
 * `LokaScriptSemantic*` bundle the page loaded (or set on `LSEIntentElement.render`). This
 * is the `lse_to_hyperscript` direction: text is the interchange.
 *
 * (`@hyperfixi/core` 3.x also offered `window.hyperfixi.evalLSENode(node, element)`, which ran
 * the node through core's own AST. No shipped bundle has it since `hyperfixi.js` became the
 * engine's file, so the element no longer looks for it.)
 */
interface LSERuntime {
  run(node: SemanticNode, element: Element): Promise<unknown>;
}

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

/**
 * A wire-format `literal` with a string value and no `dataType` is a string: core's AST
 * path always read it so, and rendered without the type it would come out bare
 * (`put Hello into #out`, a variable read). Stamp the type on the wire JSON before it
 * becomes a node, so both execution paths see the same intent.
 */
function withLiteralTypes(raw: Record<string, unknown>): Record<string, unknown> {
  const roles = raw['roles'];
  if (!roles || typeof roles !== 'object' || Array.isArray(roles)) return raw;
  const typed: Record<string, unknown> = {};
  for (const [role, value] of Object.entries(roles as Record<string, unknown>)) {
    const v = value as { type?: unknown; value?: unknown; dataType?: unknown } | null;
    typed[role] =
      v && v.type === 'literal' && typeof v.value === 'string' && v.dataType === undefined
        ? { ...v, dataType: 'string' }
        : value;
  }
  const body = raw['body'];
  return {
    ...raw,
    roles: typed,
    ...(Array.isArray(body)
      ? {
          body: body.map(b =>
            b && typeof b === 'object' ? withLiteralTypes(b as Record<string, unknown>) : b
          ),
        }
      : {}),
  };
}

/** Why no runtime was found, for the diagnostic. */
type RuntimeLookup =
  { runtime: LSERuntime } | { runtime: null; code: 'NO_RUNTIME' | 'NO_RENDERER'; message: string };

function getRuntime(): RuntimeLookup {
  const w = globalThis as Record<string, unknown>;
  const host = (w['hyperfixi'] ?? w['_hyperscript']) as HostLike | undefined;
  if (!host || typeof host.evaluate !== 'function') {
    return {
      runtime: null,
      code: 'NO_RUNTIME',
      message:
        'hyperscript host not found. Load hyperfixi-hs.js (and a LokaScriptSemantic bundle) before intent-element.iife.js to enable execution.',
    };
  }
  const render = findRenderer();
  if (render) {
    const evaluate = host.evaluate;
    return {
      runtime: {
        run: (node, element) => Promise.resolve(evaluate(render(node, 'en'), { me: element })),
      },
    };
  }
  return {
    runtime: null,
    code: 'NO_RENDERER',
    message:
      'hyperscript host found but no LSE renderer: load a LokaScriptSemantic bundle (browser-en.en.global.js) so the intent can be rendered to hyperscript, or set LSEIntentElement.render.',
  };
}

// ---------------------------------------------------------------------------
// Trigger resolution
// ---------------------------------------------------------------------------

type TriggerSpec =
  | { kind: 'load' }
  | { kind: 'manual' }
  | { kind: 'intersect' }
  | { kind: 'submit' }
  | { kind: 'event'; eventName: string };

function parseTriggerValue(value: string): TriggerSpec {
  const v = value.trim().toLowerCase();
  if (v === '' || v === 'load') return { kind: 'load' };
  if (v === 'manual') return { kind: 'manual' };
  if (v === 'intersect') return { kind: 'intersect' };
  if (v === 'submit') return { kind: 'submit' };
  return { kind: 'event', eventName: v };
}

// ---------------------------------------------------------------------------
// <lse-intent>
// ---------------------------------------------------------------------------

interface PreparedNode {
  node: SemanticNode;
  raw: Record<string, unknown>;
}

export class LSEIntentElement extends HTMLElement {
  static observedAttributes = ['src', 'disabled', 'timeout', 'trigger'];

  /**
   * The renderer that turns a node into English hyperscript for a host's `evaluate`.
   * Defaults to the `render` of whichever `LokaScriptSemantic*` bundle the page loaded.
   */
  static render: ((node: SemanticNode, language: string) => string) | null = null;

  private _node: SemanticNode | null = null;
  private _diagnostics: IRDiagnostic[] = [];
  private _abortController: AbortController | null = null;
  private _triggerCleanup: (() => void) | null = null;
  private _initInFlight = false;
  private _initPending = false;

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  connectedCallback(): void {
    void this._initialize();
  }

  disconnectedCallback(): void {
    this._abortController?.abort();
    this._abortController = null;
    this._tearDownTrigger();
  }

  attributeChangedCallback(name: string, _old: string | null, _new: string | null): void {
    if (name !== 'src' && name !== 'disabled' && name !== 'trigger') return;
    // Only react to attribute changes when connected. Before connect, the
    // connectedCallback will run _initialize once with the final attribute
    // state. This avoids races between setAttribute() calls that happen
    // before the element is appended to the document.
    if (!this.isConnected) return;
    void this._initialize();
  }

  // ── Public accessors ───────────────────────────────────────────────────────

  /** The parsed SemanticNode, or null if not yet loaded / invalid. */
  get node(): SemanticNode | null {
    return this._node;
  }

  /** Diagnostics from the last validation attempt. Returns a snapshot copy. */
  get diagnostics(): readonly IRDiagnostic[] {
    return [...this._diagnostics];
  }

  /**
   * Re-run preparation and execution explicitly. Useful after updating the
   * inline JSON, and required when `trigger="manual"`. Always executes
   * regardless of trigger mode.
   */
  async refresh(): Promise<void> {
    const prepared = await this._prepare();
    if (!prepared) return;
    await this._execute(prepared.node);
  }

  // ── Private: initialization and trigger dispatch ───────────────────────────

  /**
   * Serialize concurrent `_initialize` calls. If one is already running,
   * mark a re-init as pending and return. The in-flight init will re-run
   * once after it finishes so the final attribute/JSON state is reflected.
   */
  private async _initialize(): Promise<void> {
    if (this._initInFlight) {
      this._initPending = true;
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
    // Always tear down any existing trigger wiring before re-initializing.
    this._tearDownTrigger();

    if (this.hasAttribute('disabled')) return;

    const prepared = await this._prepare();
    if (!prepared) return;

    // The element may have been disconnected while _prepare() was awaiting
    // a fetch or JSON parse. If so, don't wire triggers — disconnectedCallback
    // already ran cleanup.
    if (!this.isConnected) return;

    const spec = this._resolveTriggerSpec(prepared.raw);

    switch (spec.kind) {
      case 'load':
        await this._execute(prepared.node);
        return;
      case 'manual':
        return;
      case 'intersect':
        this._wireIntersect(prepared.node);
        return;
      case 'submit':
        this._wireSubmit(prepared.node);
        return;
      case 'event':
        this._wireEvent(prepared.node, spec.eventName);
        return;
    }
  }

  private _resolveTriggerSpec(raw: Record<string, unknown>): TriggerSpec {
    // 1. Explicit trigger attribute wins.
    const attr = this.getAttribute('trigger');
    if (attr !== null) {
      return parseTriggerValue(attr);
    }

    // 2. Wire-format trigger.event sugar in the JSON.
    const triggerObj = raw['trigger'];
    if (triggerObj && typeof triggerObj === 'object' && !Array.isArray(triggerObj)) {
      const eventName = (triggerObj as Record<string, unknown>)['event'];
      if (typeof eventName === 'string' && eventName.length > 0) {
        return parseTriggerValue(eventName);
      }
    }

    // 3. Default.
    return { kind: 'load' };
  }

  // ── Private: trigger wiring ────────────────────────────────────────────────

  private _tearDownTrigger(): void {
    if (this._triggerCleanup) {
      this._triggerCleanup();
      this._triggerCleanup = null;
    }
  }

  private _wireEvent(node: SemanticNode, eventName: string): void {
    const handler = (_ev: Event): void => {
      void this._execute(node);
    };
    this.addEventListener(eventName, handler);
    this._triggerCleanup = () => this.removeEventListener(eventName, handler);
  }

  private _wireSubmit(node: SemanticNode): void {
    const form = this.closest('form');
    if (!form) {
      this._diagnostics.push({
        severity: 'warning',
        code: 'NO_ANCESTOR_FORM',
        message: 'trigger="submit" requires an ancestor <form>; none found.',
      });
      return;
    }
    const handler = (ev: Event): void => {
      // preventDefault synchronously so the form does not navigate while
      // execution is in flight. If execution fails, the diagnostics event
      // still fires but the form stays on the page.
      ev.preventDefault();
      void this._execute(node);
    };
    form.addEventListener('submit', handler);
    this._triggerCleanup = () => form.removeEventListener('submit', handler);
  }

  private _wireIntersect(node: SemanticNode): void {
    if (typeof IntersectionObserver === 'undefined') {
      this._diagnostics.push({
        severity: 'warning',
        code: 'NO_INTERSECTION_OBSERVER',
        message:
          'trigger="intersect" requires IntersectionObserver; not available in this environment.',
      });
      return;
    }
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          // One-shot: disconnect after first intersection.
          observer.disconnect();
          void this._execute(node);
          return;
        }
      }
    });
    observer.observe(this);
    this._triggerCleanup = () => observer.disconnect();
  }

  // ── Private: prepare + execute ─────────────────────────────────────────────

  /**
   * Read the JSON, validate, deserialize, and emit `lse:validated`. Returns
   * the prepared node and raw JSON on success, or null on failure (in which
   * case `lse:error` has already been emitted).
   */
  private async _prepare(): Promise<PreparedNode | null> {
    const raw = await this._readJSON();
    if (raw === null) return null;

    // Validate wire format
    const wireDiags = validateProtocolJSON(raw);
    const hasErrors = wireDiags.some(d => d.severity === 'error');

    if (hasErrors) {
      this._diagnostics = wireDiags;
      this._node = null;
      this._showError();
      this._emit('lse:error', { diagnostics: wireDiags, error: null });
      return null;
    }

    // Deserialize to SemanticNode
    let node: SemanticNode;
    try {
      node = fromProtocolJSON(
        withLiteralTypes(raw) as unknown as Parameters<typeof fromProtocolJSON>[0]
      );
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this._diagnostics = [
        { severity: 'error', code: 'DESERIALIZE_ERROR', message: error.message },
      ];
      this._node = null;
      this._showError();
      this._emit('lse:error', { diagnostics: this._diagnostics, error });
      return null;
    }

    // Optional schema validation
    const schema = intentRegistry.get(node.action);
    const schemaDiags: IRDiagnostic[] = schema ? this._validateSchema(node, schema) : [];

    this._node = node;
    this._diagnostics = [...wireDiags, ...schemaDiags];
    this._emit('lse:validated', { node, diagnostics: [...this._diagnostics] });

    return { node, raw };
  }

  /**
   * Execute a prepared node on the page's hyperscript host. Emits `lse:executed`
   * on success or `lse:error` on failure. Safe to call multiple times.
   *
   * **Event-handler unwrap.** If the prepared node is an event-handler (from
   * either verbose wire format or compact `trigger` sugar), the element's
   * own `trigger` attribute has already wired the DOM event listener — the
   * wire-format event metadata is redundant at this point. We unwrap the
   * event-handler and execute each body command directly, rather than running
   * the event-handler node itself (which would attempt to re-wire a listener at
   * runtime, effectively discarding the body).
   */
  private async _execute(node: SemanticNode): Promise<void> {
    const lookup = getRuntime();
    if (!lookup.runtime) {
      // No host (or no renderer for one) — emit a warning but don't error.
      this._diagnostics.push({ severity: 'warning', code: lookup.code, message: lookup.message });
      return;
    }
    const runtime = lookup.runtime;

    // Unwrap event-handler nodes into their body commands. See the comment
    // above and examples/llm-native-todo-demo/README.md for the motivation.
    const executables: SemanticNode[] =
      node.kind === 'event-handler'
        ? [...((node as { body?: SemanticNode[] }).body ?? [])]
        : [node];

    const rawTimeout = this.getAttribute('timeout');
    const timeoutMs = rawTimeout !== null ? parseInt(rawTimeout, 10) || 5000 : 5000;

    // Execute body commands sequentially. A single failure stops the sequence
    // and emits `lse:error`; all successful commands before the failure have
    // already mutated the DOM.
    const results: unknown[] = [];
    for (const cmd of executables) {
      const result = await sandboxed(() => runtime.run(cmd, this), timeoutMs);
      if (result.ok) {
        results.push(result.result);
      } else {
        this._diagnostics.push({
          severity: 'error',
          code: result.timedOut ? 'EXECUTION_TIMEOUT' : 'EXECUTION_ERROR',
          message: result.error?.message ?? 'Unknown execution error',
        });
        this._showError();
        this._emit('lse:error', { diagnostics: [...this._diagnostics], error: result.error });
        return;
      }
    }

    this._emit('lse:executed', {
      node,
      // For single-body cases keep the legacy `result` shape (first/only value);
      // for multi-body cases expose the full array via `results` too.
      result: results.length === 1 ? results[0] : results,
      results,
    });
  }

  private async _readJSON(): Promise<Record<string, unknown> | null> {
    // 1. src attribute — fetch remote JSON
    const src = this.getAttribute('src');
    if (src) {
      this._abortController?.abort();
      this._abortController = new AbortController();
      try {
        const response = await fetch(src, { signal: this._abortController.signal });
        if (!response.ok) {
          this._emitFetchError(src, response.status);
          return null;
        }
        return (await response.json()) as Record<string, unknown>;
      } catch (err) {
        // AbortError means the element was disconnected — silently ignore
        if (err instanceof Error && err.name === 'AbortError') return null;
        this._emitFetchError(src, 0, err instanceof Error ? err : undefined);
        return null;
      }
    }

    // 2. Inline <script type="application/lse+json"> child
    const script = this.querySelector('script[type="application/lse+json"]');
    if (script) {
      try {
        return JSON.parse(script.textContent ?? '') as Record<string, unknown>;
      } catch {
        const diag: IRDiagnostic = {
          severity: 'error',
          code: 'INVALID_JSON',
          message: 'Inline JSON is not valid JSON',
        };
        this._diagnostics = [diag];
        this._showError();
        this._emit('lse:error', { diagnostics: [diag], error: null });
        return null;
      }
    }

    return null;
  }

  private _validateSchema(node: SemanticNode, schema: CommandSchema): IRDiagnostic[] {
    const diags: IRDiagnostic[] = [];
    for (const roleSpec of schema.roles) {
      const value = node.roles.get(roleSpec.role) as SemanticValue | undefined;

      if (roleSpec.required && !value) {
        diags.push({
          severity: 'error',
          code: 'MISSING_REQUIRED_ROLE',
          message: `Required role "${roleSpec.role}" is missing for command "${node.action}"`,
        });
        continue;
      }

      if (value && roleSpec.expectedTypes && roleSpec.expectedTypes.length > 0) {
        if (
          !roleSpec.expectedTypes.includes(value.type as (typeof roleSpec.expectedTypes)[number])
        ) {
          diags.push({
            severity: 'warning',
            code: 'UNEXPECTED_ROLE_TYPE',
            message: `Role "${roleSpec.role}" has type "${value.type}" but expected one of: ${roleSpec.expectedTypes.join(', ')}`,
          });
        }
      }
    }
    return diags;
  }

  private _showError(): void {
    const errorSlot = this.querySelector('[slot="error"]');
    if (errorSlot instanceof HTMLElement) {
      errorSlot.style.display = '';
    }
  }

  private _emit(type: string, detail: Record<string, unknown>): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  private _emitFetchError(src: string, status: number, error?: Error): void {
    const message = status
      ? `Failed to fetch ${src}: HTTP ${status}`
      : `Failed to fetch ${src}${error ? ': ' + error.message : ''}`;
    const diag: IRDiagnostic = { severity: 'error', code: 'FETCH_ERROR', message };
    this._diagnostics = [diag];
    this._showError();
    this._emit('lse:error', { diagnostics: [diag], error: error ?? null });
  }
}
