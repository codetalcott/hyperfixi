/**
 * Template-component registry — builds a Custom Element class for each
 * `<template component="tag-name">` element and registers it via
 * `customElements.define`.
 *
 * v2 render model:
 *   - `${expr}` interpolation against `attrs`, with `^var` references rewritten
 *     to call `reactive.readCaret(host, name)` so reads are tracked
 *   - The render is wrapped in `reactive.createEffect(...)` so when any
 *     tracked dep (e.g. `^count`) changes, the template re-stamps and the
 *     runtime re-processes the new subtree
 *   - Per-instance `_=` init script (from `<template _="...">` or
 *     `<script type="text/hyperscript-template" _="...">`) is transferred
 *     to the host element so the runtime processes it once via its standard
 *     init mechanism
 *
 * Deferred to v2.1+:
 *   - `attrs.X` available inside hyperscript expressions (currently only
 *     resolves inside `${...}` interpolation)
 *   - Style scoping (@scope)
 *   - Isolated dom-scope attribute for `^var` boundaries
 *   - `#if` / `#for` / `#else` / `#end` template directives (Track 2B)
 */

import type { RuntimeLike } from './types';
import { substituteSlots } from './slots';
import { createAttrsProxy } from './attrs';
import { reactive } from '@hyperfixi/reactivity';
import { hyperscript } from '@hyperfixi/core';
import { parseTemplate, renderTemplate, type TemplateNode } from './template-ast';

/**
 * Module-level registry of tag names already defined. `customElements.define`
 * throws on duplicate registration, so we dedupe here.
 */
const REGISTERED = new Set<string>();

interface RegistryOptions {
  runtime?: RuntimeLike;
}

/**
 * Rewrite `^name` references in an expression so they become calls to a
 * tracked-read helper. Property access continues naturally:
 *
 *   ^count        → __c('count')
 *   ^user.name    → __c('user').name
 *   ^items.length → __c('items').length
 *
 * Only matches `^` followed by an identifier — bitwise XOR (`a ^ b`) where
 * `b` starts with a digit/punctuation is unaffected. Bitwise XOR with a
 * named operand inside an interpolation is rare enough not to worry about.
 */
function rewriteCaretRefs(expr: string): string {
  return expr.replace(/\^([a-zA-Z_][a-zA-Z0-9_]*)/g, "__c('$1')");
}

/**
 * Evaluate a `${...}` expression. Supports:
 *   - `attrs.X` — read from the component's attrs proxy
 *   - `^name` and `^name.path` — read DOM-scoped vars via the reactivity graph
 *
 * Errors silently return empty string (matches upstream tolerance).
 */
function evalInterpolation(
  expr: string,
  scope: Record<string, unknown>,
  hostElement: Element
): unknown {
  const rewritten = rewriteCaretRefs(expr);
  const fn = new Function(
    ...Object.keys(scope),
    '__c',
    `"use strict"; try { return (${rewritten}); } catch (e) { return undefined; }`
  );
  return fn(...Object.values(scope), (name: string) => reactive.readCaret(hostElement, name));
}

/**
 * Stamp a static text block by replacing each `${...}` with the stringified
 * result of `evalInterpolation`.
 */
function interpolate(source: string, scope: Record<string, unknown>, hostElement: Element): string {
  return source.replace(/\$\{([^}]+)\}/g, (_, expr) => {
    try {
      const result = evalInterpolation(expr.trim(), scope, hostElement);
      return result == null ? '' : String(result);
    } catch {
      return '';
    }
  });
}

/**
 * Render a parsed template AST (with `#if`/`#for` directives) against a scope.
 * Routes both `${...}` interpolation and bare-expression evaluation through
 * the same caret-aware path so `^var` works uniformly.
 */
function renderAst(
  nodes: TemplateNode[],
  scope: Record<string, unknown>,
  hostElement: Element
): string {
  return renderTemplate(
    nodes,
    scope,
    (text, s) => interpolate(text, s, hostElement),
    (expr, s) => evalInterpolation(expr.trim(), s, hostElement)
  );
}

/**
 * Register a single `<template component="tag-name">` element.
 * Idempotent: returns false (without error) if the tag is already registered.
 */
