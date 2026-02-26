/**
 * Toggleable Behavior — Imperative Implementation
 *
 * A behavior that toggles a CSS class on click.
 * Useful for accordions, dropdowns, and toggle buttons.
 *
 * Uses direct DOM APIs instead of compiling hyperscript source,
 * because `toggle .{cls}` template interpolation doesn't resolve
 * behavior parameters at runtime.
 *
 * @example
 * ```html
 * <button _="install Toggleable">Toggle</button>
 *
 * <button _="install Toggleable(cls: expanded, target: #menu)">Menu</button>
 * ```
 */

import { toggleableSchema } from '../schemas/toggleable.schema';
import type { LokaScriptInstance } from '../schemas/types';
import { resolveRuntime } from '../schemas/types';

// Re-export schema-derived values for backwards compatibility
export const toggleableSource = toggleableSchema.source;
export const toggleableMetadata = toggleableSchema;

/**
 * Imperative installer for Toggleable behavior.
 * Called directly by the runtime when `install Toggleable` is executed.
 */
function installToggleable(element: HTMLElement, params: Record<string, any>): void {
  const cls = params.cls || 'active';

  // Resolve target element
  let targetEl: HTMLElement = element;
  if (params.target && params.target !== 'me') {
    if (typeof params.target === 'string') {
      const found = document.querySelector(params.target);
      if (found instanceof HTMLElement) targetEl = found;
    } else if (params.target instanceof HTMLElement) {
      targetEl = params.target;
    }
  }

  element.addEventListener('click', () => {
    const wasOn = targetEl.classList.contains(cls);
    targetEl.classList.toggle(cls);
    targetEl.dispatchEvent(
      new CustomEvent(wasOn ? 'toggleable:off' : 'toggleable:on', { bubbles: true })
    );
  });
}

/**
 * Register the Toggleable behavior with LokaScript.
 * Uses imperative installer via synthetic behavior node.
 */
export async function registerToggleable(hyperfixi?: LokaScriptInstance): Promise<void> {
  const hf = hyperfixi || resolveRuntime();

  if (!hf) {
    throw new Error(
      'LokaScript not found. Make sure @hyperfixi/core is loaded before registering behaviors.'
    );
  }

  const syntheticNode = {
    type: 'behavior',
    name: 'Toggleable',
    parameters: ['cls', 'target'],
    eventHandlers: [],
    imperativeInstaller: installToggleable,
  };
  const ctx = hf.createContext ? hf.createContext() : { locals: new Map(), globals: new Map() };
  await hf.execute(syntheticNode, ctx);
}

// Auto-register when loaded as a script tag
if (resolveRuntime()) {
  registerToggleable().catch(console.error);
}

export default {
  source: toggleableSchema.source,
  metadata: toggleableSchema,
  register: registerToggleable,
};
