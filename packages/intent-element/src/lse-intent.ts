/**
 * <lse-intent> Custom Element
 *
 * Accepts LSE protocol JSON via an inline <script type="application/lse+json">
 * child (or a `src` attribute), validates it, and executes it via the hyperfixi
 * runtime. Degrades gracefully when the runtime is unavailable.
 *
 * @example
 * ```html
 * <!-- Inline JSON -->
 * <lse-intent>
 *   <script type="application/lse+json">
 *     {"action":"toggle","roles":{"patient":{"type":"selector","value":".active"}},"trigger":{"event":"click"}}
 *   </script>
 *   <button slot="trigger">Toggle</button>
 *   <span slot="error">Interaction unavailable</span>
 * </lse-intent>
 *
 * <!-- Attribute form -->
 * <lse-intent src="/intents/toggle-sidebar.json"></lse-intent>
 * ```
 *
 * Events dispatched on the element:
 * - `lse:validated`  — after schema check, before execution  (detail: { node, diagnostics })
 * - `lse:executed`   — after successful execution             (detail: { node, result })
 * - `lse:error`      — on validation or execution failure     (detail: { diagnostics, error })
 */

import { fromProtocolJSON, validateProtocolJSON } from '@lokascript/intent';
import type { SemanticNode, IRDiagnostic } from '@lokascript/intent';
import { intentRegistry } from './schema-registry.js';
import { sandboxed } from './sandbox.js';

// ---------------------------------------------------------------------------
// Runtime bridge — resolved lazily so the element works without @hyperfixi/core
// ---------------------------------------------------------------------------

interface HyperfiziRuntime {
  evalLSENode(node: SemanticNode, element?: Element): Promise<unknown>;
}

function getRuntime(): HyperfiziRuntime | null {
  const w = globalThis as Record<string, unknown>;
  const api = w['hyperfixi'] ?? w['_hyperscript'];
  if (api && typeof (api as Record<string, unknown>)['evalLSENode'] === 'function') {
    return api as HyperfiziRuntime;
  }
  return null;
}

// ---------------------------------------------------------------------------
// <lse-intent>
// ---------------------------------------------------------------------------

export class LSEIntentElement extends HTMLElement {
  static observedAttributes = ['src', 'disabled', 'timeout'];

  private _node: SemanticNode | null = null;
  private _diagnostics: IRDiagnostic[] = [];

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  connectedCallback(): void {
    void this._initialize();
  }

  attributeChangedCallback(name: string, _old: string | null, _new: string | null): void {
    if (name === 'src' || name === 'disabled') {
      void this._initialize();
    }
  }

  // ── Public accessors ───────────────────────────────────────────────────────

  /** The parsed SemanticNode, or null if not yet loaded / invalid. */
  get node(): SemanticNode | null {
    return this._node;
  }

  /** Diagnostics from the last validation attempt. */
  get diagnostics(): readonly IRDiagnostic[] {
    return this._diagnostics;
  }

  /** Re-run initialization (useful after updating the inline JSON). */
  async refresh(): Promise<void> {
    await this._initialize();
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private async _initialize(): Promise<void> {
    if (this.hasAttribute('disabled')) return;

    const raw = await this._readJSON();
    if (raw === null) return;

    // Validate wire format
    const wireDiags = validateProtocolJSON(raw);
    const hasErrors = wireDiags.some(d => d.severity === 'error');

    if (hasErrors) {
      this._diagnostics = wireDiags;
      this._node = null;
      this._showError();
      this._emit('lse:error', { diagnostics: wireDiags, error: null });
      return;
    }

    // Deserialize to SemanticNode
    let node: SemanticNode;
    try {
      node = fromProtocolJSON(raw as unknown as Parameters<typeof fromProtocolJSON>[0]);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this._diagnostics = [
        { severity: 'error', code: 'DESERIALIZE_ERROR', message: error.message },
      ];
      this._node = null;
      this._showError();
      this._emit('lse:error', { diagnostics: this._diagnostics, error });
      return;
    }

    // Optional schema validation
    const schema = intentRegistry.get(node.action);
    const schemaDiags: IRDiagnostic[] = schema ? this._validateSchema(node, schema) : [];

    this._node = node;
    this._diagnostics = [...wireDiags, ...schemaDiags];
    this._emit('lse:validated', { node, diagnostics: this._diagnostics });

    // Execute
    const runtime = getRuntime();
    if (!runtime) {
      // Runtime not loaded — emit a warning but don't error
      this._diagnostics.push({
        severity: 'warning',
        code: 'NO_RUNTIME',
        message:
          'hyperfixi runtime not found. Load hyperfixi.js before intent-element.iife.js to enable execution.',
      });
      return;
    }

    const timeoutMs = Number(this.getAttribute('timeout') ?? 5000);
    const result = await sandboxed(() => runtime.evalLSENode(node, this), timeoutMs);

    if (result.ok) {
      this._emit('lse:executed', { node, result: result.result });
    } else {
      this._diagnostics.push({
        severity: 'error',
        code: result.timedOut ? 'EXECUTION_TIMEOUT' : 'EXECUTION_ERROR',
        message: result.error?.message ?? 'Unknown execution error',
      });
      this._showError();
      this._emit('lse:error', { diagnostics: this._diagnostics, error: result.error });
    }
  }

  private async _readJSON(): Promise<Record<string, unknown> | null> {
    // 1. src attribute — fetch remote JSON
    const src = this.getAttribute('src');
    if (src) {
      try {
        const response = await fetch(src);
        if (!response.ok) {
          this._emitFetchError(src, response.status);
          return null;
        }
        return (await response.json()) as Record<string, unknown>;
      } catch (err) {
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

  private _validateSchema(
    node: SemanticNode,
    schema: import('@lokascript/intent').CommandSchema
  ): IRDiagnostic[] {
    const diags: IRDiagnostic[] = [];
    for (const roleSpec of schema.roles) {
      if (roleSpec.required && !node.roles.has(roleSpec.role)) {
        diags.push({
          severity: 'error',
          code: 'MISSING_REQUIRED_ROLE',
          message: `Required role "${roleSpec.role}" is missing for command "${node.action}"`,
        });
      }
    }
    return diags;
  }

  private _showError(): void {
    const errorSlot = this.querySelector('[slot="error"]');
    if (errorSlot) {
      (errorSlot as HTMLElement).style.display = '';
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
