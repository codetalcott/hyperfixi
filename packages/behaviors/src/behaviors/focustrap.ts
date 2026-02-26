/**
 * FocusTrap Behavior — Imperative Implementation
 *
 * Confines Tab navigation inside an element, manages aria-modal,
 * and restores focus on deactivation.
 */

import { focusTrapSchema } from '../schemas/focustrap.schema';
import type { LokaScriptInstance } from '../schemas/types';
import { resolveRuntime } from '../schemas/types';

// Re-export schema-derived values
export const focusTrapSource = focusTrapSchema.source;
export const focusTrapMetadata = focusTrapSchema;

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not(:disabled)',
  'input:not(:disabled)',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Resolve a selector parameter to an HTMLElement within the container.
 */
function resolveElement(container: HTMLElement, param: unknown): HTMLElement | null {
  if (!param) return null;
  if (param instanceof HTMLElement) return param;
  if (typeof param === 'string') {
    return (
      (container.querySelector(param) as HTMLElement) ||
      (document.querySelector(param) as HTMLElement) ||
      null
    );
  }
  return null;
}

/**
 * Imperative installer for FocusTrap behavior.
 */
function installFocusTrap(element: HTMLElement, params: Record<string, any>): void {
  const returnFocus = params.returnFocus !== false;
  let isActive = false;
  let previouslyFocused: Element | null = null;

  function getFocusableElements(): HTMLElement[] {
    return Array.from(element.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  }

  function onKeyDown(e: KeyboardEvent) {
    if (!isActive || e.key !== 'Tab') return;

    const focusable = getFocusableElements();
    if (focusable.length === 0) {
      e.preventDefault();
      return;
    }

    // Always prevent default Tab and manually manage focus.
    // This ensures focus never escapes to elements outside the trap,
    // even when the modal is embedded in a page with other focusable elements.
    e.preventDefault();

    const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);

    if (e.shiftKey) {
      const prevIndex = currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1;
      focusable[prevIndex].focus();
    } else {
      const nextIndex = currentIndex >= focusable.length - 1 ? 0 : currentIndex + 1;
      focusable[nextIndex].focus();
    }
  }

  function activate() {
    if (isActive) return;
    isActive = true;
    previouslyFocused = document.activeElement;

    element.setAttribute('aria-modal', 'true');

    // Focus initialFocus element or first focusable
    const initialEl = resolveElement(element, params.initialFocus);
    if (initialEl) {
      initialEl.focus();
    } else {
      const focusable = getFocusableElements();
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    }

    element.dispatchEvent(new CustomEvent('focustrap:activated', { bubbles: true }));
  }

  function deactivate() {
    if (!isActive) return;
    isActive = false;

    element.removeAttribute('aria-modal');

    if (returnFocus && previouslyFocused instanceof HTMLElement) {
      previouslyFocused.focus();
    }
    previouslyFocused = null;

    element.dispatchEvent(new CustomEvent('focustrap:deactivated', { bubbles: true }));
  }

  // Keydown handler for Tab trapping
  element.addEventListener('keydown', onKeyDown);

  // Programmatic activation/deactivation via custom events
  element.addEventListener('focustrap:activate', () => activate());
  element.addEventListener('focustrap:deactivate', () => deactivate());

  // Activate immediately if requested
  if (params.active !== false) {
    activate();
  }
}

/**
 * Register the FocusTrap behavior with LokaScript.
 */
export async function registerFocusTrap(hyperfixi?: LokaScriptInstance): Promise<void> {
  const hf = hyperfixi || resolveRuntime();

  if (!hf) {
    throw new Error(
      'LokaScript not found. Make sure @hyperfixi/core is loaded before registering behaviors.'
    );
  }

  const syntheticNode = {
    type: 'behavior',
    name: 'FocusTrap',
    parameters: ['active', 'initialFocus', 'returnFocus'],
    eventHandlers: [],
    imperativeInstaller: installFocusTrap,
  };
  const ctx = hf.createContext ? hf.createContext() : { locals: new Map(), globals: new Map() };
  await hf.execute(syntheticNode, ctx);
}

// Auto-register when loaded as a script tag
if (resolveRuntime()) {
  registerFocusTrap().catch(console.error);
}

export default {
  source: focusTrapSchema.source,
  metadata: focusTrapSchema,
  register: registerFocusTrap,
};
