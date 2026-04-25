/**
 * ScrollReveal Behavior — Imperative Implementation
 *
 * Adds a class or fires events when the element enters or exits the viewport.
 * Uses the IntersectionObserver web standard API.
 */

import { scrollRevealSchema } from '../schemas/scrollreveal.schema';
import type { LokaScriptInstance } from '../schemas/types';
import { resolveRuntime } from '../schemas/types';

// Re-export schema-derived values
export const scrollRevealSource = scrollRevealSchema.source;
export const scrollRevealMetadata = scrollRevealSchema;

/**
 * Imperative installer for ScrollReveal behavior.
 */
function installScrollReveal(element: HTMLElement, params: Record<string, any>): void {
  const cls = typeof params.cls === 'string' ? params.cls : 'revealed';
  const threshold = typeof params.threshold === 'number' ? params.threshold : 0.1;
  const once = params.once !== false;
  const rootMargin = typeof params.rootMargin === 'string' ? params.rootMargin : '0px';

  const observer = new IntersectionObserver(
    entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          element.classList.add(cls);
          element.dispatchEvent(new CustomEvent('scrollreveal:enter', { bubbles: true }));
          if (once) {
            observer.disconnect();
          }
        } else if (!once) {
          element.classList.remove(cls);
          element.dispatchEvent(new CustomEvent('scrollreveal:exit', { bubbles: true }));
        }
      }
    },
    { threshold, rootMargin }
  );

  observer.observe(element);
}

/**
 * Register the ScrollReveal behavior with LokaScript.
 */
export async function registerScrollReveal(hyperfixi?: LokaScriptInstance): Promise<void> {
  const hf = hyperfixi || resolveRuntime();

  if (!hf) {
    throw new Error(
      'LokaScript not found. Make sure @hyperfixi/core is loaded before registering behaviors.'
    );
  }

  const syntheticNode = {
    type: 'behavior',
    name: 'ScrollReveal',
    parameters: ['cls', 'threshold', 'once', 'rootMargin'],
    eventHandlers: [],
    imperativeInstaller: installScrollReveal,
  };
  const ctx = hf.createContext ? hf.createContext() : { locals: new Map(), globals: new Map() };
  await hf.execute(syntheticNode, ctx);
}

// Auto-register when loaded as a script tag
if (resolveRuntime()) {
  registerScrollReveal().catch(console.error);
}

export default {
  source: scrollRevealSchema.source,
  metadata: scrollRevealSchema,
  register: registerScrollReveal,
};