export function registerTemplateComponent(
  templateEl: HTMLTemplateElement,
  options: RegistryOptions = {}
): boolean {
  const tagName = templateEl.getAttribute('component');
  if (!tagName || !tagName.includes('-')) {
    if (typeof console !== 'undefined') {
      console.error(
        `[@hyperfixi/components] <template component="${tagName}"> must contain a dash`
      );
    }
    return false;
  }
  if (REGISTERED.has(tagName) || customElements.get(tagName)) {
    return false;
  }
  REGISTERED.add(tagName);

  const { html: templateSource, init: initSource } = readTemplate(templateEl);
  const runtime = options.runtime;

  // Parse the template AST once at registration time. Each instance reuses
  // this AST and re-renders against its own scope.
  const templateAst = parseTemplate(templateSource);

  class TemplateComponent extends HTMLElement {
    private _initialized = false;
    private _cleanupFns: Array<() => void> = [];

    connectedCallback() {
      if (this._initialized) return;
      this._initialized = true;

      // Capture slot content (innerHTML) BEFORE we stamp the template, so
      // children written in the page get inserted into `<slot/>` placeholders.
      const slotContent = this.innerHTML;
      this.innerHTML = '';

      const attrs = createAttrsProxy(this);

      // Slot substitution happens on the source HTML before AST rendering, so
      // <slot/> placeholders are replaced once per instance against the AST's
      // serialized output. (Slots aren't reactive — content is stamped at
      // first render and stays stable across `^var` re-renders.)
      const renderBody = (): string => {
        const rendered = renderAst(templateAst, { attrs }, this);
        return substituteSlots(rendered, slotContent);
      };

      // Run init `_=` once via hyperscript.eval. We do NOT put it on the host
      // as an attribute — that would cause every subsequent reactive re-render
      // (which calls hyperscript.process(this)) to re-run init and reset state.
      if (initSource) {
        try {
          void hyperscript.eval(initSource, this);
        } catch (err) {
          if (typeof console !== 'undefined') {
            console.error('[@hyperfixi/components] init script failed:', err);
          }
        }
      }

      // Synchronous first render so callers see content immediately on
      // appendChild — matches v1 semantics. Tracking-aware re-renders happen
      // through the reactive effect below.
      // Note: `hyperscript.process` is the singleton API entry point that
      // compiles + binds `_=` attributes (the per-runtime `Runtime` class
      // does not expose process directly).
      const renderOnce = (): void => {
        this.innerHTML = renderBody();
        try {
          hyperscript.process(this);
        } catch (err) {
          if (typeof console !== 'undefined') {
            console.error('[@hyperfixi/components] hyperscript.process failed:', err);
          }
        }
      };
      renderOnce();

      // Reactive effect: any `^var` read during render is tracked, and
      // writes to those vars trigger a re-stamp + re-process. Effect
      // initializes via microtask; first run sees same content (Object.is
      // skips handler) but records dependencies for subsequent writes.
      const stopEffect = reactive.createEffect(() => renderBody(), renderOnce, this);
      this._cleanupFns.push(stopEffect);

      // Register cleanup so disconnect fires teardown of any hyperscript
      // observers bound to children. Uses core's CleanupRegistry via the
      // runtime passed at install time.
      if (runtime) {
        try {
          runtime.getCleanupRegistry().registerCustom(
            this,
            () => {
              for (const fn of this._cleanupFns) {
                try {
                  fn();
                } catch {
                  /* ignore */
                }
              }
              this._cleanupFns = [];
            },
            'template-component'
          );
        } catch {
          /* getCleanupRegistry missing — skip */
        }
      }
    }

    disconnectedCallback() {
      this._initialized = false;
      for (const fn of this._cleanupFns) {
        try {
          fn();
        } catch {
          /* ignore */
        }
      }
      this._cleanupFns = [];
    }
  }

  try {
    customElements.define(tagName, TemplateComponent);
    return true;
  } catch (err) {
    REGISTERED.delete(tagName);
    if (typeof console !== 'undefined') {
      console.error(`[@hyperfixi/components] customElements.define("${tagName}") failed:`, err);
    }
    return false;
  }
}

/**
 * Read a template definition: extract the body HTML and (if present) the
 * per-instance init script. Init source is read from `_=` (preferred) or
 * `data-init` (the `<script>`-form converter sets this in scan.ts).
 */
function readTemplate(templateEl: HTMLTemplateElement): { html: string; init: string | null } {
  const init = templateEl.getAttribute('_') ?? templateEl.getAttribute('data-init');
  let html: string;
  if (templateEl.content && typeof templateEl.content.childNodes !== 'undefined') {
    const container = document.createElement('div');
    for (const child of Array.from(templateEl.content.childNodes)) {
      container.appendChild(child.cloneNode(true));
    }
    html = container.innerHTML;
  } else {
    html = templateEl.innerHTML;
  }
  return { html, init };
}

/**
 * Clear the registered-tags set. Intended for test isolation only — custom
 * element registrations cannot be un-defined, so this only affects our
 * idempotency check, not the real registry.
 */
export function _resetRegisteredForTest(): void {
  REGISTERED.clear();
}
