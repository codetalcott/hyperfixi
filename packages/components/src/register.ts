/**
 * Template-component registry — builds a Custom Element class for each
 * `<template component="tag-name">` element and registers it via
 * `customElements.define`.
 *
 * v1 render model: simple `${expr}` interpolation against the component's
 * `attrs` proxy and local state map. Hyperscript inside the rendered content
 * is processed via the runtime if available (best-effort).
 *
 * Deferred to v2:
 *   - Reactive re-render (effect wrapping the render fn)
 *   - Full `render` command reuse (requires runtime availability at stamp time)
 *   - Style scoping (@scope)
 *   - Isolated dom-scope attribute for `^var` boundaries
 */

import type { RuntimeLike } from './types';
import { substituteSlots } from './slots';
import { createAttrsProxy } from './attrs';

/**
 * Module-level registry of tag names already defined. `customElements.define`
 * throws on duplicate registration, so we dedupe here.
 */
const REGISTERED = new Set<string>();

interface RegistryOptions {
  runtime?: RuntimeLike;
}

/**
 * Simple `${expression}` interpolation. Evaluates the expression against a
 * scope object that exposes `attrs` and any additional named values.
 *
 * Not a full hyperscript expression evaluator — just property chains and
 * simple JS. Users who need computation should use hyperscript inside the
 * rendered markup.
 */
function interpolate(source: string, scope: Record<string, unknown>): string {
  return source.replace(/\$\{([^}]+)\}/g, (_, expr) => {
    try {
      // Build evaluator: Function('{ attrs, ... }', `return (${expr})`).
      // Only the known scope keys are available; no `globalThis` / `window`.
      const fn = new Function(
        ...Object.keys(scope),
        `"use strict"; try { return (${expr}); } catch (e) { return ""; }`
      );
      const result = fn(...Object.values(scope));
      return result == null ? '' : String(result);
    } catch {
      return '';
    }
  });
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

  // Capture the template source once. The template content lives in its
  // `content` DocumentFragment; serialize back to HTML.
  const templateSource = templateElToSource(templateEl);
  const runtime = options.runtime;

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
      const withSlots = substituteSlots(templateSource, slotContent);
      const rendered = interpolate(withSlots, { attrs });
      this.innerHTML = rendered;

      // Let the runtime process any hyperscript attributes inside the rendered
      // content. Best-effort: if runtime doesn't expose .process, we rely on
      // MutationObserver-driven processing in the core attribute-processor.
      if (runtime?.process) {
        try {
          void runtime.process(this);
        } catch (err) {
          if (typeof console !== 'undefined') {
            console.error('[@hyperfixi/components] runtime.process failed:', err);
          }
        }
      }

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
 * Extract the template source HTML string. Prefers `.content` (the standard
 * `HTMLTemplateElement.content` DocumentFragment) so scripts/styles inside the
 * template aren't executed while scanning. Falls back to `.innerHTML` if the
 * element isn't a real template (e.g. a stub in happy-dom older versions).
 */
function templateElToSource(templateEl: HTMLTemplateElement): string {
  if (templateEl.content && typeof templateEl.content.childNodes !== 'undefined') {
    const container = document.createElement('div');
    for (const child of Array.from(templateEl.content.childNodes)) {
      container.appendChild(child.cloneNode(true));
    }
    return container.innerHTML;
  }
  return templateEl.innerHTML;
}

/**
 * Clear the registered-tags set. Intended for test isolation only — custom
 * element registrations cannot be un-defined, so this only affects our
 * idempotency check, not the real registry.
 */
export function _resetRegisteredForTest(): void {
  REGISTERED.clear();
}
