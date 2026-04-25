/**
 * ClickOutside Behavior — Imperative Implementation
 *
 * Fires a clickoutside event when the user clicks outside the element.
 * Uses pointerdown instead of click to avoid timing issues.
 */

import { clickOutsideSchema } from '../schemas/clickoutside.schema';
import type { LokaScriptInstance } from '../schemas/types';
import { resolveRuntime } from '../schemas/types';

// Re-export schema-derived values
export const clickOutsideSource = clickOutsideSchema.source;
export const clickOutsideMetadata = clickOutsideSchema;

/**
 * Imperative installer for ClickOutside behavior.
 */
function installClickOutside(element: HTMLElement, params: Record<string, any>): void {
  let active = params.active !== false;

  function onPointerDown(e: Event) {
    // Auto-cleanup if element has been removed from DOM
    if (!element.isConnected) {
      document.removeEventListener('pointerdown', onPointerDown);
      return;
    }

    if (active && !element.contains(e.target as Node)) {
      element.dispatchEvent(new CustomEvent('clickoutside', { bubbles: true }));
    }
  }

  document.addEventListener('pointerdown', onPointerDown);

  // Programmatic activation/deactivation via custom events
  element.addEventListener('clickoutside:activate', () => {
    active = true;
  });
  element.addEventListener('clickoutside:deactivate', () => {
    active = false;
  });
}

/**
 * Register the ClickOutside behavior with LokaScript.
 */
export async function registerClickOutside(hyperfixi?: LokaScriptInstance): Promise<void> {
  const hf = hyperfixi || resolveRuntime();

  if (!hf) {
    throw new Error(
      'LokaScript not found. Make sure @hyperfixi/core is loaded before registering behaviors.'
    );
  }

  const syntheticNode = {
    type: 'behavior',
    name: 'ClickOutside',
    parameters: ['active'],
    eventHandlers: [],
    imperativeInstaller: installClickOutside,
  };
  const ctx = hf.createContext ? hf.createContext() : { locals: new Map(), globals: new Map() };
  await hf.execute(syntheticNode, ctx);
}

// Auto-register when loaded as a script tag
if (resolveRuntime()) {
  registerClickOutside().catch(console.error);
}

export default {
  source: clickOutsideSchema.source,
  metadata: clickOutsideSchema,
  register: registerClickOutside,
};
