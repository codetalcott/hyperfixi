/**
 * AutoDismiss Behavior — Imperative Implementation
 *
 * Auto-removes elements after a configurable delay.
 * Supports pause-on-hover and fade effect using standard setTimeout/clearTimeout.
 */

import { autoDismissSchema } from '../schemas/autodismiss.schema';
import type { LokaScriptInstance } from '../schemas/types';
import { resolveRuntime } from '../schemas/types';

// Re-export schema-derived values
export const autoDismissSource = autoDismissSchema.source;
export const autoDismissMetadata = autoDismissSchema;

/**
 * Imperative installer for AutoDismiss behavior.
 */
function installAutoDismiss(element: HTMLElement, params: Record<string, any>): void {
  const delay = typeof params.delay === 'number' ? params.delay : 5000;
  const pauseOnHover = params.pauseOnHover !== false;
  const effect = params.effect === 'fade' ? 'fade' : 'none';

  let timerId: ReturnType<typeof setTimeout> | null = null;
  let remaining = delay;
  let startedAt = Date.now();

  function dismiss() {
    const event = new CustomEvent('autodismiss:dismissed', {
      bubbles: true,
      cancelable: true,
    });
    element.dispatchEvent(event);

    if (event.defaultPrevented) return;

    if (effect === 'fade') {
      element.style.transition = 'opacity 300ms';
      element.style.opacity = '0';
      setTimeout(() => element.remove(), 300);
    } else {
      element.remove();
    }
  }

  function start() {
    startedAt = Date.now();
    timerId = setTimeout(dismiss, remaining);
  }

  // Start the countdown
  element.dispatchEvent(new CustomEvent('autodismiss:start', { bubbles: true }));
  start();

  if (pauseOnHover) {
    element.addEventListener('mouseenter', () => {
      if (timerId != null) {
        clearTimeout(timerId);
        timerId = null;
        remaining -= Date.now() - startedAt;
        if (remaining < 0) remaining = 0;
        element.dispatchEvent(new CustomEvent('autodismiss:paused', { bubbles: true }));
      }
    });

    element.addEventListener('mouseleave', () => {
      if (timerId == null && element.isConnected) {
        element.dispatchEvent(new CustomEvent('autodismiss:resumed', { bubbles: true }));
        start();
      }
    });
  }
}

/**
 * Register the AutoDismiss behavior with LokaScript.
 */
export async function registerAutoDismiss(hyperfixi?: LokaScriptInstance): Promise<void> {
  const hf = hyperfixi || resolveRuntime();

  if (!hf) {
    throw new Error(
      'LokaScript not found. Make sure @hyperfixi/core is loaded before registering behaviors.'
    );
  }

  const syntheticNode = {
    type: 'behavior',
    name: 'AutoDismiss',
    parameters: ['delay', 'pauseOnHover', 'effect'],
    eventHandlers: [],
    imperativeInstaller: installAutoDismiss,
  };
  const ctx = hf.createContext ? hf.createContext() : { locals: new Map(), globals: new Map() };
  await hf.execute(syntheticNode, ctx);
}

// Auto-register when loaded as a script tag
if (resolveRuntime()) {
  registerAutoDismiss().catch(console.error);
}

export default {
  source: autoDismissSchema.source,
  metadata: autoDismissSchema,
  register: registerAutoDismiss,
};
